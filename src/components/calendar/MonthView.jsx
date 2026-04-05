import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, format } from "date-fns";

const categoryDots = {
  personal: "bg-chart-1",
  community: "bg-chart-2",
  collabs: "bg-chart-4",
  birthdays: "bg-chart-5",
};

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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
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
              className={`group min-h-[80px] cursor-pointer border-b border-r border-border p-1.5 transition-colors hover:bg-secondary/50 md:min-h-[100px] md:p-2 ${
                !inMonth ? "opacity-30" : ""
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium hover:bg-primary/10 md:text-xs"
                  >
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${categoryDots[ev.category] || "bg-primary"}`} />
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
    </div>
  );
}