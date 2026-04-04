export type NoticeAudience = "public" | "batch" | "rolls";

export type NoticeRow = {
  id: string;
  title: string;
  body: string;
  audience_type: NoticeAudience;
  batch_code: string | null;
  roll_numbers: string[];
  created_at: string;
};
