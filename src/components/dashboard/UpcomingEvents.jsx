import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Clock } from "lucide-react";
import { format, isAfter } from "date-fns";
import GlassCard from "../GlassCard";
import CategoryBadge from "../CategoryBadge";

export default function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await base44.entities.Event.filter({ status: "active" }, "-start_date", 50);
        const now = new Date();
        const upcoming = all
          .filter((e) => isAfter(new Date(e.start_date), now))
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
          .slice(0, 5);
        setEvents(upcoming);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <GlassCard className="h-full">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
          <CalendarDays className="h-4 w-4 text-accent" />
        </div>
        <h3 className="font-heading text-sm font-semibold">Upcoming Events</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : events.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No upcoming events</p>
      ) : (
        <div className="space-y-2.5">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                <span className="text-[10px] font-medium uppercase leading-none">
                  {format(new Date(e.start_date), "MMM")}
                </span>
                <span className="text-sm font-bold leading-none">
                  {format(new Date(e.start_date), "d")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <CategoryBadge category={e.category} />
                  {!e.all_day && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(e.start_date), "h:mm a")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}