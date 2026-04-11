import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";

export type ClassSelection = "11th" | "12th" | "12th_pass";
export type FatherOccupationType = "Service" | "Business" | "Other";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string;
  mobile: string;
  roll_no: string | null;
  /** Set by admin; used for targeted notices. */
  batch_code: string | null;
  class_selection: ClassSelection;
  marks_10_maths: string | null;
  marks_12_maths: string | null;
  father_name: string | null;
  father_occupation_type: FatherOccupationType | null;
  father_occupation_details: string | null;
  mother_name: string | null;
  mother_occupation: string | null;
  guardian_name: string | null;
  guardian_mobile: string | null;
  guardian_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pin_code: string | null;
  onboarding_completed: boolean;
  /** Admin-set: active | inactive | blocked (see supabase/student_account_status.sql). */
  account_status?: "active" | "inactive" | "blocked" | null;
  created_at?: string;
  updated_at?: string;
};

export async function fetchProfile(userId: string | undefined): Promise<ProfileRow | null> {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.warn("fetchProfile", error.message);
    return null;
  }
  return data as ProfileRow | null;
}

export async function getPostLoginPath(userId: string | undefined, email: string | null | undefined): Promise<string> {
  if (isSuperAdminEmail(email)) return "/admin";
  const profile = await fetchProfile(userId);
  // Condition: if Name or Class is missing, go to quick onboarding
  if (!profile?.full_name || !profile?.class_selection) return "/onboarding";
  /** Student app home (dashboard). Registration details stay under Profile → My registration. */
  return "/";
}
