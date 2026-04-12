import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

/**
 * SessionGuard handles the "One Device Login" restriction.
 * It checks if the current browser session ID matches the one stored in the database.
 */
export const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip session check for login and onboarding pages
    if (location.pathname === "/login" || location.pathname === "/onboarding") return;

    const checkSessionId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const localSessionId = localStorage.getItem("user_session_id");
      if (!localSessionId) return; // If no session ID is set, we don't force logout yet

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("current_session_id")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("SessionGuard check error:", error);
        return;
      }

      // If database ID exists and doesn't match local storage, logout
      if (profile?.current_session_id && profile.current_session_id !== localSessionId) {
        console.warn("Session mismatch detected! Another device logged in.");
        
        // Clear session data
        localStorage.removeItem("user_session_id");
        localStorage.setItem("session_terminated", "true");
        
        await supabase.auth.signOut();
        
        // Show silent logout message and redirect
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Aapne dusre device se login kiya hai, isliye yahan se logout ho gaya hai.",
        });
        
        navigate("/login", { replace: true });
      }
    };

    // Initial check on mount/route change
    void checkSessionId();

    // Re-check when window is focused (student switches back to tab)
    const handleFocus = () => void checkSessionId();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [location.pathname, navigate]);

  return <>{children}</>;
};
