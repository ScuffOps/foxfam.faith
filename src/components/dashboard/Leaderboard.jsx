import { useState, useEffect } from "react";
import { communityClient } from "@/api/communityClient";
import { FAVORED_BADGE, FAVORED_DEFAULT_TITLE, getRank } from "@/hooks/usePoints";
import GlassCard from "../GlassCard";
import { Trophy } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityClient.entities.UserLevel.list("-points", 10)
      .then((data) => {
        setLeaders(data.filter((d) => d.points > 0));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <GlassCard>
      <div className="mb-4 flex items-center gap-2">
        <div className="dashboard-icon-well flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/15 text-chart-4">
          <Trophy className="h-4 w-4 text-chart-4" />
        </div>
        <h3 className="font-heading text-sm font-semibold">Community Leaderboard</h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : leaders.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No Favor yet. Go be lovingly perceived.</p>
      ) : (
        <div className="space-y-2">
          {leaders.map((l, i) => {
            const rank = getRank(l.points || 0);
            const isFavored = Boolean(l.is_favored);
            const rankColor = isFavored ? FAVORED_BADGE.color : rank.color;
            const rankIcon = isFavored ? FAVORED_BADGE.icon : rank.icon;
            const rankName = isFavored ? (l.favored_title || FAVORED_DEFAULT_TITLE) : rank.name;
            return (
              <div key={l.id} className="dashboard-list-row flex items-center gap-3 rounded-lg px-3 py-2">
                <span className="w-5 text-center text-sm">{MEDALS[i] || `#${i + 1}`}</span>

                {/* Avatar */}
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {l.avatar_url
                    ? <img src={l.avatar_url} alt="" className="h-full w-full object-cover" />
                    : (l.display_name?.[0] || "?").toUpperCase()
                  }
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.display_name || "Guest"}</p>
                  <span className={`text-[10px] font-semibold ${rankColor}`}>{rankIcon} {rankName}</span>
                </div>

                <span className="shrink-0 text-sm font-bold text-foreground">{l.points}</span>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
