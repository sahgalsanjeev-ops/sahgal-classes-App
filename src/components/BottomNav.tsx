import { useEffect, useMemo, useState } from "react";
import { Home, BookOpen, MessageCircle, User, LayoutDashboard, ClipboardList } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [superAdmin, setSuperAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSuperAdmin(false);
      return;
    }
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      setSuperAdmin(isSuperAdminEmail(data.user?.email));
    };
    void run();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void run();
    });
    return () => subscription.unsubscribe();
  }, []);

  const tabs = useMemo(() => {
    const base = [
      { path: "/", icon: Home, label: "Home" },
      { path: "/courses", icon: BookOpen, label: "Courses" },
      { path: "/tests", icon: ClipboardList, label: "Tests" },
      { path: "/doubts", icon: MessageCircle, label: "Doubts" },
      { path: "/profile", icon: User, label: "Profile" },
    ];
    if (!superAdmin) return base;
    return [...base, { path: "/admin", icon: LayoutDashboard, label: "Admin" }];
  }, [superAdmin]);

  if (location.pathname === "/onboarding" || location.pathname === "/login") return null;

  // Hide on full-screen video and timed test attempt
  if (location.pathname.startsWith("/video/")) return null;
  if (location.pathname.startsWith("/test/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.path === "/admin"
              ? location.pathname.startsWith("/admin")
              : tab.path === "/courses"
                ? location.pathname === "/courses" || location.pathname.startsWith("/courses/")
              : location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-14 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 w-8 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon
                size={22}
                className={isActive ? "text-primary" : "text-muted-foreground"}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
