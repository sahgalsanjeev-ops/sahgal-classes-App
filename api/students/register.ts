import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSuperAdmin } from "../lib/requireAdmin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body as string) : req.body;
  const { fullName, email, mobile, classSelection, batchId } = body;

  if (!fullName || !email || !mobile || !classSelection) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    // 1. Check if profile already exists
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      res.status(400).json({ error: "Student already registered!" });
      return;
    }

    // 2. Create user in auth.users
    // We generate a random password since the user will login via Magic Link or Reset Password
    const tempPassword = Math.random().toString(36).slice(-12) + "A1!";
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // 3. Update the profile (it might have been created by a trigger, or we insert it)
    // We use upsert to be safe
    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      email: email.toLowerCase(),
      full_name: fullName.trim(),
      mobile: mobile.trim(),
      class_selection: classSelection,
      onboarding_completed: true,
    });

    if (profileError) throw profileError;

    // 4. Batch auto-assignment if provided
    if (batchId && batchId !== "none") {
      const { error: enrollError } = await admin.from("batch_enrollments").upsert({
        batch_id: batchId,
        student_email: email.toLowerCase()
      }, { onConflict: "batch_id,student_email" });

      if (enrollError) console.error("Enrollment error in registration:", enrollError);
    }

    res.status(200).json({ ok: true, userId });
  } catch (error: any) {
    console.error("Registration API error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
