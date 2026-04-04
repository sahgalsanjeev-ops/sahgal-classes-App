import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KaTeXText, OPTION_LETTERS } from "@/components/KaTeXText";
import type { QuestionForAttempt } from "@/lib/onlineTests";

const TestResultPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    testTitle = "",
    answers = {},
    questions = [],
    score = 0,
    total = 10,
    timeTaken = 0,
  } = (location.state as {
    testTitle?: string;
    answers?: Record<string, number>;
    questions?: QuestionForAttempt[];
    score?: number;
    total?: number;
    timeTaken?: number;
  }) || {};

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const attempted = Object.keys(answers).length;
  const unattempted = total - attempted;
  const incorrect = attempted - score;
  const mins = Math.floor(timeTaken / 60);
  const secs = timeTaken % 60;

  const getGrade = () => {
    if (percentage >= 90) return { label: "Excellent!", color: "hsl(var(--success))", emoji: "🏆" };
    if (percentage >= 70) return { label: "Good Job!", color: "hsl(var(--primary))", emoji: "👏" };
    if (percentage >= 50) return { label: "Keep Trying", color: "hsl(var(--accent))", emoji: "💪" };
    return { label: "Needs Improvement", color: "hsl(var(--destructive))", emoji: "📚" };
  };

  const grade = getGrade();

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <div className="bg-primary px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/tests")}>
            <ArrowLeft size={20} className="text-primary-foreground" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-primary-foreground">Test result</h2>
            {testTitle ? (
              <p className="text-[11px] text-primary-foreground/80 truncate mt-0.5">{testTitle}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Score Circle */}
      <div className="flex flex-col items-center py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center"
          style={{ borderColor: grade.color }}
        >
          <span className="text-3xl">{grade.emoji}</span>
          <span className="text-2xl font-extrabold text-foreground">{percentage}%</span>
        </motion.div>
        <p className="text-base font-bold mt-3" style={{ color: grade.color }}>{grade.label}</p>
        <p className="text-xs text-muted-foreground mt-1">Score: {score}/{total}</p>
      </div>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: CheckCircle2, label: "Correct", value: score, color: "hsl(var(--success))" },
          { icon: XCircle, label: "Incorrect", value: incorrect, color: "hsl(var(--destructive))" },
          { icon: Target, label: "Unattempted", value: unattempted, color: "hsl(var(--accent))" },
          { icon: Clock, label: "Time Taken", value: `${mins}m ${secs}s`, color: "hsl(var(--primary))" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-4 border border-border shadow-sm text-center">
            <stat.icon size={20} className="mx-auto mb-2" style={{ color: stat.color }} />
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Question-wise Analysis */}
      <div className="px-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Question-wise Analysis</h3>
        <div className="space-y-2">
          {questions.map((q) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correct;
            const isAttempted = userAnswer !== undefined;

            return (
              <div key={q.id} className="bg-card rounded-xl p-3 border border-border shadow-sm">
                <div className="flex items-start gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      !isAttempted ? "bg-muted" : isCorrect ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {!isAttempted ? (
                      <span className="text-[10px] font-bold text-muted-foreground">—</span>
                    ) : isCorrect ? (
                      <CheckCircle2 size={14} className="text-green-600" />
                    ) : (
                      <XCircle size={14} className="text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    {q.image_url ? (
                      <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                        <img src={q.image_url} alt="" className="w-full max-h-40 object-contain" />
                      </div>
                    ) : null}
                    {q.text.trim() ? (
                      <div className="text-xs font-medium text-foreground">
                        <KaTeXText text={q.text} />
                      </div>
                    ) : null}
                    <div className="space-y-0.5">
                      {!isAttempted && <p className="text-[11px] text-muted-foreground">Not attempted</p>}
                      {isAttempted && !isCorrect && (
                        <div className="text-[11px] text-destructive">
                          <span>Your answer: </span>
                          <span className="font-bold">{OPTION_LETTERS[userAnswer as number]}</span>
                          {q.options[userAnswer as number]?.trim() ? (
                            <span className="ml-1 inline align-middle">
                              <KaTeXText text={q.options[userAnswer as number]} className="inline text-[11px]" />
                            </span>
                          ) : null}
                        </div>
                      )}
                      <div className="text-[11px] text-green-600 font-medium">
                        <span>Correct: </span>
                        <span className="font-bold">{OPTION_LETTERS[q.correct]}</span>
                        {q.options[q.correct]?.trim() ? (
                          <span className="ml-1 inline align-middle font-normal">
                            <KaTeXText text={q.options[q.correct]} className="inline text-[11px] text-green-700" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 mt-6">
        <Button onClick={() => navigate("/tests")} className="w-full h-12 rounded-xl text-base font-semibold">
          Back to Tests
        </Button>
      </div>
    </div>
  );
};

export default TestResultPage;
