import { useMemo } from "react";
import { format, isPast, isToday } from "date-fns";
import { EVENT_CATEGORY_OPTIONS, getCategoryColor } from "@/lib/categoryColors";

const COLUMNS = EVENT_CATEGORY_OPTIONS;

function EventCard({ event, onEventClick }) {
  const past = isPast(new Date(event.end_date || event.start_date)) && !isToday(new Date(event.start_date));
  const col = COLUMNS.find((c) => c.key === event.category) || COLUMNS[0];
  const color = getCategoryColor(col.key);

  return (
    <div
      onClick={() => onEventClick?.(event)}
      className={`cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${past ? "opacity-40" : ""}`}
      style={{ background: color.bg, borderColor: `${color.hex}66` }}
    >
      <p className="mb-1 font-heading text-xs font-semibold leading-snug" style={{ color: color.hex }}>{event.title}</p>
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
        <span
          className="mt-1.5 inline-block rounded px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase tracking-widest"
          style={{ background: color.bg, color: color.hex }}
        >
          Today
        </span>
      )}
    </div>
  );
}

export default function BoardView({ events, onEventClick }) {
  const safeEvents = Array.isArray(events) ? events : [];
  const sorted = useMemo(() =>
    [...safeEvents].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
    [safeEvents]
  );

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const colEvents = sorted.filter((e) => e.category === col.key);
        const color = getCategoryColor(col.key);
        return (
          <div key={col.key} className="flex flex-col gap-3">
            {/* Column header */}
            <div className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ background: color.bg, borderColor: `${color.hex}66` }}>
              <span className="font-heading text-xs font-bold uppercase tracking-wider" style={{ color: color.hex }}>
                {col.label}
              </span>
              <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-bold" style={{ background: color.bg, borderColor: `${color.hex}66`, color: color.hex }}>
                {colEvents.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {colEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed px-3 py-6 text-center" style={{ borderColor: `${color.hex}4d` }}>
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
