import AppHeader from "@/components/AppHeader";
import { User, Mail, LogOut, ChevronRight, Award, LineChart, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import { fetchProfile } from "@/lib/profiles";
import StudentDashboard from "@/components/profile/StudentDashboard";
import StudentScoreCard from "@/components/profile/StudentScoreCard";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [studentEmail, setStudentEmail] = useState("Not available");
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      const em = user?.email ?? "Not available";
      setStudentEmail(em);
      setIsAdmin(isSuperAdminEmail(em));
      
      const p = await fetchProfile(user?.id);
      setDisplayName(p?.full_name?.trim() || "");

      if (em && !isSuperAdminEmail(em)) {
        setLoadingResults(true);
        // Fetch attempts and join with test titles
        const { data: attempts } = await supabase
          .from("test_attempts")
          .select("*, online_tests(test_title, questions)")
          .eq("student_email", em)
          .order("created_at", { ascending: false });
        
        if (attempts) {
          const formatted = attempts.map(a => ({
            ...a,
            test_title: a.online_tests?.test_title || "Unknown Test",
            questions: a.online_tests?.questions || []
          }));
          setCompletedTests(formatted);
        }
        setLoadingResults(false);
      }
    };

    void loadData();
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

      {/* Completed Tests Section */}
      {!isAdmin && completedTests.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-success" />
            <h3 className="text-sm font-bold text-foreground">Completed Tests</h3>
          </div>
          <div className="space-y-3">
            {completedTests.map((attempt) => (
              <StudentScoreCard 
                key={attempt.id}
                testId={attempt.test_id}
                testTitle={attempt.test_title}
                score={attempt.score}
                total={attempt.total_questions}
                timeTaken={attempt.time_taken}
                date={attempt.created_at}
                questions={attempt.questions}
                answers={attempt.answers}
              />
            ))}
          </div>
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
