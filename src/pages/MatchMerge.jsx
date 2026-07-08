import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gem, Sparkles } from "lucide-react";
import MatchMergeBoard from "@/games/matchMerge/ui/MatchMergeBoard";
import MatchMergeHud from "@/games/matchMerge/ui/MatchMergeHud";
import {
  buildMatchMergeRewardIntent,
  createInitialMatchMergeState,
  markMatchMergeClaimed,
  MATCH_MERGE_REWARD_LOG_KEY,
  MATCH_MERGE_STORAGE_KEY,
  readLocalJson,
  selectMatchMergeCell,
  writeLocalJson,
} from "@/games/matchMerge/simulation/matchMergeRules";

export default function MatchMerge() {
  const [state, setState] = useState(() => readLocalJson(MATCH_MERGE_STORAGE_KEY, null) || createInitialMatchMergeState());
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(MATCH_MERGE_REWARD_LOG_KEY, []));
  const startedAt = useMemo(() => Date.now(), []);
  const latestRewardIntent = rewardLog[0] || null;

  useEffect(() => {
    writeLocalJson(MATCH_MERGE_STORAGE_KEY, state);
  }, [state]);

  useEffect(() => {
    writeLocalJson(MATCH_MERGE_REWARD_LOG_KEY, rewardLog.slice(0, 25));
  }, [rewardLog]);

  const handleSelectCell = (index) => {
    setState((current) => selectMatchMergeCell(current, index));
  };

  const handleClaim = () => {
    const intent = buildMatchMergeRewardIntent({
      state,
      durationMs: Math.max(0, Date.now() - startedAt),
    });
    if (!intent) return;

    setRewardLog((current) => [intent, ...current].slice(0, 25));
    setState((current) => markMatchMergeClaimed(current));
  };

  const handleReset = () => {
    setState(createInitialMatchMergeState());
  };

  return (
    <div className="community-dashboard mx-auto max-w-7xl animate-fade-in">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <ButtonBack />
          <div className="mb-2 mt-3 flex items-center gap-2 text-amber-200/75">
            <Gem className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Reliquary puzzle</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Match & Merge</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Sort the Priory shelf, merge matching offerings, and preview forge materials for charm upgrades.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1 text-xs font-bold text-emerald-100">
          <Sparkles className="h-3.5 w-3.5" />
          Local prototype rewards
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <MatchMergeBoard state={state} onSelectCell={handleSelectCell} />
        <aside className="min-w-0">
          <MatchMergeHud
            state={state}
            rewardIntent={latestRewardIntent}
            rewardLog={rewardLog}
            onClaim={handleClaim}
            onReset={handleReset}
          />
        </aside>
      </div>
    </div>
  );
}

function ButtonBack() {
  return (
    <Link
      to="/quarters"
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-muted-foreground transition-all hover:border-amber-200/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Quarters
    </Link>
  );
}
