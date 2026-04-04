import { BookOpen, ChevronRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { readContinueLearning } from "@/lib/catalog";
import { Button } from "@/components/ui/button";

const ContinueLearningCard = () => {
  const navigate = useNavigate();
  const p = readContinueLearning();

  if (!p) {
    return (
      <div className="px-4 mt-5">
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-background p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <BookOpen className="text-primary" size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-foreground">Continue learning</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Open any lecture from the Courses tab — we&apos;ll remember where you left off.
              </p>
              <Button type="button" size="sm" className="mt-3 w-full bg-primary gap-1" onClick={() => navigate("/courses")}>
                Browse courses <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mt-5">
      <div className="rounded-2xl border border-primary/30 bg-card p-4 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Play className="text-primary-foreground" size={20} fill="currentColor" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Continue learning</p>
            <h2 className="text-sm font-bold text-foreground mt-0.5 line-clamp-2">{p.lectureTitle}</h2>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">{p.courseTitle}</p>
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full bg-primary gap-1"
              onClick={() => navigate(`/courses/${p.courseId}/chapter/${p.chapterId}`)}
            >
              Resume <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinueLearningCard;
