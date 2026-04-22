import { getRank, getNextRank } from "@/hooks/usePoints";

export default function RankBadge({ points = 0, showProgress = false }) {
  const rank = getRank(points);
  const next = getNextRank(points);

  return (
    <div className="inline-flex flex-col gap-1.5">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${rank.bg} ${rank.color}`}>
        <span>{rank.icon}</span>
        {rank.name}
        <span className="opacity-60 font-normal">· {points} pts</span>
      </span>
      {showProgress && next && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${rank.bg.replace("bg-", "bg-").replace("/15", "")}`}
              style={{ width: `${Math.min(100, ((points - rank.min) / (next.min - rank.min)) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{next.min - points} pts to {next.name}</span>
        </div>
      )}
    </div>
  );
}