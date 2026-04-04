import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import CourseCard from "@/components/CourseCard";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fetchProgramsForCatalog, type ProgramCardModel } from "@/lib/catalog";

const CoursesPage = () => {
  const [courses, setCourses] = useState<ProgramCardModel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const list = await fetchProgramsForCatalog(userData.user?.id);
    setCourses(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen pb-20 bg-background">
      <AppHeader />
      <div className="px-4 mt-4">
        <h2 className="text-base font-bold text-foreground mb-1">Course catalog</h2>
        <p className="text-xs text-muted-foreground mb-4">Tap a course to open chapters, lectures, and notes.</p>
        {loading && <p className="text-sm text-muted-foreground mb-3">Loading courses…</p>}
        {!loading && !isSupabaseConfigured && (
          <p className="text-sm text-muted-foreground mb-3">Configure Supabase to load the catalog.</p>
        )}
        {!loading && isSupabaseConfigured && courses.length === 0 && (
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No courses yet</p>
            <p className="text-xs text-muted-foreground mt-1">Admins can add programs under Admin → Catalog.</p>
          </div>
        )}
        <div className="space-y-3">
          {!loading &&
            courses.map((c) => (
              <CourseCard
                key={c.id}
                id={c.id}
                title={c.title}
                subtitle={c.subtitle || "Mathematics"}
                students={c.student_count}
                lessons={c.lessonCount}
                progress={c.progressPercent}
                color={c.accent_color || "#1a56db"}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;
