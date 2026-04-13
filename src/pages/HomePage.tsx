import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Megaphone, Pencil, Trash2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import HomeBannerSlider from "@/components/home/HomeBannerSlider";
import HomeHighlightsRail from "@/components/home/HomeHighlightsRail";
import HomeLiveClassesRail from "@/components/home/HomeLiveClassesRail";
import HomeTestimonialsRail from "@/components/home/HomeTestimonialsRail";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import type { NoticeRow } from "@/lib/notices";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const HomePage = () => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Edit states
  const [editingNotice, setEditingNotice] = useState<NoticeRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);

  const loadBoard = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setBoardLoading(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    const uid = userData.user?.id;
    const admin = isSuperAdminEmail(email);
    setIsAdminUser(admin);

    const { data: nRows, error: nErr } = await supabase
      .from("notices")
      .select("id, title, body, audience_type, batch_code, roll_numbers, created_at")
      .order("created_at", { ascending: false })
      .limit(15);
    if (!nErr && nRows) setNotices(nRows as NoticeRow[]);
    else setNotices([]);

    setBoardLoading(false);
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const handleDeleteNotice = async (id: string) => {
    if (!supabase) return;
    const ok = window.confirm("Are you sure you want to delete this notice?");
    if (!ok) return;

    try {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
      setNotices((prev) => prev.filter((n) => n.id !== id));
      toast({ title: "Deleted", description: "Notice removed successfully." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.message || "Could not delete notice.",
      });
    }
  };

  const handleEditClick = (notice: NoticeRow) => {
    setEditingNotice(notice);
    setEditTitle(notice.title);
    setEditBody(notice.body);
  };

  const handleUpdateNotice = async () => {
    if (!supabase || !editingNotice) return;
    if (!editTitle.trim() || !editBody.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Title and body are required." });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("notices")
        .update({
          title: editTitle.trim(),
          body: editBody.trim(),
        })
        .eq("id", editingNotice.id);

      if (error) throw error;

      setNotices((prev) =>
        prev.map((n) =>
          n.id === editingNotice.id ? { ...n, title: editTitle.trim(), body: editBody.trim() } : n,
        ),
      );
      setEditingNotice(null);
      toast({ title: "Updated", description: "Notice updated successfully." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err.message || "Could not update notice.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <AppHeader />
      
      {/* Notice board */}
      <div className="px-4 mt-5 space-y-4">
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background overflow-hidden shadow-sm">
          <div className="bg-primary px-4 py-2.5 flex items-center gap-2">
            <Megaphone size={16} className="text-primary-foreground" />
            <h2 className="text-sm font-bold text-primary-foreground">Notice board</h2>
          </div>
          <div className="p-4 space-y-3">
            {boardLoading && <p className="text-xs text-muted-foreground">Loading notices…</p>}
            {!boardLoading && notices.length === 0 && (
              <p className="text-xs text-muted-foreground">No announcements yet.</p>
            )}
            {!boardLoading &&
              notices.map((n) => (
                <div key={n.id} className="rounded-xl border border-border bg-card/80 p-3 shadow-sm group relative">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      <p className="text-[10px] text-primary font-medium mt-0.5">
                        {n.audience_type === "public"
                          ? "Everyone"
                          : n.audience_type === "batch"
                            ? `Batch: ${n.batch_code ?? ""}`
                            : `Selected rolls`}
                      </p>
                    </div>
                    {isAdminUser && (
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleEditClick(n)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotice(n.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {format(new Date(n.created_at), "dd MMM yyyy, h:mm a")}
                  </p>
                </div>
              ))}
            {isAdminUser && (
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="text-xs font-semibold text-primary w-full text-center py-2 rounded-lg border border-primary/30 hover:bg-primary/5"
              >
                Open Admin → Notices to post
              </button>
            )}
          </div>
        </div>
      </div>

      <HomeHighlightsRail />
      <HomeBannerSlider />

      <HomeLiveClassesRail />
      <HomeTestimonialsRail />
    </div>
  );
};

export default HomePage;
