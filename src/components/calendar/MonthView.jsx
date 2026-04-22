import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, format } from "date-fns";
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

export default function MonthView({ currentDate, events, onDateClick, onEventClick }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const today = new Date();

  const days = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const getEventsForDay = (day) =>
    events.filter((e) => isSameDay(new Date(e.start_date), day));

  return (
    <ShineCard className="overflow-hidden rounded-xl">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border/60">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-2.5 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, currentDate);
          return (
            <div
              key={i}
              onClick={() => onDateClick(day)}
              className={`group min-h-[80px] cursor-pointer border-b border-r border-border/40 p-1.5 transition-all duration-200 hover:bg-white/[0.04] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] md:min-h-[100px] md:p-2 ${
                !inMonth ? "opacity-25" : ""
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isToday
                    ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(130,80,255,0.5)]"
                    : "text-foreground group-hover:text-primary"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className="flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all duration-150 hover:scale-[1.02] hover:shadow-sm md:text-xs"
                    style={{
                      background: getCategoryColor(ev.category).bg,
                      borderLeft: `2px solid ${getCategoryColor(ev.category).hex}`,
                    }}
                  >
                    <span className="truncate">{ev.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="block px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ShineCard>
  );
}