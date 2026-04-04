import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type CourseProgramRow = {
  id: string;
  title: string;
  subtitle: string;
  accent_color: string;
  student_count: number;
  sort_order: number;
};

export type CourseChapterRow = {
  id: string;
  course_program_id: string;
  title: string;
  sort_order: number;
};

export type CourseLectureRow = {
  id: string;
  chapter_id: string;
  title: string;
  video_url: string;
  pdf_url: string | null;
  sort_order: number;
  homework_id?: string | null;
};

export type ProgramCardModel = CourseProgramRow & {
  lessonCount: number;
  progressPercent: number;
};

const CONTINUE_KEY = "sahgal_continue_learning";

export type ContinueLearningPayload = {
  courseId: string;
  courseTitle: string;
  chapterId: string;
  lectureId: string;
  lectureTitle: string;
};

export function readContinueLearning(): ContinueLearningPayload | null {
  try {
    const raw = localStorage.getItem(CONTINUE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as ContinueLearningPayload;
    if (!v?.courseId || !v?.lectureId) return null;
    return v;
  } catch {
    return null;
  }
}

export function writeContinueLearning(p: ContinueLearningPayload) {
  localStorage.setItem(CONTINUE_KEY, JSON.stringify(p));
}

/** Lecture rows with parent program id for counting & progress. */
export async function fetchLecturesWithProgramIds(): Promise<{ id: string; course_program_id: string }[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: chapters } = await supabase.from("course_chapters").select("id, course_program_id");
  if (!chapters?.length) return [];
  const chToP = Object.fromEntries(
    (chapters as { id: string; course_program_id: string }[]).map((c) => [c.id, c.course_program_id]),
  );
  const { data: lects } = await supabase.from("course_lectures").select("id, chapter_id");
  if (!lects?.length) return [];
  return (lects as { id: string; chapter_id: string }[])
    .map((l) => ({ id: l.id, course_program_id: chToP[l.chapter_id] }))
    .filter((x) => Boolean(x.course_program_id));
}

export async function fetchCompletedLectureIds(userId: string | undefined): Promise<Set<string>> {
  if (!isSupabaseConfigured || !supabase || !userId) return new Set();
  const { data } = await supabase.from("lecture_completions").select("lecture_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => (r as { lecture_id: string }).lecture_id));
}

export async function fetchProgramsForCatalog(userId: string | undefined): Promise<ProgramCardModel[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: programs, error } = await supabase
    .from("course_programs")
    .select("id, title, subtitle, accent_color, student_count, sort_order")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  if (error || !programs) return [];

  const lectLinks = await fetchLecturesWithProgramIds();
  const completed = await fetchCompletedLectureIds(userId);
  const totalByProgram: Record<string, number> = {};
  const doneByProgram: Record<string, number> = {};
  for (const L of lectLinks) {
    totalByProgram[L.course_program_id] = (totalByProgram[L.course_program_id] ?? 0) + 1;
    if (completed.has(L.id)) {
      doneByProgram[L.course_program_id] = (doneByProgram[L.course_program_id] ?? 0) + 1;
    }
  }

  return (programs as CourseProgramRow[]).map((p) => {
    const total = totalByProgram[p.id] ?? 0;
    const done = doneByProgram[p.id] ?? 0;
    const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      ...p,
      lessonCount: total,
      progressPercent,
    };
  });
}

export async function markLectureComplete(userId: string, lectureId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "No client" };
  const { error } = await supabase.from("lecture_completions").upsert(
    { user_id: userId, lecture_id: lectureId },
    { onConflict: "user_id,lecture_id" },
  );
  if (error) return { error: error.message };
  return {};
}
