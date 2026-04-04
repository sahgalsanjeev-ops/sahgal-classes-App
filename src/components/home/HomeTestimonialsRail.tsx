import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import { fetchActiveTestimonials, type TestimonialRow } from "@/lib/homeContent";

const HomeTestimonialsRail = () => {
  const [rows, setRows] = useState<TestimonialRow[]>([]);

  useEffect(() => {
    void fetchActiveTestimonials().then(setRows);
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="px-4 mt-6 mb-2">
      <div className="flex items-center gap-2 mb-3">
        <Quote size={16} className="text-primary shrink-0" />
        <h2 className="text-base font-bold text-foreground">Student success stories</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1">
        {rows.map((t) => (
          <article
            key={t.id}
            className="min-w-[260px] max-w-[300px] snap-start rounded-xl border border-border bg-card p-4 shadow-sm shrink-0 flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <img
                src={t.photo_url}
                alt=""
                className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Success story</p>
                {t.student_name ? <p className="text-sm font-semibold text-foreground truncate">{t.student_name}</p> : null}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">&ldquo;{t.feedback_text}&rdquo;</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default HomeTestimonialsRail;
