import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PROGRESSION_ACTIONS, getRankProgress } from "@/hooks/usePoints";
import GlassCard from "./GlassCard";
import RankBadge from "./RankBadge";

function ProgressionContent({ currentPoints, compact = false }) {
  const progress = getRankProgress(currentPoints);
  const visibleActions = compact ? PROGRESSION_ACTIONS.slice(0, 3) : PROGRESSION_ACTIONS;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-sm font-semibold">Faith Progress</h3>
          </div>
          <RankBadge points={currentPoints} showProgress />
        </div>

        <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3 sm:max-w-xs">
          {progress.next ? (
            <>
              <p className="text-sm font-medium">{progress.pointsToNext} points to {progress.next.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Earn points by posting, voting, and reacting to community moments.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Top rank reached</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Keep showing up to hold your place on the leaderboard.
              </p>
            </>
          )}
        </div>
      </div>

      <div className={`${compact ? "mt-4" : "mt-5"} grid gap-2 sm:grid-cols-2`}>
        {visibleActions.map((action) => (
          <Link
            key={action.label}
            to={action.href}
            className="group rounded-lg border border-border bg-secondary/40 px-3 py-3 transition-colors hover:border-primary/40 hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                +{action.points}
              </span>
            </div>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
              {action.cta}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      {!compact && (
        <Button asChild size="sm" className="mt-5 gap-2">
          <Link to="/community">
            <Sparkles className="h-4 w-4" />
            Take the next action
          </Link>
        </Button>
      )}
    </>
  );
}

export default function ProgressionLoop({ points, compact = false, framed = true, className = "" }) {
  const [currentPoints, setCurrentPoints] = useState(typeof points === "number" ? points : 0);
  const [loading, setLoading] = useState(typeof points !== "number");

  useEffect(() => {
    if (typeof points === "number") {
      setCurrentPoints(points);
      setLoading(false);
      return;
    }

    let active = true;
    const loadProgress = async () => {
      try {
        const user = await base44.auth.me();
        const levels = await base44.entities.UserLevel.filter({ user_email: user.email });
        if (active) setCurrentPoints(levels[0]?.points || 0);
      } catch {
        if (active) setCurrentPoints(0);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProgress();
    return () => {
      active = false;
    };
  }, [points]);

  const content = loading ? (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  ) : (
    <ProgressionContent currentPoints={currentPoints} compact={compact} />
  );

  if (!framed) {
    return <div className={className}>{content}</div>;
  }

  return <GlassCard className={className}>{content}</GlassCard>;
}
