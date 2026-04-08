import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { RequireCompleteStudentProfile } from "@/components/auth/RequireCompleteStudentProfile";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import GlobalWatermark from "@/components/GlobalWatermark";
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
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Disable keyboard shortcuts (F12, Ctrl+Shift+I, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U') ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        toast({
          variant: "destructive",
          title: "Security Warning",
          description: "Screenshots are not allowed for security reasons.",
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        document.body.style.filter = 'blur(15px)';
      } else {
        document.body.style.filter = 'none';
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [toast]); // Added toast to dependencies since it's used inside handleKeyDown

  useEffect(() => {
    if (!supabase) {
      setIsAuthenticated(false);
      setChecking(false);
      return;
    }

    const runCheck = async (retryCount = 0) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Super-admins bypass the one-device rule
          if (isSuperAdminEmail(session.user.email)) {
            setIsAuthenticated(true);
            setChecking(false);
            return;
          }

          const localSessionId = localStorage.getItem('last_session_id');
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('last_session_id')
            .eq('id', session.user.id)
            .maybeSingle(); 

          if (error) {
            console.error("Error fetching profile for session check:", error.message);
            setIsAuthenticated(true); // Don't kick them out on DB errors
            setChecking(false);
            return;
          }

          // Case 1: Database has a session ID, but it doesn't match ours
          // This could be a new login elsewhere OR a race condition during current login
          if (profile?.last_session_id && profile.last_session_id !== localSessionId) {
            // Handle race condition: during a fresh login, runCheck might run BEFORE LoginPage.tsx 
            // finishes updating the database or even setting localStorage.
            if (retryCount < 3) {
              setTimeout(() => void runCheck(retryCount + 1), 1000);
              return;
            }

            console.warn("Session ID mismatch. This device is not the active session. Logging out...");
            await supabase.auth.signOut();
            localStorage.removeItem('last_session_id');
            setIsAuthenticated(false);
          } 
          // Case 2: No session ID in DB yet, but we have a session. 
          // This is fine (new user or legacy).
          else {
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

    // Check on tab focus or wake up (moved session check here as well)
    const handleAuthVisibility = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        void runCheck();
      }
    };
    document.addEventListener('visibilitychange', handleAuthVisibility);

    // Fallback heartbeat check (every 1 minute)
    const heartbeat = setInterval(() => {
      if (isAuthenticated) {
        void runCheck();
      }
    }, 60000);

    let profileSubscription: any = null;

    const setupSubscription = async (userId: string) => {
      if (profileSubscription) profileSubscription.unsubscribe();

      // Ensure the channel name is truly unique to this user
      profileSubscription = supabase
        .channel(`session_monitor_${userId}`)
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
            
            // Log if session ID changed on another device
            if (newSessionId && newSessionId !== localSessionId) {
              console.warn("New session detected elsewhere. Logging out this device...");
              void supabase.auth.signOut().then(() => {
                localStorage.removeItem('last_session_id');
                setIsAuthenticated(false);
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log("Realtime session monitor active for user:", userId);
          } else if (status === 'CLOSED') {
            console.warn("Realtime session monitor closed.");
          } else if (status === 'CHANNEL_ERROR') {
            console.error("Realtime session monitor failed to initialize.");
          }
        });
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
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleAuthVisibility);
      if (profileSubscription) profileSubscription.unsubscribe();
    };
  }, [isAuthenticated]); // Added isAuthenticated to dependencies for visibility check logic

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
        <div className="max-w-lg mx-auto bg-background min-h-screen relative shadow-xl overflow-hidden">
          <GlobalWatermark />
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
