export type StudentAccountStatus = "active" | "inactive" | "blocked";

async function parseJson(res: Response): Promise<{ error?: string }> {
  try {
    return (await res.json()) as { error?: string };
  } catch {
    return {};
  }
}

export async function postUpdateStudentStatus(
  accessToken: string,
  studentId: string,
  status: StudentAccountStatus
): Promise<void> {
  const res = await fetch("/api/students/update-status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ studentId, status }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
}

export async function postDeleteStudent(accessToken: string, studentId: string): Promise<void> {
  const res = await fetch("/api/students/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ studentId }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
}
