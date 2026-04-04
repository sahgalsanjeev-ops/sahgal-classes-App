import { ChevronRight, BookOpen, Users, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface CourseCardProps {
  id: string;
  title: string;
  subtitle: string;
  students: number;
  lessons: number;
  progress: number;
  color: string;
}

const CourseCard = ({ id, title, subtitle, students, lessons, progress, color }: CourseCardProps) => {
  const navigate = useNavigate();
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/courses/${id}`)}
      className="w-full bg-card rounded-xl p-4 shadow-sm border border-border text-left active:bg-muted/30"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}22` }}
        >
          <BookOpen size={22} style={{ color }} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground leading-snug">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          <div className="flex items-center gap-4 mt-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users size={13} className="shrink-0 opacity-80" />
              <span>{students.toLocaleString()} students</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText size={13} className="shrink-0 opacity-80" />
              <span>{lessons} lessons</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{pct}% completed</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </motion.button>
  );
};

export default CourseCard;
