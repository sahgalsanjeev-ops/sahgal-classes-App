import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Megaphone, NotebookPen } from "lucide-react";
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

const HomePage = () => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [pendingHw, setPendingHw] = useState<HomeworkRow[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);

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
                <div key={n.id} className="rounded-xl border border-border bg-card/80 p-3 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  <p className="text-[10px] text-primary font-medium mt-0.5">
                    {n.audience_type === "public"
                      ? "Everyone"
                      : n.audience_type === "batch"
                        ? `Batch: ${n.batch_code ?? ""}`
                        : `Selected rolls`}
                  </p>
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
