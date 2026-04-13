import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Save, UserPlus, Loader2, Sparkles, User, Mail, Phone, GraduationCap, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ProfileRow, ClassSelection } from "@/lib/profiles";
import { postDeleteStudent, postUpdateStudentStatus, type StudentAccountStatus } from "@/lib/studentAdminApi";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { enrollStudentInBatch } from "@/lib/batches";

const statusLabel = (s: ProfileRow["account_status"]) => {
  const v = s ?? "active";
  if (v === "blocked") return "Blocked";
  if (v === "inactive") return "Inactive";
  return "Active";
};

const actionBtnClass =
  "rounded-md px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none";

const AdminStudentProfilesSection = ({ refreshBatches }: { refreshBatches?: () => void }) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [batches, setBatches] = useState<{ id: string; batch_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [rollDraft, setRollDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  // New Student Registration State
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regForm, setRegForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    classSelection: "11th" as ClassSelection,
    batchId: "none",
  });

  const load = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Could not load profiles", description: error.message });
      setRows([]);
    } else {
      setRows((data ?? []) as ProfileRow[]);
    }

    // Load batches for dropdown
    const { data: batchData } = await supabase.from("batches").select("id, batch_name").order("batch_name");
    setBatches(batchData || []);

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (!regForm.fullName.trim() || !regForm.email.trim() || !regForm.mobile.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Name, Email and Mobile are required." });
      return;
    }

    setRegLoading(true);
    try {
      const email = regForm.email.trim().toLowerCase();

      // 1. Conflict Check: Check if student already exists
      const { data: existing, error: checkError } = await supabase
        .from("profiles")
        .select("id, status")
        .eq("email", email)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (existing.status === "archived") {
          // Reactivate if archived
          const { error: reactivateError } = await supabase
            .from("profiles")
            .update({ 
              status: "active", 
              account_status: "active",
              full_name: regForm.fullName.trim(),
              mobile: regForm.mobile.trim(),
              class_selection: regForm.classSelection
            })
            .eq("id", existing.id);
          
          if (reactivateError) throw reactivateError;
        } else {
          throw new Error("Student with this email already exists and is active!");
        }
      } else {
        // 2. Direct Supabase Insert
        const { error: regError } = await supabase.from("profiles").insert({
          email: email,
          full_name: regForm.fullName.trim(),
          mobile: regForm.mobile.trim(),
          class_selection: regForm.classSelection,
          onboarding_completed: true,
          status: "active",
          account_status: "active"
        });

        if (regError) throw regError;
      }

      // 3. Batch auto-assignment if provided
      let assignedToBatch = false;
      if (regForm.batchId !== "none") {
        await enrollStudentInBatch(regForm.batchId, email);
        assignedToBatch = true;
      }

      const successMsg = assignedToBatch 
        ? "Student Registered and Assigned to Batch Successfully!" 
        : `${regForm.fullName} registered successfully.`;

      toast({ title: "Success! 🚀", description: successMsg });
      setIsRegModalOpen(false);
      setRegForm({ fullName: "", email: "", mobile: "", classSelection: "11th", batchId: "none" });
      
      // Refresh both profiles list and global batches state
      await load();
      if (refreshBatches) {
        await refreshBatches();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Registration failed", description: err.message });
    } finally {
      setRegLoading(false);
    }
  };

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
      // Note: No unique check here anymore as roll_no is just an info field
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
    if (!supabase) return;
    setActionId(studentId);
    try {
      // Direct Supabase Update (avoiding 404 API route)
      const { error } = await supabase
        .from("profiles")
        .update({ 
          account_status: status,
          status: status === "blocked" ? "blocked" : "active"
        })
        .eq("id", studentId);

      if (error) throw error;

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
      `Archive student "${r.full_name}"? They will be removed from all active lists.`,
    );
    if (!ok) return;

    setActionId(r.id);
    try {
      // Soft Delete: update status to 'archived'
      const { error } = await supabase
        .from("profiles")
        .update({ status: "archived" })
        .eq("id", r.id);

      if (error) throw error;

      toast({ title: "Student archived! 📦", description: `${r.full_name} moved to archive.` });
      
      // UI update: filter out the archived row immediately
      setRows(prev => prev.filter(row => row.id !== r.id));
      
      // Refresh global batches state
      if (refreshBatches) {
        await refreshBatches();
      }
    } catch (e: any) {
      const msg = e.message || "Archive failed";
      toast({ 
        variant: "destructive", 
        title: "Action failed", 
        description: msg 
      });
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading registrations…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border-2 border-dashed border-primary/20">
        <div>
          <h3 className="text-sm font-bold text-foreground">Direct Registration</h3>
          <p className="text-[11px] text-muted-foreground">Add students manually to the system.</p>
        </div>
        <Dialog open={isRegModalOpen} onOpenChange={setIsRegModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-11 font-bold shadow-lg shadow-primary/10">
              <UserPlus size={18} />
              Register New Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
            <form onSubmit={handleRegisterStudent}>
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="flex items-center gap-2 text-xl font-black">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Sparkles size={20} />
                  </div>
                  Student Registration
                </DialogTitle>
              </DialogHeader>
              <div className="p-6 pt-2 space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2 ml-1">
                    <User size={12} className="text-primary" />
                    Full Name
                  </label>
                  <Input 
                    value={regForm.fullName} 
                    onChange={(e) => setRegForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="e.g. Rahul Kumar" 
                    className="h-11 font-semibold border-2 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2 ml-1">
                    <Mail size={12} className="text-primary" />
                    Email ID
                  </label>
                  <Input 
                    type="email"
                    value={regForm.email} 
                    onChange={(e) => setRegForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="rahul@example.com" 
                    className="h-11 font-semibold border-2 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2 ml-1">
                    <Phone size={12} className="text-primary" />
                    Mobile Number
                  </label>
                  <Input 
                    value={regForm.mobile} 
                    onChange={(e) => setRegForm(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="10-digit mobile" 
                    className="h-11 font-semibold border-2 rounded-xl"
                    inputMode="tel"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2 ml-1">
                      <GraduationCap size={12} className="text-primary" />
                      Class
                    </label>
                    <select
                      value={regForm.classSelection}
                      onChange={(e) => setRegForm(prev => ({ ...prev, classSelection: e.target.value as ClassSelection }))}
                      className="w-full h-11 rounded-xl border-2 border-input bg-background px-3 text-sm font-bold outline-none focus:border-primary transition-all"
                    >
                      <option value="11th">11th Class</option>
                      <option value="12th">12th Class</option>
                      <option value="12th_pass">12th Pass</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2 ml-1">
                      <School size={12} className="text-primary" />
                      Batch (Opt)
                    </label>
                    <select
                      value={regForm.batchId}
                      onChange={(e) => setRegForm(prev => ({ ...prev, batchId: e.target.value }))}
                      className="w-full h-11 rounded-xl border-2 border-input bg-background px-3 text-sm font-bold outline-none focus:border-primary transition-all"
                    >
                      <option value="none">No Batch</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.batch_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <DialogFooter className="p-6 border-t bg-muted/20">
                <Button 
                  type="submit" 
                  disabled={regLoading}
                  className="w-full h-12 font-black text-base rounded-xl shadow-xl shadow-primary/10"
                >
                  {regLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles size={18} className="mr-2" />}
                  Complete Registration
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground px-1">
          Showing all registered student profiles. Tap a name to view or edit full details.
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
                    <button
                       type="button"
                       className="text-sm font-semibold text-primary text-left hover:underline line-clamp-2"
                        onClick={() => navigate(`/admin/student/${r.id}`)}
                        >
                      {r.full_name}
                      </button>
                      <p className="text-[11px] text-muted-foreground truncate lg:hidden mt-0.5">
    {r.email ?? r.id}
  </p>
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
  </div>
);
};

export default AdminStudentProfilesSection;