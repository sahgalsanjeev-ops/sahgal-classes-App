import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Clock, ChevronRight, FileText } from "lucide-react";

interface StudentScoreCardProps {
  testId: string;
  testTitle: string;
  score: number;
  total: number;
  timeTaken: number;
  date: string;
  questions: any[];
  answers: Record<string, number>;
}

const StudentScoreCard: React.FC<StudentScoreCardProps> = ({
  testId,
  testTitle,
  score,
  total,
  timeTaken,
  date,
  questions,
  answers,
}) => {
  const navigate = useNavigate();
  const mins = Math.floor(timeTaken / 60);
  const secs = timeTaken % 60;
  const percentage = Math.round((score / total) * 100);

  const handleReview = () => {
    navigate(`/test-result/${testId}`, {
      state: {
        testTitle,
        answers,
        questions,
        score,
        total,
        timeTaken,
      },
    });
  };

  return (
    <Card className="border border-border shadow-sm bg-card overflow-hidden active:scale-[0.99] transition-transform">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-primary" />
              </div>
              <h4 className="text-sm font-bold text-foreground truncate">{testTitle}</h4>
            </div>
            
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                <Award size={12} className="text-success" />
                <span>Score: <span className="text-foreground font-bold">{score}/{total}</span></span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                <Clock size={12} className="text-primary" />
                <span>Time: <span className="text-foreground font-bold">{mins}m {secs}s</span></span>
              </div>
            </div>
            
            <p className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-tight">
              Completed on {new Date(date).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className={`text-lg font-black ${percentage >= 70 ? 'text-success' : percentage >= 40 ? 'text-warning' : 'text-destructive'}`}>
              {percentage}%
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 text-[11px] font-bold uppercase tracking-tight rounded-lg gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary"
              onClick={handleReview}
            >
              Review
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentScoreCard;
