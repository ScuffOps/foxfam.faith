import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp, GripHorizontal, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PROGRESSION_ACTIONS, getRankProgress } from "@/hooks/usePoints";
import GlassCard from "./GlassCard";
import RankBadge from "./RankBadge";

const COLLAPSED_KEY = "commhub_favor_collapsed";
const LEGACY_COLLAPSED_KEY = "commhub_faith_progress_collapsed";
const POSITION_KEY = "commhub_faith_progress_position";

function readStoredPosition() {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  try {
    const parsed = JSON.parse(localStorage.getItem(POSITION_KEY) || "{}");
    return {
      x: Number(parsed.x) || 0,
      y: Number(parsed.y) || 0,
    };
  } catch {
    return { x: 0, y: 0 };
  }
}

function ProgressionContent({
  currentPoints,
  compact = false,
  collapsed = false,
  collapsible = false,
  positionable = false,
  dragging = false,
  onToggleCollapse,
  onResetPosition,
  onDragStart,
}) {
  const progress = getRankProgress(currentPoints);
  const visibleActions = compact ? PROGRESSION_ACTIONS.slice(0, 3) : PROGRESSION_ACTIONS;

  if (collapsed) {
    return (
      <div className="flex w-[172px] items-center gap-2 md:w-[190px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <Trophy className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-xs font-semibold">Favor</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {currentPoints} pts
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {positionable && (
            <button
              type="button"
              onPointerDown={onDragStart}
              className={`hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:inline-flex ${dragging ? "bg-secondary text-primary" : ""}`}
              title="Drag Favor"
            >
              <GripHorizontal className="h-4 w-4" />
            </button>
          )}
          {collapsible && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Expand Favor"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="favor-topline grid gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-heading text-sm font-semibold">Favor</h3>
            </div>
            {(collapsible || positionable) && (
              <div className="flex items-center gap-1">
                {positionable && (
                  <>
                    <button
                      type="button"
                      onPointerDown={onDragStart}
                      className={`hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:inline-flex ${dragging ? "bg-secondary text-primary" : ""}`}
                      title="Drag Favor"
                    >
                      <GripHorizontal className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onResetPosition}
                      className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:inline-flex"
                      title="Reset Favor position"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                {collapsible && (
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    title={collapsed ? "Expand Favor" : "Collapse Favor"}
                  >
                    {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                )}
              </div>
            )}
          </div>
          <RankBadge points={currentPoints} showProgress />
        </div>

        <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
          {progress.next ? (
            <>
              <p className="text-sm font-medium">{progress.pointsToNext} Favor to {progress.next.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Earn Favor by posting, voting, and reacting to community moments.
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

      <div className={`${compact ? "mt-4" : "mt-5"} favor-actions grid gap-2`}>
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

export default function ProgressionLoop({
  points,
  compact = false,
  framed = true,
  className = "",
  collapsible = true,
  positionable = false,
}) {
  const cardRef = useRef(null);
  const [currentPoints, setCurrentPoints] = useState(typeof points === "number" ? points : 0);
  const [loading, setLoading] = useState(typeof points !== "number");
  const [collapsed, setCollapsed] = useState(() => {
    if (!collapsible || typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSED_KEY) === "1" || localStorage.getItem(LEGACY_COLLAPSED_KEY) === "1";
  });
  const [position, setPosition] = useState(() => readStoredPosition());
  const [dragging, setDragging] = useState(false);

  const clampPosition = useCallback((nextPosition) => {
    if (!positionable || typeof window === "undefined" || !cardRef.current) return nextPosition;

    const rect = cardRef.current.getBoundingClientRect();
    const baseLeft = rect.left - position.x;
    const baseTop = rect.top - position.y;
    const margin = 12;
    const minX = margin - baseLeft;
    const maxX = window.innerWidth - rect.width - margin - baseLeft;
    const minY = margin - baseTop;
    const maxY = window.innerHeight - rect.height - margin - baseTop;

    const x = Math.min(Math.max(nextPosition.x, minX), Math.max(minX, maxX));
    const y = Math.min(Math.max(nextPosition.y, minY), Math.max(minY, maxY));

    if (x === nextPosition.x && y === nextPosition.y) return nextPosition;
    return { x, y };
  }, [position.x, position.y, positionable]);

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

  useEffect(() => {
    if (!collapsible || typeof window === "undefined") return;
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    localStorage.removeItem(LEGACY_COLLAPSED_KEY);
  }, [collapsed, collapsible]);

  useEffect(() => {
    if (!positionable || typeof window === "undefined") return;
    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  }, [position, positionable]);

  useEffect(() => {
    if (!positionable || typeof window === "undefined") return;
    const handleResize = () => setPosition((value) => clampPosition(value));
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition, positionable]);

  const handleDragStart = (event) => {
    if (!positionable || event.pointerType === "touch") return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = { ...position };
    const rect = cardRef.current?.getBoundingClientRect();
    const baseLeft = rect ? rect.left - startPosition.x : 0;
    const baseTop = rect ? rect.top - startPosition.y : 0;
    const width = rect?.width || 0;
    const height = rect?.height || 0;
    const margin = 12;
    const clampDragPosition = (nextPosition) => {
      if (!rect || typeof window === "undefined") return nextPosition;
      const minX = margin - baseLeft;
      const maxX = window.innerWidth - width - margin - baseLeft;
      const minY = margin - baseTop;
      const maxY = window.innerHeight - height - margin - baseTop;
      return {
        x: Math.min(Math.max(nextPosition.x, minX), Math.max(minX, maxX)),
        y: Math.min(Math.max(nextPosition.y, minY), Math.max(minY, maxY)),
      };
    };
    setDragging(true);

    const handleMove = (moveEvent) => {
      setPosition(clampDragPosition({
        x: startPosition.x + moveEvent.clientX - startX,
        y: startPosition.y + moveEvent.clientY - startY,
      }));
    };
    const handleUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleResetPosition = () => setPosition({ x: 0, y: 0 });

  const content = loading ? (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  ) : (
    <ProgressionContent
      currentPoints={currentPoints}
      compact={compact}
      collapsed={collapsed}
      collapsible={collapsible}
      positionable={positionable}
      dragging={dragging}
      onToggleCollapse={() => setCollapsed((value) => !value)}
      onResetPosition={handleResetPosition}
      onDragStart={handleDragStart}
    />
  );

  if (!framed) {
    return <div className={className}>{content}</div>;
  }

  return (
    <GlassCard
      ref={cardRef}
      className={`${className} ${positionable ? "md:relative md:z-10" : ""} ${positionable && !collapsed ? "w-full max-w-[clamp(20rem,58vw,52rem)]" : ""} ${collapsed ? "inline-flex w-auto max-w-full p-3" : ""}`}
      style={positionable ? { transform: `translate(${position.x}px, ${position.y}px)` } : undefined}
    >
      {content}
    </GlassCard>
  );
}
