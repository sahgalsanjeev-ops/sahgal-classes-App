import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import type { ClassSelection, FatherOccupationType } from "@/lib/profiles";
import { fetchProfile } from "@/lib/profiles";

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-sm font-medium text-foreground ${className}`}>{children}</label>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3"
  >
    <h3 className="text-xs font-bold uppercase tracking-wide text-primary">{title}</h3>
    {children}
  </motion.div>
);

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [pinCode, setPinCode] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!isSupabaseConfigured || !supabase) {
        toast({
          variant: "destructive",
          title: "Configuration",
          description: "Supabase is not configured.",
        });
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (isSuperAdminEmail(email)) {
        navigate("/admin", { replace: true });
        return;
      }
      const profile = await fetchProfile(data.user?.id);
      if (profile?.onboarding_completed) {
        navigate("/", { replace: true });
        return;
      }
      setLoading(false);
    };
    void run();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;

    if (!fullName.trim() || !mobile.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Name and mobile are required." });
      return;
    }
    if (!marks10.trim()) {
      toast({ variant: "destructive", title: "Required", description: "10th Class Maths marks are required." });
      return;
    }
    if (classSelection !== "11th" && !marks12.trim()) {
      toast({
        variant: "destructive",
        title: "Required",
        description: "12th Class Maths marks are required for 12th / 12th Pass.",
      });
      return;
    }
    if (!fatherName.trim() || !motherName.trim() || !guardianName.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Please complete family & guardian names." });
      return;
    }
    if (!guardianMobile.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Guardian mobile is required." });
      return;
    }
    if (!address.trim() || !city.trim() || !state.trim() || !country.trim() || !pinCode.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Please complete address fields." });
      return;
    }

    setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error(userErr?.message ?? "Not signed in.");

      const { error } = await supabase.from("profiles").upsert(
        {
          id: userData.user.id,
          email: userData.user.email ?? null,
          full_name: fullName.trim(),
          mobile: mobile.trim(),
          class_selection: classSelection,
          marks_10_maths: marks10.trim(),
          marks_12_maths: classSelection === "11th" ? (marks12.trim() || null) : marks12.trim(),
          father_name: fatherName.trim(),
          father_occupation_type: fatherOccType,
          father_occupation_details: fatherOccDetails.trim() || null,
          mother_name: motherName.trim(),
          mother_occupation: motherOcc.trim() || null,
          guardian_name: guardianName.trim(),
          guardian_mobile: guardianMobile.trim(),
          guardian_email: guardianEmail.trim() || null,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          country: country.trim(),
          pin_code: pinCode.trim(),
          onboarding_completed: true,
        },
        { onConflict: "id" },
      );

      if (error) throw new Error(error.message);

      toast({ title: "Registration complete", description: "Welcome to SAHGAL CLASSES." });
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save profile.";
      toast({ variant: "destructive", title: "Save failed", description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="bg-primary px-4 py-4">
        <h1 className="text-lg font-bold text-primary-foreground">Student registration</h1>
        <p className="text-xs text-primary-foreground/85 mt-1">SAHGAL CLASSES — please complete once</p>
      </div>

      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-4 max-w-lg mx-auto">
        <Section title="Personal">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" placeholder="As per records" />
          </div>
          <div>
            <Label>Mobile number</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} className="mt-1" inputMode="tel" placeholder="10-digit mobile" />
          </div>
          <div>
            <Label>Roll number</Label>
            <Input
              value=""
              disabled
              readOnly
              className="mt-1 bg-muted/50 text-muted-foreground"
              placeholder="Assigned by admin after registration"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Roll number is set only by admin.</p>
          </div>
        </Section>

        <Section title="Class">
          <Label>Current class / status</Label>
          <RadioGroup value={classSelection} onValueChange={(v) => setClassSelection(v as ClassSelection)} className="mt-2 gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="11th" id="c11" />
              <span className="text-sm">11th</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="12th" id="c12" />
              <span className="text-sm">12th</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="12th_pass" id="c12p" />
              <span className="text-sm">12th Pass</span>
            </label>
          </RadioGroup>
        </Section>

        <Section title="Academic">
          <div>
            <Label>10th class — Maths marks</Label>
            <Input value={marks10} onChange={(e) => setMarks10(e.target.value)} className="mt-1" placeholder="e.g. 95 / A+" />
          </div>
          <div>
            <Label>12th class — Maths marks {classSelection === "11th" ? "(optional)" : ""}</Label>
            <Input
              value={marks12}
              onChange={(e) => setMarks12(e.target.value)}
              className="mt-1"
              placeholder={classSelection === "11th" ? "If applicable" : "Required for 12th / Pass"}
            />
          </div>
        </Section>

        <Section title="Family">
          <div>
            <Label>Father&apos;s name</Label>
            <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Occupation</Label>
            <select
              value={fatherOccType}
              onChange={(e) => setFatherOccType(e.target.value as FatherOccupationType)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="Service">Service</option>
              <option value="Business">Business</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <Label>Father&apos;s occupation details</Label>
            <Input value={fatherOccDetails} onChange={(e) => setFatherOccDetails(e.target.value)} className="mt-1" placeholder="Designation / business type" />
          </div>
          <div>
            <Label>Mother&apos;s name</Label>
            <Input value={motherName} onChange={(e) => setMotherName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Mother&apos;s occupation</Label>
            <Input value={motherOcc} onChange={(e) => setMotherOcc(e.target.value)} className="mt-1" />
          </div>
        </Section>

        <Section title="Guardian">
          <div>
            <Label>Guardian&apos;s name</Label>
            <Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Guardian mobile</Label>
            <Input value={guardianMobile} onChange={(e) => setGuardianMobile(e.target.value)} className="mt-1" inputMode="tel" />
          </div>
          <div>
            <Label>Guardian email</Label>
            <Input
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              className="mt-1"
              placeholder="optional"
            />
          </div>
        </Section>

        <Section title="Address">
          <div>
            <Label>Student&apos;s address</Label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="House no., street, locality"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Pin code</Label>
              <Input value={pinCode} onChange={(e) => setPinCode(e.target.value)} className="mt-1" inputMode="numeric" />
            </div>
          </div>
        </Section>

        <Button type="submit" disabled={saving} className="w-full h-12 rounded-xl text-base font-semibold">
          {saving ? "Saving…" : "Submit registration"}
        </Button>
      </form>
    </div>
  );
};

export default OnboardingPage;
