import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Cake, PartyPopper } from "lucide-react";
import GlassCard from "../GlassCard";

function getBirthdayParts(dateValue) {
  const [year, month, day] = String(dateValue || "").split("T")[0].split("-").map(Number);
  if (!month || !day) return null;
  return { year: year || 2000, month: month - 1, day };
}

function formatBirthday(dateValue) {
  const parts = getBirthdayParts(dateValue);
  if (!parts) return "";
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export default function TodaysBirthdays() {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await base44.entities.Birthday.filter({ status: "approved" });
        const today = new Date();
        const todayMonth = today.getMonth();
        const thisMonthsBirthdays = all
          .map((birthday) => ({ ...birthday, birthdayParts: getBirthdayParts(birthday.birthday_date) }))
          .filter((birthday) => birthday.birthdayParts?.month === todayMonth)
          .sort((a, b) => a.birthdayParts.day - b.birthdayParts.day);
        setBirthdays(thisMonthsBirthdays);
      } catch {
        setBirthdays([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <GlassCard className="h-full">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/15">
          <Cake className="h-4 w-4 text-chart-5" />
        </div>
        <h3 className="font-heading text-sm font-semibold">Upcoming Birthdays</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : birthdays.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No birthdays this month</p>
      ) : (
        <div className="space-y-2.5">
          {birthdays.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
              <PartyPopper className="h-4 w-4 text-chart-5" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {formatBirthday(b.birthday_date)} / {b.display_name}
                </p>
                {b.note && <p className="text-xs text-muted-foreground">{b.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
