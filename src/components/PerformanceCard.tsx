import { CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";

interface PerformanceCardProps {
  type: "homework" | "attendance" | "video" | "test" | "syllabus";
  title: string;
  done: number;
  total: number;
  unit?: string;
}

const iconMap = {
  homework: CheckCircle2,
  attendance: Clock,
  video: TrendingUp,
  test: TrendingUp,
  syllabus: CheckCircle2,
};

const colorMap = {
  homework: "hsl(220, 80%, 48%)",
  attendance: "hsl(142, 70%, 45%)",
  video: "hsl(36, 100%, 50%)",
  test: "hsl(0, 85%, 55%)",
  syllabus: "hsl(280, 70%, 50%)",
};

const PerformanceCard = ({ type, title, done, total, unit = "" }: PerformanceCardProps) => {
  const Icon = iconMap[type];
  const color = colorMap[type];
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-2xl font-bold text-foreground">{done}</span>
          <span className="text-sm text-muted-foreground">/{total} {unit}</span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color + '15', color }}
        >
          {percentage}%
        </span>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default PerformanceCard;
