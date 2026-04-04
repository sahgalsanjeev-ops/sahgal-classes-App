import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { HomeworkRow } from "@/lib/homework";

const AdminHomeworkSection = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedDate, setAssignedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [deadlineLocal, setDeadlineLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<HomeworkRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("homework")
      .select("id, title, description, assigned_date, deadline, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Load failed", description: error.message });
      setRows([]);
    } else {
      setRows((data ?? []) as HomeworkRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const postHomework = async () => {
    if (!supabase) return;
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Title required", description: "Enter a homework title." });
      return;
    }
    if (!assignedDate) {
      toast({ variant: "destructive", title: "Assigned date required", description: "Pick the assigned date." });
      return;
    }
    if (!deadlineLocal) {
      toast({ variant: "destructive", title: "Deadline required", description: "Pick deadline date and time." });
      return;
    }
    const deadlineIso = new Date(deadlineLocal).toISOString();
    const { data: userData } = await supabase.auth.getUser();
    setSaving(true);
    try {
      const { error } = await supabase.from("homework").insert({
        title: title.trim(),
        description: description.trim() || null,
        assigned_date: assignedDate,
        deadline: deadlineIso,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw new Error(error.message);
      toast({ title: "Posted", description: "Homework is visible to students." });
      setTitle("");
      setDescription("");
      setAssignedDate(format(new Date(), "yyyy-MM-dd"));
      setDeadlineLocal("");
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ variant: "destructive", title: "Could not post", description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-primary uppercase tracking-wide">Post homework</h3>
        <div>
          <label className="text-xs font-medium text-foreground">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Integration — Set B" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 min-h-[88px]"
            placeholder="Instructions for students…"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground">Assigned date</label>
            <Input type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Deadline (date &amp; time)</label>
            <Input type="datetime-local" value={deadlineLocal} onChange={(e) => setDeadlineLocal(e.target.value)} className="mt-1" />
          </div>
        </div>
        <Button type="button" className="w-full gap-2 bg-primary" disabled={saving} onClick={() => void postHomework()}>
          <Plus size={16} />
          {saving ? "Posting…" : "Publish homework"}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
        <h3 className="text-sm font-bold text-foreground">Recent assignments</h3>
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && <p className="text-xs text-muted-foreground">No homework yet.</p>}
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="text-xs border border-border rounded-lg p-2 bg-muted/20">
              <p className="font-semibold text-foreground">{r.title}</p>
              <p className="text-muted-foreground mt-0.5">
                Assigned {r.assigned_date} · Due {format(new Date(r.deadline), "dd MMM yyyy, h:mm a")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminHomeworkSection;
