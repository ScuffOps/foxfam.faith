import { FAVORED_BADGE, FAVORED_DEFAULT_TITLE, getRank, getNextRank } from "@/hooks/usePoints";

export default function RankBadge({ points = 0, showProgress = false, isFavored = false, favoredTitle = "" }) {
  const rank = getRank(points);
  const next = getNextRank(points);
  const title = isFavored ? (favoredTitle || FAVORED_DEFAULT_TITLE) : rank.name;
  const icon = isFavored ? FAVORED_BADGE.icon : rank.icon;
  const color = isFavored ? FAVORED_BADGE.color : rank.color;
  const bg = isFavored ? FAVORED_BADGE.bg : rank.bg;
  const progressFill = isFavored ? "bg-[#bdebf1]" : rank.bg.replace("bg-", "bg-").replace("/15", "");

  return (
    <div className="inline-flex flex-col gap-1.5">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${bg} ${color} ${isFavored ? `ring-1 ${FAVORED_BADGE.ring}` : ""}`}>
        <span>{icon}</span>
        {title}
        <span className="font-normal opacity-60">· {points} pts</span>
      </span>
      {showProgress && next && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressFill}`}
              style={{ width: `${Math.min(100, ((points - rank.min) / (next.min - rank.min)) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground">{next.min - points} pts to {next.name}</span>
        </div>
      )}
    </div>
  );
}
