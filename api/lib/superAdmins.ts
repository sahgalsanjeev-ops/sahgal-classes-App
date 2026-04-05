/** Keep in sync with src/lib/adminAccess.ts */
const SUPER_ADMIN_EMAILS = ["sahgal.sanjeev@gmail.com", "sahgalclasses@gmail.com"] as const;

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((a) => a === e);
}
