import { startOfWeek, addDays, isSameDay, format } from "date-fns";
import { getCategoryColor } from "@/lib/categoryColors";
import { useMouseShine } from "@/hooks/useMouseShine";

function ShineCard({ children, className = "" }) {
  const { ref, onMouseMove, onMouseLeave } = useMouseShine();
  return (
    <div ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className={`foxcard ${className}`}>
      {children}
    </div>
  );
}

export default function WeekView({ currentDate, events, onEventClick }) {
  const weekStart = startOfWeek(currentDate);
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (day) =>
    events.filter((e) => isSameDay(new Date(e.start_date), day));

  return (
    <ShineCard className="overflow-hidden rounded-xl">
      <div className="grid grid-cols-7 divide-x divide-border/40">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className="min-h-[300px]">
              <div className={`border-b border-border/60 p-2 text-center transition-colors ${isToday ? "bg-primary/10" : "hover:bg-white/[0.03]"}`}>
                <p className={`text-[10px] font-medium uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {format(day, "EEE")}
                </p>
                <p className={`mt-0.5 text-lg font-bold ${isToday ? "text-primary drop-shadow-[0_0_8px_rgba(130,80,255,0.6)]" : "text-foreground"}`}>
                  {format(day, "d")}
                </p>
              </div>
              <div className="space-y-1 p-1.5">
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="cursor-pointer rounded-md border-l-2 px-2 py-1.5 transition-all duration-150 hover:scale-[1.02] hover:shadow-md hover:brightness-110"
                    style={{ borderColor: getCategoryColor(ev.category).hex, background: getCategoryColor(ev.category).bg }}
                  >
                    <p className="truncate text-xs font-medium">{ev.title}</p>
                    {!ev.all_day && (
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(ev.start_date), "h:mm a")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ShineCard>
  );
}