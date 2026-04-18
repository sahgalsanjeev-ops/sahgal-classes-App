import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { motion } from "framer-motion";
import { Clock, FileText, ChevronRight, CheckCircle2, Trophy, ArrowRight, Loader2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { OnlineTestRow } from "@/lib/onlineTests";
import { isGlobalOnlineTest } from "@/lib/onlineTests";
import StudentScoreCard from "@/components/profile/StudentScoreCard";

const TestPortalPage = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<OnlineTestRow[]>([]);
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;

    const [testsRes, attemptsRes] = await Promise.all([
      supabase
        .from("online_tests")
        .select("*")
        .order("created_at", { ascending: false }),
      email
        ? supabase
            .from("test_attempts")
            .select("*")
            .eq("student_email", email)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (testsRes.error) {
      console.error("Full Online Tests Error:", testsRes.error);
      setError(`Fetch failed: ${testsRes.error.message} (Code: ${testsRes.error.code}). Check if columns 'duration_minutes', 'questions', 'batch_code' exist.`);
      setLoading(false);
      return;
    }

    const rows = (testsRes.data ?? []) as OnlineTestRow[];
    const globalTests = rows.filter(isGlobalOnlineTest);
    setTests(globalTests);

    if (attemptsRes.data) {
      const attemptedIds = new Set(attemptsRes.data.map((a: { test_id: string }) => a.test_id));
      setAttempts(attemptedIds);

      // Map attempts to their test data for the completed section
      const completed = attemptsRes.data.map(attempt => {
        const testData = rows.find(t => t.id === attempt.test_id);
        return {
          ...attempt,
          test_title: testData?.test_title || "Unknown Test",
          questions: testData?.questions || []
        };
      });
      setCompletedTests(completed);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen pb-20 bg-background">
      <AppHeader />
      <div className="px-4 mt-4 space-y-6">
        {/* Available Tests Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-foreground uppercase tracking-tight">Available Tests</h2>
            {!loading && <span className="text-[10px] font-bold text-muted-foreground uppercase">{tests.length} Total</span>}
          </div>
          
          {loading && (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="animate-spin text-primary" size={16} />
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Loading tests…</p>
            </div>
          )}
          
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          {!loading && !error && tests.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase">No tests available</p>
            </div>
          )}

          <div className="space-y-3">
            {tests.map((test, i) => {
              const qCount = Array.isArray(test.questions) ? test.questions.length : 0;
              const duration = Math.max(1, Number(test.duration_minutes) || 30);
              const isAttempted = attempts.has(test.id);

              if (isAttempted) return null; // Only show unattempted tests in this section

              return (
                <motion.button
                  key={test.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/test/${test.id}`)}
                  className="w-full bg-card rounded-xl p-4 border border-border shadow-sm text-left hover:border-primary/30 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <FileText size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{test.test_title}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1 uppercase tracking-tight">
                          <FileText size={11} className="text-primary" /> {qCount} Qs
                        </span>
                        <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1 uppercase tracking-tight">
                          <Clock size={11} className="text-primary" /> {duration} min
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Completed Tests Section */}
        {completedTests.length > 0 && (
          <section className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-success" />
              <h2 className="text-sm font-black text-foreground uppercase tracking-tight">Completed Tests</h2>
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
          </section>
        )}
      </div>
    </div>
  );
};

export default TestPortalPage;
