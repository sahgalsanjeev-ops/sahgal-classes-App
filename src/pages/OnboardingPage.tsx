import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import type { ClassSelection } from "@/lib/profiles";
import { fetchProfile } from "@/lib/profiles";
import { Loader2, Sparkles, User, Phone, GraduationCap } from "lucide-react";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [classSelection, setClassSelection] = useState<ClassSelection>("11th");

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
      
      // Check condition: if Name and Class are already present, skip onboarding
      if (profile?.full_name && profile?.class_selection) {
        navigate("/", { replace: true });
        return;
      }
      
      if (profile) {
        setFullName(profile.full_name || "");
        setMobile(profile.mobile || "");
        setClassSelection(profile.class_selection || "11th");
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

    setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error(userErr?.message ?? "Not signed in.");

      // Upsert logic: Update profile against student's email/id
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userData.user.id,
          email: userData.user.email ?? null,
          full_name: fullName.trim(),
          mobile: mobile.trim(),
          class_selection: classSelection,
          onboarding_completed: true, // Mark as completed for legacy logic
        },
        { onConflict: "id" },
      );

      if (error) throw new Error(error.message);

      toast({ 
        title: "Setup Complete! 🚀", 
        description: `Welcome ${fullName.trim()}, let's start learning.` 
      });
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save profile.";
      toast({ variant: "destructive", title: "Setup failed", description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Setting up your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Quick Setup</h1>
          <p className="text-muted-foreground">Just a few details to get you started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground flex items-center gap-2 ml-1">
                <User size={14} className="text-primary" />
                Full Name
              </label>
              <Input 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                className="h-12 text-base rounded-xl border-2 focus-visible:ring-primary/20 transition-all" 
                placeholder="Enter your full name" 
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground flex items-center gap-2 ml-1">
                <Phone size={14} className="text-primary" />
                Mobile Number
              </label>
              <Input 
                value={mobile} 
                onChange={(e) => setMobile(e.target.value)} 
                className="h-12 text-base rounded-xl border-2 focus-visible:ring-primary/20 transition-all" 
                inputMode="tel" 
                placeholder="10-digit mobile number" 
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground flex items-center gap-2 ml-1">
                <GraduationCap size={14} className="text-primary" />
                Your Class
              </label>
              <RadioGroup 
                value={classSelection} 
                onValueChange={(v) => setClassSelection(v as ClassSelection)} 
                className="grid grid-cols-1 gap-3"
              >
                {[
                  { value: "11th", label: "11th Class" },
                  { value: "12th", label: "12th Class" },
                  { value: "12th_pass", label: "12th Pass / Dropper" }
                ].map((item) => (
                  <label 
                    key={item.value}
                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all duration-200 ${
                      classSelection === item.value 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value={item.value} id={item.value} className="sr-only" />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      classSelection === item.value ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {classSelection === item.value && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className={`text-sm font-bold ${classSelection === item.value ? "text-primary" : "text-foreground"}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={saving} 
            className="w-full h-14 text-lg font-black rounded-xl shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Start Learning"
            )}
          </Button>
          
          <p className="text-center text-[11px] text-muted-foreground px-6">
            By continuing, you agree to our terms. You can complete your full registration profile later in settings.
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
