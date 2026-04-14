import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Cake, Lightbulb, BarChart3 } from "lucide-react";
import GlassCard from "../GlassCard";

export default function QuickStats() {
  const [stats, setStats] = useState({ events: 0, birthdays: 0, ideas: 0, polls: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [events, birthdays, posts] = await Promise.all([
          base44.entities.Event.filter({ status: "active" }),
          base44.entities.Birthday.filter({ status: "approved" }),
          base44.entities.CommunityPost.filter({ status: "approved" }),
        ]);
        setStats({
          events: events.length,
          birthdays: birthdays.length,
          ideas: posts.filter((p) => p.type === "idea").length,
          polls: posts.filter((p) => p.type === "poll").length,
        });
      } catch {
        // silently fail, keep default zeros
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const items = [
    { label: "Events", value: stats.events, icon: CalendarDays, color: "text-accent" },
    { label: "Birthdays", value: stats.birthdays, icon: Cake, color: "text-chart-5" },
    { label: "Ideas", value: stats.ideas, icon: Lightbulb, color: "text-chart-4" },
    { label: "Polls", value: stats.polls, icon: BarChart3, color: "text-chart-2" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <GlassCard key={item.label} className="text-center">
          <item.icon className={`mx-auto mb-2 h-5 w-5 ${item.color}`} />
          {loading ? (
            <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
          ) : (
            <p className="font-heading text-2xl font-bold">{item.value}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
        </GlassCard>
      ))}
    </div>
  );
}