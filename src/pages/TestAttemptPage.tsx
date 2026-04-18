import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { OnlineTestRow, QuestionForAttempt } from "@/lib/onlineTests";
import { rowToAttemptQuestions, scoreAnswers } from "@/lib/onlineTests";
import { KaTeXText, OPTION_LETTERS } from "@/components/KaTeXText";
import { toast } from "sonner";

const TestAttemptPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionForAttempt[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);

  const startedAtRef = useRef<number | null>(null);
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);
  const testTitleRef = useRef(testTitle);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);
  useEffect(() => {
    testTitleRef.current = testTitle;
  }, [testTitle]);

  useEffect(() => {
    if (!testId || !isSupabaseConfigured || !supabase) {
      setLoadError(!testId ? "Invalid test." : "Supabase is not configured.");
      setLoading(false);
      return;
    }

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;

      if (email) {
        const { data: attempt } = await supabase
          .from("test_attempts")
          .select("id")
          .eq("test_id", testId)
          .eq("student_email", email)
          .maybeSingle();

        if (attempt) {
          setLoadError("You have already attempted this test.");
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.from("online_tests").select("*").eq("id", testId).maybeSingle();

      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }
      if (!data) {
        setLoadError("Test not found.");
        setLoading(false);
        return;
      }

      const row = data as OnlineTestRow;
      const qs = rowToAttemptQuestions(row);
      if (qs.length === 0) {
        setLoadError("This test has no questions.");
        setLoading(false);
        return;
      }

      setTestTitle(row.test_title);
      setQuestions(qs);

      // Timer Logic with Persistence
      const durationMins = Math.max(1, Number(row.duration_minutes) || 30);
      const storageKey = `test_start_${testId}`;
      let startTime = parseInt(localStorage.getItem(storageKey) || "0", 10);
      
      if (!startTime) {
        startTime = Date.now();
        localStorage.setItem(storageKey, startTime.toString());
      }
      
      startedAtRef.current = startTime;
      const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, durationMins * 60 - elapsedSecs);
      
      if (remaining === 0) {
        setLoadError("This test session has already expired.");
        setLoading(false);
        return;
      }

      setTimeLeft(remaining);
      setLoading(false);
    };

    void run();
  }, [testId]);

  const goToResult = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    setIsSubmitting(true);

    const qs = questionsRef.current;
    const ans = answersRef.current;
    const title = testTitleRef.current;
    const { score, total } = scoreAnswers(qs, ans);
    const elapsedSec =
      startedAtRef.current != null ? Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)) : 0;

    try {
      // Save to test_attempts
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;

      if (email) {
        const { error: saveErr } = await supabase.from("test_attempts").insert({
          test_id: testId,
          student_email: email,
          score,
          total_questions: total,
          answers: ans,
          time_taken: elapsedSec,
        });

        if (saveErr) {
          console.error("Error saving test attempt:", saveErr);
          toast.error("Failed to save your result. Please contact support.");
        }
      }

      // Clear timer from localStorage
      localStorage.removeItem(`test_start_${testId}`);

      navigate(`/test-result/${testId}`, {
        state: {
          testTitle: title,
          answers: ans,
          questions: qs,
          score,
          total,
          timeTaken: elapsedSec,
        },
        replace: true // Prevent going back to the test
      });
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  }, [navigate, testId]);

  useEffect(() => {
    if (loading || submitted || questions.length === 0) return;

    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          // Trigger auto-submit immediately when timer reaches 0
          void goToResult();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [loading, submitted, questions.length, goToResult]);

  const q = questions[current];
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4 text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p>Loading test…</p>
        </div>
      </div>
    );
  }

  if (loadError || !q) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-sm text-center text-destructive">{loadError ?? "Unable to load test."}</p>
        <Button variant="outline" onClick={() => navigate("/tests")}>
          Back to tests
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-4">
      <div className="bg-primary px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={() => navigate(-1)} className="shrink-0" disabled={isSubmitting}>
              <ArrowLeft size={20} className="text-primary-foreground" />
            </button>
            <h2 className="text-sm font-bold text-primary-foreground truncate">{testTitle}</h2>
          </div>
          <div className="flex items-center gap-1.5 bg-primary-foreground/20 rounded-lg px-3 py-1.5 shrink-0">
            <Clock size={14} className="text-primary-foreground" />
            <span className="text-sm font-bold text-primary-foreground font-mono tabular-nums">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-primary-foreground/80 mt-1">
          Question {current + 1}/{questions.length}
        </p>
        <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
          {questions.map((_, i) => (
            <button
              key={questions[i].id}
              type="button"
              disabled={isSubmitting}
              onClick={() => setCurrent(i)}
              className={`w-7 h-7 rounded-lg text-[11px] font-bold flex-shrink-0 flex items-center justify-center transition-all ${
                i === current
                  ? "bg-primary-foreground text-primary"
                  : answers[questions[i].id] !== undefined
                    ? "bg-primary-foreground/30 text-primary-foreground"
                    : "bg-primary-foreground/10 text-primary-foreground/60"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-5">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {q.image_url ? (
            <div className="mb-4 rounded-xl border border-border bg-card overflow-hidden">
              <img src={q.image_url} alt="" className="w-full max-h-[min(50vh,320px)] object-contain bg-muted/30" />
            </div>
          ) : null}
          {q.text.trim() ? (
            <div className="mb-5">
              <KaTeXText text={q.text} className="font-semibold" />
            </div>
          ) : null}
          {!q.text.trim() && !q.image_url ? (
            <p className="text-sm text-muted-foreground mb-5">No question text</p>
          ) : null}

          <RadioGroup
            value={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
            onValueChange={(val) => !isSubmitting && setAnswers((prev) => ({ ...prev, [q.id]: parseInt(val, 10) }))}
            className="space-y-3"
            disabled={isSubmitting}
          >
            {q.options.map((opt, i) => (
              <label
                key={i}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  answers[q.id] === i ? "border-primary bg-secondary" : "border-border bg-card"
                } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <RadioGroupItem value={String(i)} id={`${q.id}-${i}`} className="mt-1 shrink-0" disabled={isSubmitting} />
                <div className="flex flex-1 items-start gap-2 min-w-0">
                  <span className="text-lg font-bold text-primary tabular-nums shrink-0">{OPTION_LETTERS[i]}.</span>
                  <div className="min-w-0 flex-1 text-sm">
                    {opt.trim() ? <KaTeXText text={opt} /> : <span className="text-base font-semibold text-foreground">{OPTION_LETTERS[i]}</span>}
                  </div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </motion.div>
      </div>

      <div className="p-4 bg-card border-t border-border flex items-center gap-3 mt-auto">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0 || isSubmitting}
          className="h-12 rounded-xl flex-1"
        >
          <ChevronLeft size={18} /> Previous
        </Button>
        {current < questions.length - 1 ? (
          <Button 
            type="button" 
            onClick={() => setCurrent((c) => c + 1)} 
            disabled={isSubmitting}
            className="h-12 rounded-xl flex-1"
          >
            Next <ChevronRight size={18} />
          </Button>
        ) : (
          <Button 
            type="button" 
            onClick={goToResult} 
            disabled={isSubmitting}
            className="h-12 rounded-xl flex-1 bg-destructive hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Flag size={16} className="mr-2" />
            )}
            {isSubmitting ? "Submitting..." : "Submit test"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TestAttemptPage;
