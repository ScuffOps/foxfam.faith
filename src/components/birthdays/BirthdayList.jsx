import { format, differenceInDays, setYear } from "date-fns";
import { Cake, Check, X } from "lucide-react";

function getDaysUntil(birthday_date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bday = new Date(birthday_date + "T00:00:00");
  let next = setYear(bday, today.getFullYear());
  if (next < today) next = setYear(bday, today.getFullYear() + 1);
  return differenceInDays(next, today);
}

const AVATAR_COLORS = [
  "from-chart-1/40 to-chart-1/10",
  "from-chart-2/40 to-chart-2/10",
  "from-chart-3/40 to-chart-3/10",
  "from-chart-4/40 to-chart-4/10",
  "from-chart-5/40 to-chart-5/10",
];

export default function BirthdayList({ birthdays, isAdmin, onApprove, onReject }) {
  if (birthdays.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Cake className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No birthdays to show</p>
      </div>
    );
  }

  const approved = birthdays.filter((b) => b.status === "approved");
  const pending = birthdays.filter((b) => b.status !== "approved");

  return (
    <div className="space-y-6">
      {/* Bento grid for approved */}
      {approved.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {approved.map((b, i) => {
            const daysUntil = getDaysUntil(b.birthday_date);
            const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const initials = b.display_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            const isToday = daysUntil === 0;
            const isSoon = daysUntil <= 7;
            return (
              <div
                key={b.id}
                className={`relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all ${
                  isToday
                    ? "border-chart-5/50 bg-chart-5/10 shadow-lg shadow-chart-5/10"
                    : isSoon
                    ? "border-chart-4/30 bg-chart-4/5"
                    : "border-border bg-card"
                }`}
              >
                {isToday && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-chart-5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    🎂 Today!
                  </span>
                )}
                <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${colorClass} text-lg font-bold text-foreground border border-border`}>
                  {initials}
                </div>
                <p className="font-heading font-semibold text-sm leading-tight mb-1">{b.display_name}</p>
                <p className="text-[10px] text-muted-foreground mb-2">
                  {format(new Date(b.birthday_date + "T00:00:00"), "MMM d")}
                </p>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                  isToday ? "bg-chart-5/20 text-chart-5" :
                  isSoon ? "bg-chart-4/15 text-chart-4" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {isToday ? "🎉 Today!" : daysUntil === 1 ? "❝ tomorrow ❞" : `❝ in ${daysUntil} days ❞`}
                </span>
                {b.note && <p className="mt-2 text-[10px] text-muted-foreground/70 italic line-clamp-2">{b.note}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending list for admins */}
      {isAdmin && pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pending Review</p>
          <div className="space-y-2">
            {pending.map((b) => (
              <div key={b.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-chart-5/10 text-chart-5">
                  <span className="text-[10px] font-medium uppercase leading-none">
                    {format(new Date(b.birthday_date + "T00:00:00"), "MMM")}
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {format(new Date(b.birthday_date + "T00:00:00"), "d")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{b.display_name}</p>
                  <p className="text-xs text-muted-foreground">by {b.submitted_by_name || "Anonymous"}{b.note && ` · "${b.note}"`}</p>
                </div>
                {b.status === "pending" && (
                  <div className="flex gap-1.5">
                    <button className="rounded-lg border border-success/30 bg-success/10 p-1.5 text-success hover:bg-success/20 transition-colors" onClick={() => onApprove(b.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button className="rounded-lg border border-destructive/30 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 transition-colors" onClick={() => onReject(b.id)}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}