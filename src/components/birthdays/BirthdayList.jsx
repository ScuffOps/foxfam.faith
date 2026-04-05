import { format } from "date-fns";
import { Cake, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "../StatusBadge";
import GlassCard from "../GlassCard";

export default function BirthdayList({ birthdays, isAdmin, onApprove, onReject }) {
  if (birthdays.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Cake className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No birthdays to show</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {birthdays.map((b) => (
        <GlassCard key={b.id} className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-chart-5/10 text-chart-5">
            <span className="text-[10px] font-medium uppercase leading-none">
              {format(new Date(b.birthday_date + "T00:00:00"), "MMM")}
            </span>
            <span className="text-sm font-bold leading-none">
              {format(new Date(b.birthday_date + "T00:00:00"), "d")}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{b.display_name}</p>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted by {b.submitted_by_name || "Anonymous"}
              {b.note && ` · "${b.note}"`}
            </p>
          </div>
          {isAdmin && b.status === "pending" && (
            <div className="flex gap-1.5">
              <Button size="icon" variant="outline" className="h-8 w-8 text-success hover:bg-success/10" onClick={() => onApprove(b.id)}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onReject(b.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  );
}