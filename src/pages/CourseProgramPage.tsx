import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { CourseChapterRow, CourseProgramRow } from "@/lib/catalog";

const CourseProgramPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<CourseProgramRow | null>(null);
  const [chapters, setChapters] = useState<CourseChapterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!courseId || !isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }
      const { data: p } = await supabase
        .from("course_programs")
        .select("id, title, subtitle, accent_color, student_count, sort_order")
        .eq("id", courseId)
        .maybeSingle();
      if (!p) {
        setProgram(null);
        setChapters([]);
        setLoading(false);
        return;
      }
      setProgram(p as CourseProgramRow);
      const { data: ch } = await supabase
        .from("course_chapters")
        .select("id, course_program_id, title, sort_order")
        .eq("course_program_id", courseId)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      setChapters((ch ?? []) as CourseChapterRow[]);
      setLoading(false);
    };
    void run();
  }, [courseId]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  if (!program) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-8">
        <p className="text-sm text-muted-foreground">Course not found.</p>
        <button type="button" className="text-primary text-sm font-semibold mt-2" onClick={() => navigate("/courses")}>
          Back to catalog
        </button>
      </div>
    );
  }

  const accent = program.accent_color || "#1a56db";

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/courses")} className="w-9 h-9 flex items-center justify-center">
          <ArrowLeft size={22} className="text-primary-foreground" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-primary-foreground truncate">{program.title}</h1>
          <p className="text-[11px] text-primary-foreground/80 truncate">{program.subtitle}</p>
        </div>
      </div>

      <div className="px-4 mt-4">
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Layers size={16} className="text-primary" />
          Chapters &amp; topics
        </h2>
        {chapters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chapters yet. Check back soon.</p>
        ) : (
          <div className="space-y-2">
            {chapters.map((ch, i) => (
              <motion.button
                key={ch.id}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/courses/${courseId}/chapter/${ch.id}`)}
                className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary/30"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${accent}18` }}
                >
                  <Layers size={18} style={{ color: accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{ch.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Lectures, notes &amp; homework</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseProgramPage;
