import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";

/** Only the two hard-coded super-admin emails may access /admin. */
export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAllowed(false);
      setReady(true);
      return;
    }

    const run = async () => {
      const { data } = await supabase.auth.getUser();
      setAllowed(isSuperAdminEmail(data.user?.email));
      setReady(true);
    };

    void run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void run();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;
  }
  if (!isSupabaseConfigured || !supabase || !allowed) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
