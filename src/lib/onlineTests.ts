/**
 * online_tests table (expected Supabase columns):
 * - id: uuid (default gen_random_uuid())
 * - test_title: text
 * - duration_minutes: int
 * - questions: jsonb — array of McqQuestionJson
 * - batch_code: text (optional) — matches Batch.batchCode for My Batch listing
 * - created_at: timestamptz (optional)
 */
export type McqQuestionJson = {
  id: string;
  /** Optional; use `$...$` for inline KaTeX and `$$...$$` for display math */
  text: string;
  /** Public URL after upload (Supabase storage) */
  image_url?: string | null;
  options: [string, string, string, string];
  correct_index: number;
};

export type OnlineTestRow = {
  id: string;
  test_title: string;
  duration_minutes: number;
  questions: McqQuestionJson[];
  /** When set, test is listed under My Batch for this code; omitted from global Tests when non-empty. */
  batch_code?: string | null;
  created_at?: string;
};

/** Tests with no batch assignment appear on the global /tests page. */
export function isGlobalOnlineTest(row: Pick<OnlineTestRow, "batch_code">): boolean {
  return !row.batch_code?.trim();
}

/** Shape used by TestAttemptPage / TestResultPage (uses `correct` as index) */
export type QuestionForAttempt = {
  id: string;
  text: string;
  image_url?: string | null;
  options: string[];
  correct: number;
};

export function rowToAttemptQuestions(row: OnlineTestRow): QuestionForAttempt[] {
  return row.questions.map((q) => ({
    id: q.id,
    text: q.text ?? "",
    image_url: q.image_url ?? null,
    options: [...q.options],
    correct: q.correct_index,
  }));
}

/** Strip correct answers before rendering questions to students (network still carries full row — use RLS/policies in production). */
export function stripCorrectForStudentView(qs: QuestionForAttempt[]): Omit<QuestionForAttempt, "correct">[] {
  return qs.map(({ id, text, options }) => ({ id, text, options }));
}

export function scoreAnswers(
  questions: QuestionForAttempt[],
  answers: Record<string, number | undefined>,
): { score: number; total: number } {
  let score = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correct) score += 1;
  }
  return { score, total: questions.length };
}
