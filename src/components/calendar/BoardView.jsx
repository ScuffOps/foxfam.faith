import { useMemo } from "react";
import { format, isPast, isToday } from "date-fns";

const COLUMNS = [
  { key: "personal",  label: "Personal",  color: "text-violet-400",  border: "border-violet-400/30", bg: "bg-violet-400/8"  },
  { key: "community", label: "Community", color: "text-cyan-400",    border: "border-cyan-400/30",   bg: "bg-cyan-400/8"    },
  { key: "collabs",   label: "Collabs",   color: "text-emerald-400", border: "border-emerald-400/30",bg: "bg-emerald-400/8" },
  { key: "birthdays", label: "Birthdays", color: "text-pink-400",    border: "border-pink-400/30",   bg: "bg-pink-400/8"    },
];

function EventCard({ event, onEventClick }) {
  const past = isPast(new Date(event.end_date || event.start_date)) && !isToday(new Date(event.start_date));
  const col = COLUMNS.find((c) => c.key === event.category) || COLUMNS[0];

  return (
    <div
      onClick={() => onEventClick?.(event)}
      className={`rounded-lg border p-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${col.border} ${col.bg} ${past ? "opacity-40" : ""}`}
    >
      <p className={`font-heading text-xs font-semibold leading-snug mb-1 ${col.color}`}>{event.title}</p>
      <p className="text-[11px] text-muted-foreground">
        {format(new Date(event.start_date), "MMM d")}
        {event.end_date && event.end_date !== event.start_date
          ? ` → ${format(new Date(event.end_date), "MMM d")}`
          : event.all_day ? "" : ` · ${format(new Date(event.start_date), "h:mm a")}`}
      </p>
      {event.location && (
        <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">📍 {event.location}</p>
      )}
      {isToday(new Date(event.start_date)) && (
        <span className={`mt-1.5 inline-block text-[9px] font-heading font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${col.bg} ${col.color}`}>
          Today
        </span>
      )}
    </div>
  );
}

export default function BoardView({ events, onEventClick }) {
  const sorted = useMemo(() =>
    [...events].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
    [events]
  );

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const colEvents = sorted.filter((e) => e.category === col.key);
        return (
          <div key={col.key} className="flex flex-col gap-3">
            {/* Column header */}
            <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${col.border} ${col.bg}`}>
              <span className={`font-heading text-xs font-bold tracking-wider uppercase ${col.color}`}>
                {col.label}
              </span>
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${col.bg} ${col.color} border ${col.border}`}>
                {colEvents.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {colEvents.length === 0 ? (
                <div className={`rounded-lg border border-dashed ${col.border} px-3 py-6 text-center`}>
                  <p className="text-[11px] text-muted-foreground/40">No events</p>
                </div>
              ) : (
                colEvents.map((ev) => (
                  <EventCard key={ev.id} event={ev} onEventClick={onEventClick} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}