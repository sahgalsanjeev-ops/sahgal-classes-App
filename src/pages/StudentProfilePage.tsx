import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import type { ClassSelection, FatherOccupationType, ProfileRow } from "@/lib/profiles";
import { fetchProfile } from "@/lib/profiles";

const classLabel = (c: string) => {
  if (c === "12th_pass") return "12th Pass";
  return c;
};

const StudentProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
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

  const hydrate = (p: ProfileRow) => {
    setFullName(p.full_name ?? "");
    setMobile(p.mobile ?? "");
    setClassSelection(p.class_selection);
    setMarks10(p.marks_10_maths ?? "");
    setMarks12(p.marks_12_maths ?? "");
    setFatherName(p.father_name ?? "");
    setFatherOccType(p.father_occupation_type ?? "Service");
    setFatherOccDetails(p.father_occupation_details ?? "");
    setMotherName(p.mother_name ?? "");
    setMotherOcc(p.mother_occupation ?? "");
    setGuardianName(p.guardian_name ?? "");
    setGuardianMobile(p.guardian_mobile ?? "");
    setGuardianEmail(p.guardian_email ?? "");
    setAddress(p.address ?? "");
    setCity(p.city ?? "");
    setStateVal(p.state ?? "");
    setCountry(p.country ?? "India");
    setPinCode(p.pin_code ?? "");
  };

  useEffect(() => {
    const run = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (isSuperAdminEmail(data.user?.email)) {
        navigate("/admin", { replace: true });
        return;
      }
      const p = await fetchProfile(data.user?.id);
      setProfile(p);
      if (p) hydrate(p);
      setLoading(false);
      if (p && !p.onboarding_completed) {
        navigate("/onboarding", { replace: true });
      }
    };
    void run();
  }, [navigate]);

  const save = async () => {
    if (!supabase || !profile) return;
    if (!fullName.trim() || !mobile.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Name and mobile are required." });
      return;
    }
    setSaving(true);
    try {
      // Students cannot change email, roll_no, or batch_code (enforced in DB + omitted here).
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          mobile: mobile.trim(),
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
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      toast({ title: "Saved", description: "Your profile was updated." });
      const next = await fetchProfile(profile.id);
      setProfile(next);
      if (next) hydrate(next);
      setEditing(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ variant: "destructive", title: "Update failed", description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10"
        >
          <ArrowLeft size={22} className="text-primary-foreground" />
        </button>
        <div>
          <h1 className="text-base font-bold text-primary-foreground">My profile</h1>
          <p className="text-[11px] text-primary-foreground/80">Registration details</p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3 max-w-lg mx-auto">
        {!profile ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No profile found. Complete registration first.
          </div>
        ) : (
          <>
            <div className="flex justify-end gap-2">
              {!editing ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit profile
                </Button>
              ) : (
                <>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); hydrate(profile); }}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" className="gap-1 bg-primary" disabled={saving} onClick={() => void save()}>
                    <Save size={14} /> {saving ? "Saving…" : "Save"}
                  </Button>
                </>
              )}
            </div>

            <section className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-primary">Account</h2>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Email</p>
                <p className="text-sm text-foreground mt-0.5 break-all">{profile.email ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Email can only be changed by admin.</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Roll no. (admin)</p>
                <p className="text-sm font-mono text-foreground mt-0.5">{profile.roll_no ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Batch code</p>
                <p className="text-sm font-mono text-foreground mt-0.5">{profile.batch_code ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Set by admin for class notices.</p>
              </div>
            </section>

            {!editing ? (
              <>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-0 divide-y divide-border">
                  <div className="py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Name</p>
                    <p className="text-sm text-foreground mt-0.5">{profile.full_name}</p>
                  </div>
                  <div className="py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Mobile</p>
                    <p className="text-sm text-foreground mt-0.5">{profile.mobile}</p>
                  </div>
                  <div className="py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Class</p>
                    <p className="text-sm text-foreground mt-0.5">{classLabel(profile.class_selection)}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-sm text-muted-foreground">
                  Tap &quot;Edit profile&quot; to update contact, academic, and family details.
                </div>
              </>
            ) : (
              <>
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
                        <RadioGroupItem value={c} id={`st-${c}`} />
                        <span className="text-sm">{c === "12th_pass" ? "12th Pass" : c}</span>
                      </label>
                    ))}
                  </RadioGroup>
                  <Input value={marks10} onChange={(e) => setMarks10(e.target.value)} placeholder="10th Maths marks" />
                  <Input
                    value={marks12}
                    onChange={(e) => setMarks12(e.target.value)}
                    placeholder={classSelection === "11th" ? "12th Maths marks (if applicable)" : "12th Maths marks"}
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
              </>
            )}
          </>
        )}
        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Back to home
        </Button>
      </div>
    </div>
  );
};

export default StudentProfilePage;
