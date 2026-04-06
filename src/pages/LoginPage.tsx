import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getPostLoginPath } from "@/lib/profiles";

const LoginPage = () => {
  const RESEND_SECONDS = 30;
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  /** Email OTP length depends on Supabase/project settings and templates (commonly 6 or 8 digits). */
  const otpMaxLength = 8;
  const otpOkLengths = [6, 8] as const;
  const isCompleteOtp = (value: string) =>
    (otpOkLengths as readonly number[]).includes(value.length);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (!supabase) return;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const path = await getPostLoginPath(data.session.user.id, data.session.user.email);
        navigate(path, { replace: true });
      }
    };

    void checkSession();
  }, [navigate]);

  useEffect(() => {
    if (!otpSent || resendCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpSent, resendCountdown]);

  const handleSendOTP = async () => {
    if (!email.includes("@")) return;
    if (!supabase || !isSupabaseConfigured) {
      toast({
        variant: "destructive",
        title: "Supabase not configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        // Keeps deep-link redirects on your site if the email still includes a magic link.
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      setLoading(false);
      setOtpSent(false);
      setResendCountdown(0);
      const msg = error.message.toLowerCase();
      const rateLimited = msg.includes("rate limit") || msg.includes("too many");
      toast({
        variant: "destructive",
        title: rateLimited ? "Email limit reached" : "Unable to send OTP",
        description: rateLimited
          ? "Supabase caps how many auth emails your project can send per hour. Wait a while, tap Resend less often while testing, or check Dashboard → Authentication → Rate Limits (custom SMTP on Pro+ can help)."
          : error.message,
      });
      return;
    }
    setLoading(false);
    setOtpSent(true);
    setOtp("");
    setResendCountdown(RESEND_SECONDS);
    toast({
      title: "Code sent",
      description: `Check ${email} for your verification code.`,
    });
  };

  const handleVerifyOTP = async () => {
    if (!isCompleteOtp(otp)) return;
    if (!supabase || !isSupabaseConfigured) {
      toast({
        variant: "destructive",
        title: "Supabase not configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
      });
      return;
    }
    setLoading(true);

    // 1. Pehle OTP verify karein
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: "email",
    });

    if (verifyError) {
      setLoading(false);
      const lowerMsg = verifyError.message.toLowerCase();
      toast({
        variant: "destructive",
        title: lowerMsg.includes("expired") ? "OTP expired" : "Incorrect OTP",
        description: verifyError.message,
      });
      return;
    }

    // 2. User ki profile check karein ki wo Blocked toh nahi hai
    const user = verifyData.user;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user.id)
        .single();

      if (profile?.account_status === 'blocked') {
        setLoading(false);
        await supabase.auth.signOut(); // Turant logout kar dein
        toast({
          variant: "destructive",
          title: "Account Blocked",
          description: "Aapka account admin dwara block kar diya gaya hai. Kripya coaching se sampark karein.",
        });
        setOtp(""); 
        return;
      }
    }

    // 3. Agar blocked nahi hai, toh dashboard par bhejein
    setLoading(false);
    const path = await getPostLoginPath(user?.id, user?.email);
    navigate(path, { replace: true });
  };

  const resetEmail = () => {
    setOtpSent(false);
    setOtp("");
    setResendCountdown(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-blue-950 flex flex-col">
      <div className="shrink-0 flex flex-col items-center justify-center px-6 pt-10 pb-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mb-4 overflow-hidden p-2 shadow-md ring-1 ring-slate-900/10"
        >
          <img
            src="/logo.png"
            alt="Sahgal Classes"
            className="h-full w-full object-contain object-center select-none"
            width={80}
            height={80}
            decoding="async"
          />
        </motion.div>
        <h1 className="text-xl font-bold text-primary-foreground">SAHGAL CLASSES</h1>
        <p className="text-primary-foreground/80 text-sm mt-1">Mathematics Excellence</p>
      </div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="flex-1 bg-white rounded-t-3xl px-6 pt-6 pb-8 shadow-2xl border-t border-white/30 min-h-0 overflow-y-auto"
      >
        <h2 className="text-lg font-bold text-foreground mb-1">Sign in</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Enter your email, request a code, then type the digits from your email to open your dashboard.
        </p>

        <div className="space-y-5 max-w-md mx-auto">
          <div className="space-y-3">
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                disabled={otpSent}
                onChange={(e) => setEmail(e.target.value.trim())}
                className="pl-10 h-12 text-base rounded-xl border-primary/20 focus-visible:ring-primary disabled:opacity-70"
              />
            </div>
            {otpSent ? (
              <button type="button" onClick={resetEmail} className="text-xs text-primary font-medium">
                Use a different email
              </button>
            ) : null}
            <Button
              type="button"
              onClick={handleSendOTP}
              disabled={!email.includes("@") || loading || (otpSent && resendCountdown > 0)}
              variant={otpSent ? "outline" : "default"}
              className="w-full h-12 rounded-xl text-base font-semibold gap-2"
            >
              {loading ? "Sending…" : otpSent ? (resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code") : "Send code"}
              {!loading && !otpSent && <ArrowRight size={18} />}
            </Button>
          </div>

          <div className="space-y-4 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {otpSent ? (
                <>
                  Code sent to <span className="font-medium text-foreground">{email}</span>. Enter the full code (6 or
                  8 digits).
                </>
              ) : (
                <>Tap &quot;Send code&quot; — then enter the digits from your email here. No link click required.</>
              )}
            </p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={otpMaxLength}
                inputMode="numeric"
                pattern={/^\d+$/}
                value={otp}
                disabled={!otpSent}
                onChange={(value) => setOtp(value.replace(/\D/g, ""))}
              >
                <InputOTPGroup>
                  {Array.from({ length: otpMaxLength }, (_, i) => i).map((i) => (
                    <InputOTPSlot key={i} index={i} className="w-9 h-12 text-lg rounded-lg sm:w-10" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              type="button"
              onClick={handleVerifyOTP}
              disabled={!otpSent || !isCompleteOtp(otp) || loading}
              className="w-full h-12 rounded-xl text-base font-semibold gap-2 bg-primary hover:bg-primary/90"
            >
              {loading ? "Opening…" : "Open dashboard"}
              {!loading && <ShieldCheck size={18} />}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-8">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
