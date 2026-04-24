import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format, subDays, eachDayOfInterval, isSameDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import GlassCard from "../GlassCard";
import { TrendingUp } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function ActivityChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [blessings, posts] = await Promise.all([
          base44.entities.Blessing.list("-created_date", 200),
          base44.entities.CommunityPost.list("-created_date", 200),
        ]);

        const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });

        const chartData = days.map((day) => {
          const dayBlessings = blessings.filter((b) => isSameDay(new Date(b.created_date), day));
          const dayPosts = posts.filter((p) => isSameDay(new Date(p.created_date), day));

          const upvotes = dayBlessings.reduce((sum, b) => sum + (b.upvotes || 0), 0)
            + dayPosts.reduce((sum, p) => sum + (p.upvotes || 0), 0);

          return {
            date: format(day, "MMM d"),
            Upvotes: upvotes,
            Contributions: dayBlessings.length + dayPosts.length,
          };
        });

        // Show every 5th label to avoid crowding
        setData(chartData.map((d, i) => ({ ...d, _showLabel: i % 5 === 0 })));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const totalUpvotes = data.reduce((s, d) => s + d.Upvotes, 0);
  const totalContribs = data.reduce((s, d) => s + d.Contributions, 0);

  return (
    <GlassCard className="col-span-full">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold">Community Activity</h3>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="font-heading text-lg font-bold text-primary">{totalUpvotes}</p>
            <p className="text-xs text-muted-foreground">Total Upvotes</p>
          </div>
          <div>
            <p className="font-heading text-lg font-bold text-accent">{totalContribs}</p>
            <p className="text-xs text-muted-foreground">Contributions</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} barGap={2} barCategoryGap="30%">
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(220 12% 55%)" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(220 12% 55%)" }}
              tickLine={false}
              axisLine={false}
              width={24}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)", radius: 4 }} />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
            />
            <Bar dataKey="Upvotes" fill="hsl(258 75% 60%)" radius={[3, 3, 0, 0]} maxBarSize={16} />
            <Bar dataKey="Contributions" fill="hsl(200 85% 55%)" radius={[3, 3, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </GlassCard>
  );
}