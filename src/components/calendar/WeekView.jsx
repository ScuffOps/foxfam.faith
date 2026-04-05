import { startOfWeek, addDays, isSameDay, format } from "date-fns";

const categoryColors = {
  personal: "border-chart-1 bg-chart-1/10",
  community: "border-chart-2 bg-chart-2/10",
  collabs: "border-chart-4 bg-chart-4/10",
  birthdays: "border-chart-5 bg-chart-5/10",
};

export default function WeekView({ currentDate, events, onEventClick }) {
  const weekStart = startOfWeek(currentDate);
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (day) =>
    events.filter((e) => isSameDay(new Date(e.start_date), day));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 divide-x divide-border">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className="min-h-[300px]">
              <div className={`border-b border-border p-2 text-center ${isToday ? "bg-primary/10" : ""}`}>
                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                  {format(day, "EEE")}
                </p>
                <p className={`mt-0.5 text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                  {format(day, "d")}
                </p>
              </div>
              <div className="space-y-1 p-1.5">
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className={`cursor-pointer rounded-md border-l-2 px-2 py-1.5 transition-colors hover:opacity-80 ${categoryColors[ev.category] || "border-primary bg-primary/10"}`}
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
    </div>
  );
}