import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/profiles";

const AdminStudentProfilesSection = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [rollDraft, setRollDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading registrations…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tap a student name for full profile, contact &amp; academic details, email, batch code, and homework uploads.
        Quick roll edit stays below.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No profiles yet. Students appear after they submit registration.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary truncate text-left hover:underline"
                    onClick={() => navigate(`/admin/student/${r.id}`)}
                  >
                    {r.full_name}
                  </button>
                  <p className="text-[11px] text-muted-foreground truncate">{r.email ?? r.id}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Class: {r.class_selection.replace("_", " ")}
                    {r.onboarding_completed ? "" : " · Incomplete"}
                  </p>
                </div>
              </div>
              {editId === r.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={rollDraft}
                    onChange={(e) => setRollDraft(e.target.value)}
                    placeholder="Roll no."
                    className="flex-1 min-w-[120px] font-mono text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1"
                    disabled={savingId === r.id}
                    onClick={() => void saveRoll(r.id)}
                  >
                    <Save size={14} /> Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-foreground">
                    Roll: <span className="font-mono font-semibold">{r.roll_no ?? "—"}</span>
                  </p>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => startEdit(r)}>
                    <Pencil size={14} /> Edit roll
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminStudentProfilesSection;
