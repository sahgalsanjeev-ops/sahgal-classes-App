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
        Tap a name for full profile. Actions call secured APIs; add <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> on Vercel.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No profiles yet.</p>
      ) : (
<div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <Table>
          <TableHeader>
  <TableRow>
    <TableHead className="min-w-[7rem] pl-3">Student</TableHead>
    <TableHead className="min-w-[8rem] hidden lg:table-cell">Email</TableHead>
    <TableHead className="w-[5.5rem] hidden xl:table-cell">Class</TableHead>
    <TableHead className="w-[7rem]">Roll</TableHead>
    {/* Status aur Actions ko hamesha dikhane ke liye hidden hata diya */}
    <TableHead className="w-[6rem] text-center">Status</TableHead>
    <TableHead className="min-w-[10rem] pr-3 text-right">Actions</TableHead>
  </TableRow>
</TableHeader>
            <TableBody>
              {rows.map((r) => {
                const busy = actionId === r.id;
                const current = (r.account_status ?? "active") as StudentAccountStatus | "active";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="pl-3 py-2 align-top text-sm font-semibold text-primary">
                      {r.full_name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2 align-top text-xs text-muted-foreground truncate">
                      {r.email ?? "—"}
                    </TableCell>
                    <TableCell className="py-2 align-top text-xs capitalize hidden md:table-cell">
                      {r.class_selection.replace("_", " ")}
                    </TableCell>
                    <TableCell className="py-2 align-top">
                      {editId === r.id ? (
                        <div className="flex flex-col gap-1 min-w-[6rem]">
                          <Input value={rollDraft} onChange={(e) => setRollDraft(e.target.value)} className="h-8 text-xs" />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 text-xs" onClick={() => void saveRoll(r.id)} disabled={savingId === r.id}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}>X</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{r.roll_no ?? "—"}</span>
                          <Button variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(r)}><Pencil size={12}/></Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 align-top text-xs font-medium">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px]", current === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {statusLabel(r.account_status)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 pr-3 align-top">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(actionBtnClass, current === "active" ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700")}
                          onClick={() => void handleStatus(r.id, current === "active" ? "blocked" : "active")}
                        >
                          {current === "active" ? "Block" : "Unblock"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(actionBtnClass, "bg-red-600 hover:bg-red-700")}
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