import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import { fetchProfile } from "@/lib/profiles";

/**
 * Super-admins skip profile requirements.
 * Students must complete onboarding before using the main app.
 */
export const RequireCompleteStudentProfile = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setOk(false);
      setReady(true);
      return;
    }

    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (isSuperAdminEmail(email)) {
        setOk(true);
        setReady(true);
        return;
      }
      const profile = await fetchProfile(data.user?.id);
      if (!profile?.onboarding_completed) {
        setReady(true);
        setOk(false);
        navigate("/onboarding", { replace: true });
        return;
      }
      setOk(true);
      setReady(true);
    };

    void run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void run();
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;
  }
  if (!ok) {
    return null;
  }
  return <>{children}</>;
};
