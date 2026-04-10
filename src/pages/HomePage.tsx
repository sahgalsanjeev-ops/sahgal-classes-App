import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Megaphone, NotebookPen, Pencil, Trash2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import HomeBannerSlider from "@/components/home/HomeBannerSlider";
import ContinueLearningCard from "@/components/home/ContinueLearningCard";
import HomeLiveClassesRail from "@/components/home/HomeLiveClassesRail";
import HomeTestimonialsRail from "@/components/home/HomeTestimonialsRail";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import type { HomeworkRow } from "@/lib/homework";
import { isDeadlinePassed } from "@/lib/homework";
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
  const [pendingHw, setPendingHw] = useState<HomeworkRow[]>([]);
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

    if (uid && !admin) {
      const { data: hwRows } = await supabase
        .from("homework")
        .select("id, title, description, assigned_date, deadline, created_at")
        .order("deadline", { ascending: true });
      const { data: subRows } = await supabase
        .from("homework_submissions")
        .select("homework_id")
        .eq("student_id", uid);
      const done = new Set((subRows ?? []).map((s) => (s as { homework_id: string }).homework_id));
      const open = ((hwRows ?? []) as HomeworkRow[]).filter((h) => !done.has(h.id));
      setPendingHw(open);
    } else {
      setPendingHw([]);
    }
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
      <HomeBannerSlider />
      <ContinueLearningCard />

      {/* Notice board + pending homework */}
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

        {/* Edit Dialog */}
        <Dialog open={!!editingNotice} onOpenChange={(open) => !open && setEditingNotice(null)}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit Notice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Notice title"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Message</label>
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Type your message here..."
                  className="min-h-[120px]"
                />
              </div>
            </div>
            <DialogFooter className="flex-row gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setEditingNotice(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={handleUpdateNotice}
                disabled={saving}
              >
                {saving ? "Saving..." : "Update Notice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {!isAdminUser && (
          <div className="rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <NotebookPen size={16} className="text-primary" />
                <h2 className="text-sm font-bold text-foreground">Pending homework</h2>
              </div>
              <button type="button" onClick={() => navigate("/homework")} className="text-xs font-semibold text-primary">
                HW
              </button>
            </div>
            {boardLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
            {!boardLoading && pendingHw.length === 0 && (
              <p className="text-xs text-muted-foreground">You&apos;re all caught up — or nothing assigned yet.</p>
            )}
            {!boardLoading && pendingHw.length > 0 && (
              <ul className="space-y-2">
                {pendingHw.slice(0, 8).map((h) => {
                  const late = isDeadlinePassed(h.deadline);
                  return (
                    <li
                      key={h.id}
                      className={cn(
                        "flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
                        late ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30",
                      )}
                    >
                      <span className="font-medium text-foreground min-w-0">{h.title}</span>
                      <span
                        className={cn(
                          "shrink-0 font-mono tabular-nums",
                          late ? "text-destructive font-semibold" : "text-muted-foreground",
                        )}
                      >
                        {format(new Date(h.deadline), "dd MMM, h:mm a")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <HomeLiveClassesRail />
      <HomeTestimonialsRail />
    </div>
  );
};

export default HomePage;
