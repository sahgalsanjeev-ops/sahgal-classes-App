import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const HOMEWORK_BUCKET = "homework-submissions";

export type HomeworkRow = {
  id: string;
  title: string;
  description: string | null;
  assigned_date: string;
  deadline: string;
  created_at: string;
};

export type HomeworkSubmissionRow = {
  id: string;
  homework_id: string;
  student_id: string;
  file_path: string;
  submitted_at: string;
};

export function isDeadlinePassed(deadlineIso: string): boolean {
  return new Date(deadlineIso).getTime() < Date.now();
}

export async function getSignedHomeworkFileUrl(filePath: string, expiresSec = 3600): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.storage
    .from(HOMEWORK_BUCKET)
    .createSignedUrl(filePath, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
