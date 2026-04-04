import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Clock, Upload } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import { HOMEWORK_BUCKET, type HomeworkRow, type HomeworkSubmissionRow, isDeadlinePassed } from "@/lib/homework";

const HomeworkPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<HomeworkRow[]>([]);
  const [subsByHw, setSubsByHw] = useState<Record<string, HomeworkSubmissionRow>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    setIsAdmin(isSuperAdminEmail(email));
    const uid = userData.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }

    const { data: hw, error: hwErr } = await supabase
      .from("homework")
      .select("id, title, description, assigned_date, deadline, created_at")
      .order("deadline", { ascending: true });

    if (hwErr) {
      console.error(hwErr);
      toast({
        variant: "destructive",
        title: "Could not load homework",
        description: hwErr.message,
      });
      setItems([]);
    } else {
      setItems((hw ?? []) as HomeworkRow[]);
    }

    const { data: subRows } = await supabase
      .from("homework_submissions")
      .select("id, homework_id, student_id, file_path, submitted_at")
      .eq("student_id", uid);

    const map: Record<string, HomeworkSubmissionRow> = {};
    for (const s of subRows ?? []) {
      map[(s as HomeworkSubmissionRow).homework_id] = s as HomeworkSubmissionRow;
    }
    setSubsByHw(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFile = async (hw: HomeworkRow, file: File | null) => {
    if (!file || !supabase) return;
    if (isDeadlinePassed(hw.deadline)) {
      toast({ variant: "destructive", title: "Deadline passed", description: "Submissions are closed for this task." });
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${uid}/${hw.id}/${Date.now()}-${safe}`;
    setUploadingId(hw.id);

    try {
      const { error: upErr } = await supabase.storage.from(HOMEWORK_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw new Error(upErr.message);

      const { error: insErr } = await supabase.from("homework_submissions").insert({
        homework_id: hw.id,
        student_id: uid,
        file_path: path,
      });
      if (insErr) {
        await supabase.storage.from(HOMEWORK_BUCKET).remove([path]);
        throw new Error(insErr.message);
      }

      toast({ title: "Submitted", description: "Your file was uploaded." });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ variant: "destructive", title: "Upload failed", description: msg });
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <AppHeader />
      <div className="px-4 mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-card"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Homework</h1>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {isAdmin && (
          <p className="text-xs text-muted-foreground rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
            You are signed in as admin. Post new tasks from <span className="font-semibold text-primary">Admin → Homework</span>.
          </p>
        )}
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && !isSupabaseConfigured && (
          <p className="text-sm text-muted-foreground">Configure Supabase to load homework.</p>
        )}
        {!loading && isSupabaseConfigured && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No homework posted yet.
          </div>
        )}
        {!loading &&
          items.map((hw) => {
            const sub = subsByHw[hw.id];
            const passed = isDeadlinePassed(hw.deadline);
            const submitted = Boolean(sub);
            return (
              <div key={hw.id} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-foreground leading-snug">{hw.title}</h2>
                    {hw.description ? (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{hw.description}</p>
                    ) : null}
                  </div>
                  {submitted ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={12} /> Submitted
                    </span>
                  ) : passed ? (
                    <span className="shrink-0 text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                      Closed
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-semibold text-amber-800 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} className="text-primary" />
                    Assigned {format(new Date(hw.assigned_date + "T12:00:00"), "dd MMM yyyy")}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    Due {format(new Date(hw.deadline), "dd MMM yyyy, h:mm a")}
                  </span>
                </div>
                {submitted && sub && (
                  <p className="text-[11px] text-muted-foreground">
                    Submitted {format(new Date(sub.submitted_at), "dd MMM yyyy, h:mm a")}
                  </p>
                )}
                {!isAdmin && !submitted && !passed && (
                  <div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      id={`hw-file-${hw.id}`}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void handleFile(hw, f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="default"
                      className="w-full gap-2 bg-primary"
                      disabled={uploadingId === hw.id}
                      onClick={() => document.getElementById(`hw-file-${hw.id}`)?.click()}
                    >
                      <Upload size={16} />
                      {uploadingId === hw.id ? "Uploading…" : "Upload (image or PDF)"}
                    </Button>
                  </div>
                )}
                {!isAdmin && !submitted && passed && (
                  <p className="text-xs text-muted-foreground">The deadline has passed — upload is disabled.</p>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default HomeworkPage;
