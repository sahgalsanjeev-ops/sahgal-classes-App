import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSuperAdmin } from "../lib/requireAdmin.js";

const ALLOWED = new Set(["active", "inactive", "blocked"]);

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
  const status = body?.status as string | undefined;

  if (!studentId || typeof studentId !== "string" || !status || !ALLOWED.has(status)) {
    res.status(400).json({ error: "Invalid studentId or status" });
    return;
  }

  const { error } = await admin.from("profiles").update({ 
    account_status: status,
    status: status === "blocked" ? "blocked" : "active"
  }).eq("id", studentId);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(200).json({ ok: true });
}
