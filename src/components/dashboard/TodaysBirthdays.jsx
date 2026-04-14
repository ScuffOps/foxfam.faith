import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Cake, PartyPopper } from "lucide-react";
import GlassCard from "../GlassCard";

export default function TodaysBirthdays() {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await base44.entities.Birthday.filter({ status: "approved" });
        const today = new Date();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        const todays = all.filter((b) => {
          const d = new Date(b.birthday_date);
          return d.getMonth() === todayMonth && d.getDate() === todayDay;
        });
        setBirthdays(todays);
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
        <h3 className="font-heading text-sm font-semibold">Today's Birthdays</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : birthdays.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No birthdays today</p>
      ) : (
        <div className="space-y-2.5">
          {birthdays.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
              <PartyPopper className="h-4 w-4 text-chart-5" />
              <div>
                <p className="text-sm font-medium">{b.display_name}</p>
                {b.note && <p className="text-xs text-muted-foreground">{b.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}