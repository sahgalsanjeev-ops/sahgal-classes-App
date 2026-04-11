import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ClassSelection, FatherOccupationType, ProfileRow } from "@/lib/profiles";
import { getSignedHomeworkFileUrl } from "@/lib/homework";

type SubWithHw = {
  id: string;
  homework_id: string;
  file_path: string;
  submitted_at: string;
  homework: { title: string; deadline: string } | null;
};

const AdminStudentDetailPage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subs, setSubs] = useState<SubWithHw[]>([]);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [classSelection, setClassSelection] = useState<ClassSelection>("11th");
  const [marks10, setMarks10] = useState("");
  const [marks12, setMarks12] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherOccType, setFatherOccType] = useState<FatherOccupationType>("Service");
  const [fatherOccDetails, setFatherOccDetails] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherOcc, setMotherOcc] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianMobile, setGuardianMobile] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [country, setCountry] = useState("India");
  const [pinCode, setPinCode] = useState("");

  const load = useCallback(async () => {
    if (!studentId || !isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    const { data: p, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", studentId)
      .eq("status", "active")
      .maybeSingle();
    if (error || !p) {
      toast({ variant: "destructive", title: "Not found", description: error?.message ?? "No profile for this id." });
      navigate("/admin", { replace: true });
      return;
    }
    const row = p as ProfileRow;
    setEmail(row.email ?? "");
    setFullName(row.full_name ?? "");
    setMobile(row.mobile ?? "");
    setRollNo(row.roll_no ?? "");
    setBatchCode(row.batch_code ?? "");
    setClassSelection(row.class_selection);
    setMarks10(row.marks_10_maths ?? "");
    setMarks12(row.marks_12_maths ?? "");
    setFatherName(row.father_name ?? "");
    setFatherOccType(row.father_occupation_type ?? "Service");
    setFatherOccDetails(row.father_occupation_details ?? "");
    setMotherName(row.mother_name ?? "");
    setMotherOcc(row.mother_occupation ?? "");
    setGuardianName(row.guardian_name ?? "");
    setGuardianMobile(row.guardian_mobile ?? "");
    setGuardianEmail(row.guardian_email ?? "");
    setAddress(row.address ?? "");
    setCity(row.city ?? "");
    setStateVal(row.state ?? "");
    setCountry(row.country ?? "India");
    setPinCode(row.pin_code ?? "");

    const { data: subData } = await supabase
      .from("homework_submissions")
      .select("id, homework_id, file_path, submitted_at")
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false });
    const subsList = subData ?? [];
    const hwIds = [...new Set(subsList.map((s) => s.homework_id))];
    let hwMap: Record<string, { title: string; deadline: string }> = {};
    if (hwIds.length > 0) {
      const { data: hwRows } = await supabase.from("homework").select("id, title, deadline").in("id", hwIds);
      hwMap = Object.fromEntries((hwRows ?? []).map((h) => [h.id, { title: h.title, deadline: h.deadline }]));
    }
    setSubs(
      subsList.map((s) => ({
        ...s,
        homework: hwMap[s.homework_id] ?? null,
      })) as SubWithHw[],
    );
    setLoading(false);
  }, [studentId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    if (!studentId || !supabase) return;
    if (!fullName.trim() || !mobile.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Name and mobile are required." });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          email: email.trim() || null,
          full_name: fullName.trim(),
          mobile: mobile.trim(),
          roll_no: rollNo.trim() || null,
          batch_code: batchCode.trim() || null,
          class_selection: classSelection,
          marks_10_maths: marks10.trim() || null,
          marks_12_maths: classSelection === "11th" ? marks12.trim() || null : marks12.trim() || null,
          father_name: fatherName.trim() || null,
          father_occupation_type: fatherOccType,
          father_occupation_details: fatherOccDetails.trim() || null,
          mother_name: motherName.trim() || null,
          mother_occupation: motherOcc.trim() || null,
          guardian_name: guardianName.trim() || null,
          guardian_mobile: guardianMobile.trim() || null,
          guardian_email: guardianEmail.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: stateVal.trim() || null,
          country: country.trim() || null,
          pin_code: pinCode.trim() || null,
        })
        .eq("id", studentId);
      if (error) throw new Error(error.message);
      toast({ title: "Saved", description: "Profile updated in Supabase." });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ variant: "destructive", title: "Update failed", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const openFile = async (path: string) => {
    const url = await getSignedHomeworkFileUrl(path, 7200);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast({ variant: "destructive", title: "Link failed", description: "Could not create file link." });
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/admin")} className="w-9 h-9 flex items-center justify-center">
          <ArrowLeft size={22} className="text-primary-foreground" />
        </button>
        <div>
          <h1 className="text-base font-bold text-primary-foreground">Student profile</h1>
          <p className="text-[11px] text-primary-foreground/80">Admin · full edit</p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4 max-w-lg mx-auto">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-primary">Account</h2>
          <div>
            <label className="text-xs font-medium">Email (admin only)</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" type="email" />
          </div>
          <div>
            <label className="text-xs font-medium">Roll number</label>
            <Input value={rollNo} onChange={(e) => setRollNo(e.target.value)} className="mt-1 font-mono" />
          </div>
          <div>
            <label className="text-xs font-medium">Batch code (notices)</label>
            <Input value={batchCode} onChange={(e) => setBatchCode(e.target.value)} className="mt-1 font-mono uppercase" />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-primary">Contact</h2>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile" inputMode="tel" />
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-primary">Class</h2>
          <RadioGroup value={classSelection} onValueChange={(v) => setClassSelection(v as ClassSelection)} className="gap-2">
            {(["11th", "12th", "12th_pass"] as const).map((c) => (
              <label key={c} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer">
                <RadioGroupItem value={c} id={`adm-${c}`} />
                <span className="text-sm">{c === "12th_pass" ? "12th Pass" : c}</span>
              </label>
            ))}
          </RadioGroup>
          <Input value={marks10} onChange={(e) => setMarks10(e.target.value)} placeholder="10th Maths marks" />
          <Input
            value={marks12}
            onChange={(e) => setMarks12(e.target.value)}
            placeholder={classSelection === "11th" ? "12th Maths marks (optional for 11th)" : "12th Maths marks"}
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-primary">Family</h2>
          <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} placeholder="Father name" />
          <select
            value={fatherOccType}
            onChange={(e) => setFatherOccType(e.target.value as FatherOccupationType)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="Service">Service</option>
            <option value="Business">Business</option>
            <option value="Other">Other</option>
          </select>
          <Input value={fatherOccDetails} onChange={(e) => setFatherOccDetails(e.target.value)} placeholder="Father occupation details" />
          <Input value={motherName} onChange={(e) => setMotherName(e.target.value)} placeholder="Mother name" />
          <Input value={motherOcc} onChange={(e) => setMotherOcc(e.target.value)} placeholder="Mother occupation" />
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-primary">Guardian &amp; address</h2>
          <Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Guardian name" />
          <Input value={guardianMobile} onChange={(e) => setGuardianMobile(e.target.value)} placeholder="Guardian mobile" />
          <Input value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} placeholder="Guardian email" />
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="min-h-[72px]" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <Input value={stateVal} onChange={(e) => setStateVal(e.target.value)} placeholder="State" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
            <Input value={pinCode} onChange={(e) => setPinCode(e.target.value)} placeholder="PIN" />
          </div>
        </section>

        <Button type="button" className="w-full gap-2 bg-primary" disabled={saving} onClick={() => void saveProfile()}>
          <Save size={16} />
          {saving ? "Saving…" : "Save profile"}
        </Button>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-primary">Homework submissions</h2>
          {subs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No files submitted yet.</p>
          ) : (
            <ul className="space-y-2">
              {subs.map((s) => (
                <li key={s.id} className="text-xs border border-border rounded-lg p-2 flex flex-col gap-1">
                  <span className="font-semibold text-foreground">{s.homework?.title ?? "Homework"}</span>
                  <span className="text-muted-foreground">
                    Due {s.homework?.deadline ? format(new Date(s.homework.deadline), "dd MMM yyyy, h:mm a") : "—"}
                  </span>
                  <span className="text-muted-foreground">
                    Submitted {format(new Date(s.submitted_at), "dd MMM yyyy, h:mm a")}
                  </span>
                  <Button type="button" size="sm" variant="outline" className="w-full gap-1 mt-1" onClick={() => void openFile(s.file_path)}>
                    <ExternalLink size={14} /> Open file
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminStudentDetailPage;
