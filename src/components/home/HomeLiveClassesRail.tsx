import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, ExternalLink, Radio } from "lucide-react";
import { fetchUpcomingLiveClasses, type LiveClassRow } from "@/lib/homeContent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HomeLiveClassesRail = () => {
  const [rows, setRows] = useState<LiveClassRow[]>([]);

  useEffect(() => {
    void fetchUpcomingLiveClasses(30).then(setRows);
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="px-4 mt-5">
      <div className="flex items-center gap-2 mb-3">
        <Radio size={16} className="text-primary shrink-0" />
        <h2 className="text-base font-bold text-foreground">Ongoing &amp; upcoming live classes</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1">
        {rows.map((r) => {
          const start = new Date(r.starts_at);
          const isSoon = start.getTime() - Date.now() < 48 * 60 * 60 * 1000 && start.getTime() > Date.now();
          return (
            <div
              key={r.id}
              className={cn(
                "min-w-[260px] max-w-[280px] snap-start rounded-xl border bg-card p-3 shadow-sm shrink-0",
                isSoon ? "border-primary/40 ring-1 ring-primary/15" : "border-border",
              )}
            >
              <p className="text-sm font-semibold text-foreground leading-snug">{r.title}</p>
              {r.description ? (
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
              ) : null}
              <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-medium">
                <CalendarClock size={14} />
                <span>{format(start, "EEE dd MMM, h:mm a")}</span>
              </div>
              {r.meeting_url ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 gap-1 h-9 border-primary/30 text-primary"
                  onClick={() => window.open(r.meeting_url!, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink size={14} /> Join / Details
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HomeLiveClassesRail;
