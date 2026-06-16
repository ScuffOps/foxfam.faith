import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { communityClient } from "@/api/communityClient";
import { CalendarDays, Cake, Lightbulb, BarChart3 } from "lucide-react";
import GlassCard from "../GlassCard";

export default function QuickStats() {
  const [stats, setStats] = useState({ events: 0, birthdays: 0, ideas: 0, polls: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [events, birthdays, posts] = await Promise.all([
          communityClient.entities.Event.filter({ status: "active" }),
          communityClient.entities.Birthday.filter({ status: "approved" }),
          communityClient.entities.CommunityPost.filter({ status: "approved" }),
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
    { label: "Events", value: stats.events, icon: CalendarDays, color: "text-accent", href: "/events" },
    { label: "Birthdays", value: stats.birthdays, icon: Cake, color: "text-chart-5", href: "/birthdays" },
    { label: "Ideas", value: stats.ideas, icon: Lightbulb, color: "text-chart-4", href: "/feedback" },
    { label: "Polls", value: stats.polls, icon: BarChart3, color: "text-chart-2", href: "/polls" },
  ];

  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(11rem,100%),1fr))]">
      {items.map((item) => (
        <GlassCard key={item.label} className="dashboard-stat-card p-0">
          <Link to={item.href} className="flex h-full flex-col justify-center rounded-xl p-5 focus:outline-none focus:ring-2 focus:ring-primary/50">
          <div className={`dashboard-icon-well mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60 ${item.color}`}>
            <item.icon className="h-5 w-5" />
          </div>
          {loading ? (
            <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
          ) : (
            <p className="dashboard-stat-value font-heading text-3xl font-bold leading-none">{item.value}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
          </Link>
        </GlassCard>
      ))}
    </div>
  );
}
