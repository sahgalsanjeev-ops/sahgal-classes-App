import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { NoticeAudience, NoticeRow } from "@/lib/notices";

const AdminNoticesSection = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<NoticeAudience>("public");
  const [batchCode, setBatchCode] = useState("");
  const [rollsRaw, setRollsRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("notices")
      .select("id, title, body, audience_type, batch_code, roll_numbers, created_at")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) {
      toast({ variant: "destructive", title: "Load failed", description: error.message });
      setRows([]);
    } else {
      setRows((data ?? []) as NoticeRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parseRolls = (raw: string) =>
    raw
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const publish = async () => {
    if (!supabase) return;
    if (!title.trim() || !body.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Title and message are required." });
      return;
    }
    if (audience === "batch" && !batchCode.trim()) {
      toast({ variant: "destructive", title: "Batch code", description: "Enter the batch code for targeted notices." });
      return;
    }
    if (audience === "rolls") {
      const rolls = parseRolls(rollsRaw);
      if (rolls.length === 0) {
        toast({ variant: "destructive", title: "Roll numbers", description: "Enter at least one roll number." });
        return;
      }
    }

    const { data: userData } = await supabase.auth.getUser();
    const rolls = audience === "rolls" ? parseRolls(rollsRaw) : [];

    setSaving(true);
    try {
      const { error } = await supabase.from("notices").insert({
        title: title.trim(),
        body: body.trim(),
        audience_type: audience,
        batch_code: audience === "batch" ? batchCode.trim() : null,
        roll_numbers: audience === "rolls" ? rolls : [],
        created_by: userData.user?.id ?? null,
      });
      if (error) throw new Error(error.message);
      toast({ title: "Notice published", description: "Students will see it on Home if they match the audience." });
      setTitle("");
      setBody("");
      setBatchCode("");
      setRollsRaw("");
      setAudience("public");
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ variant: "destructive", title: "Could not publish", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const audienceLabel = (n: NoticeRow) => {
    if (n.audience_type === "public") return "Everyone";
    if (n.audience_type === "batch") return `Batch: ${n.batch_code ?? "—"}`;
    return `Rolls: ${(n.roll_numbers ?? []).join(", ") || "—"}`;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-primary uppercase tracking-wide flex items-center gap-2">
          <Megaphone size={16} /> New notice
        </h3>
        <div>
          <label className="text-xs font-medium text-foreground">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="Headline" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Message</label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 min-h-[100px]" placeholder="Announcement…" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Target audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as NoticeAudience)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="public">Anyone (public)</option>
            <option value="batch">Specific batch (batch code)</option>
            <option value="rolls">Specific students (roll numbers)</option>
          </select>
        </div>
        {audience === "batch" && (
          <div>
            <label className="text-xs font-medium text-foreground">Batch code</label>
            <Input
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              className="mt-1 font-mono"
              placeholder="Must match profile batch code"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Set each student&apos;s batch code in their profile first.</p>
          </div>
        )}
        {audience === "rolls" && (
          <div>
            <label className="text-xs font-medium text-foreground">Roll numbers</label>
            <Textarea
              value={rollsRaw}
              onChange={(e) => setRollsRaw(e.target.value)}
              className="mt-1 min-h-[72px] font-mono text-sm"
              placeholder="e.g. 101, 102, 205"
            />
          </div>
        )}
        <Button type="button" className="w-full bg-primary" disabled={saving} onClick={() => void publish()}>
          {saving ? "Publishing…" : "Publish notice"}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
        <h3 className="text-sm font-bold text-foreground">Recent notices</h3>
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && <p className="text-xs text-muted-foreground">No notices yet.</p>}
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {rows.map((n) => (
            <li key={n.id} className="text-xs border border-border rounded-lg p-2 bg-muted/20">
              <p className="font-semibold text-foreground">{n.title}</p>
              <p className="text-[10px] text-primary font-medium mt-0.5">{audienceLabel(n)}</p>
              <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), "dd MMM yyyy, h:mm a")}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminNoticesSection;
