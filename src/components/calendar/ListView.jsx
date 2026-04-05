import { format, isAfter, isBefore, addMonths } from "date-fns";
import CategoryBadge from "../CategoryBadge";
import { Clock, MapPin } from "lucide-react";

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
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([dateKey, dayEvents]) => (
        <div key={dateKey} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-secondary/30 px-4 py-2.5">
            <p className="text-sm font-semibold">
              {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="divide-y divide-border">
            {dayEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className="flex cursor-pointer items-start gap-4 px-4 py-3 transition-colors hover:bg-secondary/30"
              >
                <div className="flex-1">
                  <p className="font-medium">{ev.title}</p>
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
        </div>
      ))}
    </div>
  );
}