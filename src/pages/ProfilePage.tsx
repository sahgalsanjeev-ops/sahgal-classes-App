import AppHeader from "@/components/AppHeader";
import PerformanceCard from "@/components/PerformanceCard";
import { User, Mail, LogOut, ChevronRight, Award } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import { fetchProfile } from "@/lib/profiles";

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

      {/* Performance Section */}
      <div className="px-4 mt-5">
        <h3 className="text-base font-bold text-foreground mb-3">Performance Dashboard</h3>
        <div className="grid grid-cols-2 gap-3">
          <PerformanceCard type="homework" title="Homework" done={18} total={24} />
          <PerformanceCard type="attendance" title="Live Attendance" done={28} total={32} />
          <PerformanceCard type="video" title="Videos Watched" done={45} total={60} />
          <PerformanceCard type="attendance" title="Offline Classes" done={22} total={25} />
          <PerformanceCard type="test" title="Test Scores" done={385} total={500} unit="marks" />
          <PerformanceCard type="syllabus" title="Syllabus Done" done={14} total={22} unit="topics" />
        </div>
      </div>

      {/* Homework Details */}
      <div className="px-4 mt-5">
        <h3 className="text-sm font-bold text-foreground mb-2">Recent Homework</h3>
        <div className="space-y-2">
          {[
            { title: "Kinematics Problems Set 3", status: "done", date: "28 Mar" },
            { title: "Chemical Bonding Worksheet", status: "done", date: "27 Mar" },
            { title: "Integration Practice", status: "pending", date: "Due: 2 Apr" },
            { title: "Electrostatics Numericals", status: "pending", date: "Due: 4 Apr" },
          ].map((hw, i) => (
            <div key={i} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3 shadow-sm">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hw.status === "done" ? "bg-success" : "bg-accent"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{hw.title}</p>
                <p className="text-[10px] text-muted-foreground">{hw.date}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                hw.status === "done" ? "text-success bg-success/10" : "text-accent bg-accent/10"
              }`}>
                {hw.status === "done" ? "Done" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>

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
