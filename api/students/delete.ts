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
  const studentId = body?.studentId as string | undefined;

  if (!studentId || typeof studentId !== "string") {
    res.status(400).json({ error: "Invalid studentId" });
    return;
  }

  const { error } = await admin.auth.admin.deleteUser(studentId);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(200).json({ ok: true });
}
