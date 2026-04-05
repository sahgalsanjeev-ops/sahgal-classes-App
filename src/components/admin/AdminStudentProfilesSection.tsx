import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/profiles";
import { postDeleteStudent, postUpdateStudentStatus, type StudentAccountStatus } from "@/lib/studentAdminApi";
import { cn } from "@/lib/utils";

const statusLabel = (s: ProfileRow["account_status"]) => {
  const v = s ?? "active";
  if (v === "blocked") return "Blocked";
  if (v === "inactive") return "Inactive";
  return "Active";
};

const actionBtnClass =
  "rounded-md px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none";

const AdminStudentProfilesSection = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [rollDraft, setRollDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Could not load profiles", description: error.message });
      setRows([]);
    } else {
      setRows((data ?? []) as ProfileRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const getAccessToken = async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const startEdit = (r: ProfileRow) => {
    setEditId(r.id);
    setRollDraft(r.roll_no ?? "");
  };

  const saveRoll = async (id: string) => {
    if (!supabase) return;
    setSavingId(id);
    try {
      const { error } = await supabase.from("profiles").update({ roll_no: rollDraft.trim() || null }).eq("id", id);
      if (error) throw new Error(error.message);
      toast({ title: "Saved", description: "Roll number updated." });
      setEditId(null);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ variant: "destructive", title: "Update failed", description: msg });
    } finally {
      setSavingId(null);
    }
  };

  const handleStatus = async (studentId: string, status: StudentAccountStatus) => {
    const token = await getAccessToken();
    if (!token) {
      toast({ variant: "destructive", title: "Not signed in", description: "Please sign in again." });
      return;
    }
    setActionId(studentId);
    try {
      await postUpdateStudentStatus(token, studentId, status);
      toast({ title: "Status updated", description: `Student is now ${status}.` });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast({ variant: "destructive", title: "Could not update status", description: msg });
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (r: ProfileRow) => {
    const ok = window.confirm(
      `Remove student "${r.full_name}" permanently? Their login and profile will be deleted. This cannot be undone.`,
    );
    if (!ok) return;

    const token = await getAccessToken();
    if (!token) {
      toast({ variant: "destructive", title: "Not signed in", description: "Please sign in again." });
      return;
    }
    setActionId(r.id);
    try {
      await postDeleteStudent(token, r.id);
      toast({ title: "Student removed", description: `${r.full_name} was deleted.` });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Remove failed";
      toast({ variant: "destructive", title: "Could not remove student", description: msg });
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading registrations…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tap a name for full profile. Actions call secured APIs; add <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
        on Vercel and run <code className="rounded bg-muted px-1">supabase/student_account_status.sql</code> once.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No profiles yet. Students appear after they submit registration.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[7rem] pl-3">Student</TableHead>
                <TableHead className="min-w-[8rem] hidden sm:table-cell">Email</TableHead>
                <TableHead className="w-[5.5rem] hidden md:table-cell">Class</TableHead>
                <TableHead className="w-[7rem]">Roll</TableHead>
                <TableHead className="w-[5.5rem]">Status</TableHead>
                <TableHead className="min-w-[11rem] pr-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const busy = actionId === r.id;
                const current = (r.account_status ?? "active") as StudentAccountStatus | "active";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="pl-3 py-2 align-top">
                      <button
                        type="button"
                        className="text-sm font-semibold text-primary text-left hover:underline line-clamp-2"
                        onClick={() => navigate(`/admin/student/${r.id}`)}
                      >
                        {r.full_name}
                      </button>
                      <p className="text-[11px] text-muted-foreground truncate sm:hidden mt-0.5">{r.email ?? r.id}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 sm:hidden">
                        {r.class_selection.replace("_", " ")}
                        {r.onboarding_completed ? "" : " · Incomplete"}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2 align-top text-xs text-muted-foreground max-w-[10rem] truncate">
                      {r.email ?? "—"}
                    </TableCell>
                    <TableCell className="py-2 align-top text-xs capitalize hidden md:table-cell">
                      {r.class_selection.replace("_", " ")}
                      {!r.onboarding_completed && <span className="block text-amber-600">Incomplete</span>}
                    </TableCell>
                    <TableCell className="py-2 align-top">
                      {editId === r.id ? (
                        <div className="flex flex-col gap-1 min-w-[6rem]">
                          <Input
                            value={rollDraft}
                            onChange={(e) => setRollDraft(e.target.value)}
                            placeholder="Roll"
                            className="h-8 font-mono text-xs"
                          />
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={savingId === r.id}
                              onClick={() => void saveRoll(r.id)}
                            >
                              <Save size={12} /> Save
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-semibold">{r.roll_no ?? "—"}</span>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => startEdit(r)}>
                            <Pencil size={14} />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 align-top text-xs font-medium">{statusLabel(r.account_status)}</TableCell>
                    <TableCell className="py-2 pr-3 align-top">
                      <div className="flex flex-wrap gap-1 max-w-[14rem]">
                        <button
                          type="button"
                          disabled={busy || current === "active"}
                          className={cn(actionBtnClass, "bg-green-500 hover:bg-green-600")}
                          onClick={() => void handleStatus(r.id, "active")}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          disabled={busy || current === "inactive"}
                          className={cn(actionBtnClass, "bg-gray-500 hover:bg-gray-600")}
                          onClick={() => void handleStatus(r.id, "inactive")}
                        >
                          Inactive
                        </button>
                        <button
                          type="button"
                          disabled={busy || current === "blocked"}
                          className={cn(actionBtnClass, "bg-orange-500 hover:bg-orange-600")}
                          onClick={() => void handleStatus(r.id, "blocked")}
                        >
                          Block
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(actionBtnClass, "bg-red-500 hover:bg-red-600")}
                          onClick={() => void handleRemove(r)}
                        >
                          Remove
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminStudentProfilesSection;
