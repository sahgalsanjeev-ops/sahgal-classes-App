import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { motion } from "framer-motion";
import { Clock, FileText, ChevronRight, CheckCircle2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { OnlineTestRow } from "@/lib/onlineTests";
import { isGlobalOnlineTest } from "@/lib/onlineTests";

const TestPortalPage = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<OnlineTestRow[]>([]);
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
            .select("test_id")
            .eq("student_email", email)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (testsRes.error) {
      console.error("Full Online Tests Error:", testsRes.error);
      setError(`Fetch failed: ${testsRes.error.message} (Code: ${testsRes.error.code}). Check if columns 'duration_minutes', 'questions', 'batch_code' exist.`);
      setLoading(false);
      return;
    }

    const rows = (testsRes.data ?? []) as OnlineTestRow[];
    setTests(rows.filter(isGlobalOnlineTest));

    if (attemptsRes.data) {
      const attemptedIds = new Set(attemptsRes.data.map((a: { test_id: string }) => a.test_id));
      setAttempts(attemptedIds);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen pb-20 bg-background">
      <AppHeader />
      <div className="px-4 mt-4">
        <h2 className="text-base font-bold text-foreground mb-1">Online tests</h2>
        <p className="text-xs text-muted-foreground mb-4">Start a timed MCQ. Your score is shown right after you submit.</p>

        {loading && <p className="text-sm text-muted-foreground">Loading tests…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && tests.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No tests yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your teacher will publish tests from the admin panel.</p>
          </div>
        )}

        <div className="space-y-3">
          {tests.map((test, i) => {
            const qCount = Array.isArray(test.questions) ? test.questions.length : 0;
            const duration = Math.max(1, Number(test.duration_minutes) || 30);
            const isAttempted = attempts.has(test.id);

            return (
              <motion.button
                key={test.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={isAttempted ? undefined : { scale: 0.98 }}
                onClick={() => !isAttempted && navigate(`/test/${test.id}`)}
                className={`w-full rounded-xl p-4 border shadow-sm text-left transition-colors ${
                  isAttempted 
                    ? "bg-muted/30 border-border cursor-default opacity-80" 
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isAttempted ? "bg-secondary text-muted-foreground" : "bg-secondary text-primary"
                  }`}>
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold truncate ${
                      isAttempted ? "text-muted-foreground" : "text-foreground"
                    }`}>
                      {test.test_title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <FileText size={11} /> {qCount} Qs
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock size={11} /> {duration} min
                      </span>
                    </div>
                    {isAttempted && (
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-medium text-success">
                        <CheckCircle2 size={12} />
                        You have already attempted this test
                      </div>
                    )}
                  </div>
                  {!isAttempted && (
                    <ChevronRight size={18} className="text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TestPortalPage;
