import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { RequireCompleteStudentProfile } from "@/components/auth/RequireCompleteStudentProfile";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import CoursesPage from "./pages/CoursesPage";
import CourseProgramPage from "./pages/CourseProgramPage";
import CourseChapterPage from "./pages/CourseChapterPage";
import DoubtsPage from "./pages/DoubtsPage";
import ProfilePage from "./pages/ProfilePage";
import VideoPage from "./pages/VideoPage";
import NotesPage from "./pages/NotesPage";
import TestPortalPage from "./pages/TestPortalPage";
import TestAttemptPage from "./pages/TestAttemptPage";
import TestResultPage from "./pages/TestResultPage";
import AdminPage from "./pages/AdminPage";
import AdminStudentDetailPage from "./pages/AdminStudentDetailPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import AboutPage from "./pages/AboutPage";
import MyBatchPage from "./pages/MyBatchPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import OnboardingPage from "./pages/OnboardingPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import HomeworkPage from "./pages/HomeworkPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsAuthenticated(false);
      setChecking(false);
      return;
    }

    const runCheck = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Super-admins bypass the one-device rule
          if (isSuperAdminEmail(session.user.email)) {
            setIsAuthenticated(true);
            return;
          }

          // One Device Login Check
          const localSessionId = localStorage.getItem('last_session_id');
          const { data: profile } = await supabase
            .from('profiles')
            .select('last_session_id')
            .eq('id', session.user.id)
            .maybeSingle(); 

          // Only sign out if BOTH are present and different.
          if (localSessionId && profile?.last_session_id && profile.last_session_id !== localSessionId) {
            console.warn("New login detected on another device. Logging out...");
            await supabase.auth.signOut();
            localStorage.removeItem('last_session_id');
            setIsAuthenticated(false);
          } else {
            setIsAuthenticated(true);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setIsAuthenticated(false);
      } finally {
        setChecking(false); 
      }
    };

    runCheck();

    let profileSubscription: any = null;

    const setupSubscription = async (userId: string) => {
      if (profileSubscription) profileSubscription.unsubscribe();

      profileSubscription = supabase
        .channel(`public:profiles:id=eq.${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            const newSessionId = payload.new.last_session_id;
            const localSessionId = localStorage.getItem('last_session_id');
            
            if (newSessionId && localSessionId && newSessionId !== localSessionId) {
              console.warn("Session changed on another device. Logging out...");
              void supabase.auth.signOut();
              localStorage.removeItem('last_session_id');
              setIsAuthenticated(false);
            }
          }
        )
        .subscribe();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        void runCheck();
        if (!isSuperAdminEmail(session.user.email)) {
          void setupSubscription(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        localStorage.removeItem('last_session_id');
        if (profileSubscription) {
          profileSubscription.unsubscribe();
          profileSubscription = null;
        }
        setChecking(false);
      }
    });

    // Initial subscription setup if already logged in
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !isSuperAdminEmail(session.user.email)) {
        void setupSubscription(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) profileSubscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};



/** Logged-in app areas that require students to finish onboarding (super-admins bypass). */
const StudentAppRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <RequireCompleteStudentProfile>{children}</RequireCompleteStudentProfile>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="max-w-lg mx-auto bg-background min-h-screen relative shadow-xl">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<StudentAppRoute><HomePage /></StudentAppRoute>} />
            <Route path="/index" element={<StudentAppRoute><HomePage /></StudentAppRoute>} />
            <Route path="/courses/:courseId/chapter/:chapterId" element={<StudentAppRoute><CourseChapterPage /></StudentAppRoute>} />
            <Route path="/courses/:courseId" element={<StudentAppRoute><CourseProgramPage /></StudentAppRoute>} />
            <Route path="/courses" element={<StudentAppRoute><CoursesPage /></StudentAppRoute>} />
            <Route path="/course/:id" element={<StudentAppRoute><Navigate to="/courses" replace /></StudentAppRoute>} />
            <Route path="/doubts" element={<StudentAppRoute><DoubtsPage /></StudentAppRoute>} />
            <Route path="/homework" element={<StudentAppRoute><HomeworkPage /></StudentAppRoute>} />
            <Route path="/profile" element={<StudentAppRoute><ProfilePage /></StudentAppRoute>} />
            <Route path="/video/:videoId" element={<StudentAppRoute><VideoPage /></StudentAppRoute>} />
            <Route path="/notes" element={<StudentAppRoute><NotesPage /></StudentAppRoute>} />
            <Route path="/tests" element={<StudentAppRoute><TestPortalPage /></StudentAppRoute>} />
            <Route path="/test/:testId" element={<StudentAppRoute><TestAttemptPage /></StudentAppRoute>} />
            <Route path="/test-result/:testId" element={<StudentAppRoute><TestResultPage /></StudentAppRoute>} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/student/:studentId"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminStudentDetailPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route path="/help" element={<StudentAppRoute><HelpSupportPage /></StudentAppRoute>} />
            <Route path="/about" element={<StudentAppRoute><AboutPage /></StudentAppRoute>} />
            <Route path="/my-batch" element={<StudentAppRoute><MyBatchPage /></StudentAppRoute>} />
            <Route path="/settings" element={<StudentAppRoute><SettingsPage /></StudentAppRoute>} />
            <Route path="/student-profile" element={<StudentAppRoute><StudentProfilePage /></StudentAppRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
