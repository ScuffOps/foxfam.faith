import { Clock3 } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { getTimeEntryHours, TIME_ENTRY_CATEGORY_LABELS } from "@/lib/staffOps";

const CATEGORY_COLORS = {
  research: "bg-cyan-300",
  correspondence: "bg-fuchsia-300",
  editing: "bg-amber-300",
  discord: "bg-indigo-300",
  clerical: "bg-emerald-300",
  moderation: "bg-rose-300",
  stream_support: "bg-blue-300",
  planning: "bg-violet-300",
  other: "bg-slate-300",
};

export default function TimeCategoryChart({ entries = [] }) {
  const totals = Object.keys(TIME_ENTRY_CATEGORY_LABELS).map((category) => ({
    category,
    hours: entries
      .filter((entry) => (entry.category || "other") === category)
      .reduce((sum, entry) => sum + getTimeEntryHours(entry), 0),
  })).filter((item) => item.hours > 0).sort((a, b) => b.hours - a.hours);
  const maximum = Math.max(1, ...totals.map((item) => item.hours));

  return (
    <GlassCard>
      <div className="flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-primary" />
        <div>
          <h3 className="font-heading text-sm font-semibold">Hours by category</h3>
          <p className="text-xs text-muted-foreground">Where staff time is actually going.</p>
        </div>
      </div>
      {totals.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">Category totals appear after the first entry.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {totals.map((item) => (
            <div key={item.category}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span>{TIME_ENTRY_CATEGORY_LABELS[item.category]}</span>
                <strong>{item.hours.toFixed(1)}h</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                <div className={`h-full rounded-full ${CATEGORY_COLORS[item.category]}`} style={{ width: `${Math.max(4, (item.hours / maximum) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
