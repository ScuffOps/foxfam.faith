import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock3, Sparkles } from "lucide-react";
import GameCanvasHost from "@/games/shared/ui/GameCanvasHost";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { getActionForKeyboardEvent } from "@/games/shared/input/bindings";
import { createSceneBridge } from "@/games/shared/phaser/sceneBridge";
import TimeRunnerScene from "@/games/timeRunner/phaser/TimeRunnerScene";
import TimeRunnerHud from "@/games/timeRunner/ui/TimeRunnerHud";
import {
  applyTimeRunnerAction,
  buildTimeRunnerRewardIntent,
  createInitialTimeRunnerState,
  markTimeRunnerClaimed,
  readLocalJson,
  resetTimeRunner,
  TIME_RUNNER_REWARD_LOG_KEY,
  tickTimeRunner,
  writeLocalJson,
} from "@/games/timeRunner/simulation/timeRunnerRules";

export default function TimeRunner() {
  const [state, setState] = useState(() => createInitialTimeRunnerState());
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(TIME_RUNNER_REWARD_LOG_KEY, []));
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    writeLocalJson(TIME_RUNNER_REWARD_LOG_KEY, rewardLog.slice(0, 25));
  }, [rewardLog]);

  const dispatchAction = useCallback((action) => {
    setState((current) => applyTimeRunnerAction(current, action));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => tickTimeRunner(current));
    }, 100);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const action = getActionForKeyboardEvent(event);
      if (!action) return;
      event.preventDefault();
      dispatchAction(action === GAME_ACTIONS.cast ? GAME_ACTIONS.confirm : action);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatchAction]);

  const bridge = useMemo(
    () => createSceneBridge({
      getState: () => stateRef.current,
      dispatchAction,
    }),
    [dispatchAction],
  );

  const latestRewardIntent = rewardLog[0] || null;

  const handleReset = () => {
    setState((current) => resetTimeRunner(current.seed));
  };

  const handleClaimReward = () => {
    const intent = buildTimeRunnerRewardIntent({
      state,
      durationMs: Math.max(0, state.elapsedMs),
    });
    if (!intent) return;

    setRewardLog((current) => [intent, ...current].slice(0, 25));
    setState((current) => markTimeRunnerClaimed(current));
  };

  return (
    <div className="community-dashboard mx-auto max-w-7xl animate-fade-in">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <ButtonBack />
          <div className="mb-2 mt-3 flex items-center gap-2 text-amber-200/75">
            <Clock3 className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Clocktower arcade</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Clocktower Side-Scroller</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Sprint through clock hands, roman numeral gates, and floating clock-face shards in a local Time Runner prototype.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1 text-xs font-bold text-emerald-100">
          <Sparkles className="h-3.5 w-3.5" />
          Local prototype rewards
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="min-w-0 space-y-5">
          <GameCanvasHost
            scene={TimeRunnerScene}
            bridge={bridge}
            backgroundColor="#121426"
            className="min-h-[28rem]"
          />
          <section className="grid gap-3 sm:grid-cols-3">
            <ShardCard title="Minute hands" tone="amber" copy="Leap over sweeping brass arcs." />
            <ShardCard title="Roman gates" tone="rose" copy="Duck beneath heavy numeral seals." />
            <ShardCard title="Clock shards" tone="cyan" copy="Gather glassy fragments for local material previews." />
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <TimeRunnerHud
            state={state}
            rewardIntent={latestRewardIntent}
            onStart={() => dispatchAction(GAME_ACTIONS.confirm)}
            onReset={handleReset}
            onAction={dispatchAction}
            onClaimReward={handleClaimReward}
          />

          <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Recent local log</p>
            {rewardLog.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No Time Runner reward previews yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {rewardLog.slice(0, 5).map((intent) => (
                  <article key={intent.eventId} className="rounded-lg border border-white/10 bg-black/15 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{intent.eventType}</span>
                      <span className="text-xs font-bold text-emerald-100">+{intent.favorPreview} Favor</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(intent.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
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

function ShardCard({ title, copy, tone }) {
  const toneClass = {
    amber: "border-amber-200/20 bg-amber-200/10 text-amber-50",
    rose: "border-rose-200/20 bg-rose-200/10 text-rose-50",
    cyan: "border-cyan-200/20 bg-cyan-200/10 text-cyan-50",
  }[tone];

  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="font-heading text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm leading-6 opacity-75">{copy}</p>
    </article>
  );
}
