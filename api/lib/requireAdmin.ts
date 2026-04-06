import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isSuperAdminEmail } from "./superAdmins.js";

export async function requireSuperAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<SupabaseClient | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    res.status(500).json({ error: "Server misconfigured: missing Supabase URL or service role key." });
    return null;
  }

  const raw = req.headers.authorization;
  const token = raw?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user?.email || !isSuperAdminEmail(user.email)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return admin;
}
