import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText, NotebookPen, Play } from "lucide-react";
import { motion } from "framer-motion";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getYouTubeVideoId } from "@/lib/youtube";
import type { CourseChapterRow, CourseLectureRow, CourseProgramRow } from "@/lib/catalog";
import { markLectureComplete, writeContinueLearning } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const CourseChapterPage = () => {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<CourseProgramRow | null>(null);
  const [chapter, setChapter] = useState<CourseChapterRow | null>(null);
  const [lectures, setLectures] = useState<CourseLectureRow[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!courseId || !chapterId || !isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);

    const { data: p } = await supabase
      .from("course_programs")
      .select("id, title, subtitle, accent_color, student_count, sort_order")
      .eq("id", courseId)
      .maybeSingle();
    const { data: ch } = await supabase
      .from("course_chapters")
      .select("id, course_program_id, title, sort_order")
      .eq("id", chapterId)
      .maybeSingle();

    if (!ch || ch.course_program_id !== courseId || !p) {
      setProgram(null);
      setChapter(null);
      setLectures([]);
      setLoading(false);
      return;
    }

    setProgram(p as CourseProgramRow);
    setChapter(ch as CourseChapterRow);

    const { data: lec } = await supabase
      .from("course_lectures")
      .select("id, chapter_id, title, video_url, pdf_url, sort_order, homework_id")
      .eq("chapter_id", chapterId)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    setLectures((lec ?? []) as CourseLectureRow[]);

    if (uid) {
      const ids = (lec ?? []).map((l) => (l as CourseLectureRow).id);
      if (ids.length) {
        const { data: comp } = await supabase.from("lecture_completions").select("lecture_id").eq("user_id", uid).in("lecture_id", ids);
        setCompleted(new Set((comp ?? []).map((r) => (r as { lecture_id: string }).lecture_id)));
      } else setCompleted(new Set());
    }
    setLoading(false);
  }, [courseId, chapterId]);

  useEffect(() => {
    void load();
  }, [load]);

  const accent = program?.accent_color ?? "#1a56db";

  const openVideo = (lec: CourseLectureRow) => {
    if (!program || !chapter) return;
    const vid = getYouTubeVideoId(lec.video_url);
    if (!vid) {
      toast({ variant: "destructive", title: "No video", description: "This lecture has no valid YouTube URL yet." });
      return;
    }
    writeContinueLearning({
      courseId: program.id,
      courseTitle: program.title,
      chapterId: chapter.id,
      lectureId: lec.id,
      lectureTitle: lec.title,
    });
    navigate(`/video/${vid}?title=${encodeURIComponent(lec.title)}`);
  };

  const openPdf = (lec: CourseLectureRow) => {
    if (!program || !chapter || !lec.pdf_url) {
      toast({ variant: "destructive", title: "No PDF", description: "Notes are not uploaded for this lecture." });
      return;
    }
    writeContinueLearning({
      courseId: program.id,
      courseTitle: program.title,
      chapterId: chapter.id,
      lectureId: lec.id,
      lectureTitle: lec.title,
    });
    navigate(`/notes?title=${encodeURIComponent(lec.title)}&pdf=${encodeURIComponent(lec.pdf_url)}`);
  };

  const onMarkDone = async (lecId: string) => {
    if (!userId) return;
    const { error } = await markLectureComplete(userId, lecId);
    if (error) {
      toast({ variant: "destructive", title: "Could not save", description: error });
      return;
    }
    setCompleted((prev) => new Set([...prev, lecId]));
    toast({ title: "Marked complete" });
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  if (!program || !chapter) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-8">
        <p className="text-sm text-muted-foreground">Chapter not found.</p>
        <button type="button" className="text-primary text-sm font-semibold mt-2" onClick={() => navigate("/courses")}>
          Back to catalog
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(`/courses/${courseId}`)} className="w-9 h-9 flex items-center justify-center">
          <ArrowLeft size={22} className="text-primary-foreground" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] text-primary-foreground/80 truncate">{program.title}</p>
          <h1 className="text-base font-bold text-primary-foreground truncate">{chapter.title}</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <p className="text-xs text-muted-foreground">Videos, PDF notes, homework links, and mark lectures complete.</p>
        {lectures.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lectures in this chapter yet.</p>
        ) : (
          lectures.map((lec, i) => {
            const done = completed.has(lec.id);
            const hasVideo = Boolean(getYouTubeVideoId(lec.video_url));
            return (
              <motion.div
                key={lec.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "rounded-xl border bg-card p-4 shadow-sm space-y-3",
                  done ? "border-emerald-200 dark:border-emerald-900" : "border-border",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{lec.title}</p>
                    {done && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                        <CheckCircle2 size={12} /> Completed
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1 bg-primary"
                    disabled={!hasVideo}
                    onClick={() => openVideo(lec)}
                  >
                    <Play size={14} /> Video
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="gap-1" disabled={!lec.pdf_url} onClick={() => openPdf(lec)}>
                    <FileText size={14} /> PDF
                  </Button>
                  {lec.homework_id ? (
                    <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => navigate("/homework")}>
                      <NotebookPen size={14} /> HW
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant={done ? "outline" : "secondary"}
                    disabled={done || !userId}
                    onClick={() => void onMarkDone(lec.id)}
                  >
                    {done ? "Done" : "Mark complete"}
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CourseChapterPage;
