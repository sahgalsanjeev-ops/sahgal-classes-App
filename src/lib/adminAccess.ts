/** Super-admins: full /admin access and student profile management in Supabase. */
const SUPER_ADMIN_EMAILS = ["sahgal.sanjeev@gmail.com", "sahgalclasses@gmail.com"] as const;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  const e = normalizeEmail(email);
  return SUPER_ADMIN_EMAILS.some((a) => a === e);
}

/** For SQL RLS / triggers (lowercase). */
export const SUPER_ADMIN_EMAILS_SQL = SUPER_ADMIN_EMAILS as unknown as string[];
