import AppHeader from "@/components/AppHeader";
import { User, Mail, LogOut, ChevronRight, Award, LineChart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import { fetchProfile } from "@/lib/profiles";
import StudentDashboard from "@/components/profile/StudentDashboard";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [studentEmail, setStudentEmail] = useState("Not available");
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadEmail = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const em = data.user?.email ?? "Not available";
      setStudentEmail(em);
      setIsAdmin(isSuperAdminEmail(data.user?.email));
      const p = await fetchProfile(data.user?.id);
      setDisplayName(p?.full_name?.trim() || "");
    };

    void loadEmail();
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login", { replace: true });
  };

  const menuItems = useMemo(() => {
    const items: { label: string; action: () => void }[] = [];
    if (isAdmin) items.push({ label: "Admin Panel", action: () => navigate("/admin") });
    if (!isAdmin) items.push({ label: "My registration", action: () => navigate("/student-profile") });
    if (!isAdmin) items.push({ label: "Homework", action: () => navigate("/homework") });
    items.push(
      { label: "My Batch", action: () => navigate("/my-batch") },
      { label: "Settings", action: () => navigate("/settings") },
      { label: "Help & Support", action: () => navigate("/help") },
      { label: "About SAHGAL CLASSES", action: () => navigate("/about") },
    );
    return items;
  }, [isAdmin, navigate]);

  return (
    <div className="min-h-screen pb-20 bg-background">
      <AppHeader />

      {/* Profile Card */}
      <div className="px-4 mt-4">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <User size={28} className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{displayName || "Student"}</h2>
              <div className="flex items-center gap-1 mt-0.5">
                <Mail size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{studentEmail}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-primary bg-secondary px-2 py-0.5 rounded-full">
              IIT-JEE 2025
            </span>
            <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Award size={10} /> Premium
            </span>
          </div>
        </div>
      </div>

      {/* Student Progress Dashboard - New Section */}
      {!isAdmin && (
        <div className="px-4 mt-5">
          <div className="flex items-center gap-2 mb-3">
            <LineChart size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">My Progress</h3>
          </div>
          <StudentDashboard />
        </div>
      )}

      {/* Menu Items */}
      <div className="px-4 mt-5 mb-4">
        {menuItems.map((item) => (
          <button key={item.label} onClick={item.action} className="w-full flex items-center justify-between py-3.5 border-b border-border">
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        ))}
        <button onClick={handleLogout} className="w-full flex items-center gap-2 py-3.5 mt-2">
          <LogOut size={16} className="text-destructive" />
          <span className="text-sm font-medium text-destructive">Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
