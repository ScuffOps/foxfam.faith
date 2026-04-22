import { format, isAfter, isBefore, addMonths } from "date-fns";
import CategoryBadge from "../CategoryBadge";
import { Clock, MapPin } from "lucide-react";
import { useMouseShine } from "@/hooks/useMouseShine";

function ShineCard({ children, className = "" }) {
  const { ref, onMouseMove, onMouseLeave } = useMouseShine();
  return (
    <div ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className={`foxcard rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export default function ListView({ events, onEventClick }) {
  const now = new Date();
  const limit = addMonths(now, 2);
  
  const filtered = events
    .filter((e) => {
      const d = new Date(e.start_date);
      return isAfter(d, now) || format(d, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
    })
    .filter((e) => isBefore(new Date(e.start_date), limit))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  // Group by date
  const groups = {};
  filtered.forEach((e) => {
    const key = format(new Date(e.start_date), "yyyy-MM-dd");
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  if (Object.keys(groups).length === 0) {
    return (
      <ShineCard className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No upcoming events</p>
      </ShineCard>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([dateKey, dayEvents]) => (
        <ShineCard key={dateKey}>
          <div className="border-b border-border/60 bg-white/[0.03] px-4 py-2.5">
            <p className="text-sm font-semibold">
              {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="divide-y divide-border/40">
            {dayEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className="group flex cursor-pointer items-start gap-4 px-4 py-3 transition-all duration-150 hover:bg-white/[0.04]"
              >
                <div className="flex-1">
                  <p className="font-medium transition-colors group-hover:text-primary">{ev.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <CategoryBadge category={ev.category} />
                    {!ev.all_day && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(ev.start_date), "h:mm a")}
                        {ev.end_date && ` - ${format(new Date(ev.end_date), "h:mm a")}`}
                      </span>
                    )}
                    {ev.location && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ShineCard>
      ))}
    </div>
  );
}