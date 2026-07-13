import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Fish, Sparkles } from "lucide-react";
import GameCanvasHost from "@/games/shared/ui/GameCanvasHost";
import { createSceneBridge } from "@/games/shared/phaser/sceneBridge";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import StarfishingScene from "@/games/starfishing/phaser/StarfishingScene";
import FishpediaPanel from "@/games/starfishing/ui/FishpediaPanel";
import StarfishingHud from "@/games/starfishing/ui/StarfishingHud";
import {
  applyQteAction,
  beginCast,
  buildCatchRewardIntent,
  createInitialStarfishingState,
  FISHPEDIA_STORAGE_KEY,
  readLocalJson,
  REWARD_LOG_STORAGE_KEY,
  STARFISHING_PHASES,
  tickStarfishing,
  updateFishpedia,
  writeLocalJson,
} from "@/games/starfishing/simulation/starfishingRules";

export default function Starfishing() {
  const [state, setState] = useState(() => createInitialStarfishingState());
  const [fishpedia, setFishpedia] = useState(() => readLocalJson(FISHPEDIA_STORAGE_KEY, {}));
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(REWARD_LOG_STORAGE_KEY, []));
  const stateRef = useRef(state);
  const fishpediaRef = useRef(fishpedia);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    fishpediaRef.current = fishpedia;
    writeLocalJson(FISHPEDIA_STORAGE_KEY, fishpedia);
  }, [fishpedia]);

  useEffect(() => {
    writeLocalJson(REWARD_LOG_STORAGE_KEY, rewardLog.slice(0, 25));
  }, [rewardLog]);

  const dispatchAction = useCallback((action) => {
    const legacyAction = {
      [GAME_ACTIONS.primary]: GAME_ACTIONS.cast,
      [GAME_ACTIONS.confirm]: GAME_ACTIONS.cast,
      [GAME_ACTIONS.moveLeft]: GAME_ACTIONS.qteLeft,
      [GAME_ACTIONS.moveUp]: GAME_ACTIONS.qteUp,
      [GAME_ACTIONS.moveRight]: GAME_ACTIONS.qteRight,
      [GAME_ACTIONS.moveDown]: GAME_ACTIONS.qteDown,
    }[action] || action;

    if (legacyAction === GAME_ACTIONS.cast) {
      setState((current) => beginCast(current));
      return;
    }

    if ([GAME_ACTIONS.qteLeft, GAME_ACTIONS.qteUp, GAME_ACTIONS.qteRight, GAME_ACTIONS.qteDown].includes(legacyAction)) {
      setState((current) => applyQteAction(current, legacyAction, fishpediaRef.current));
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => tickStarfishing(current));
    }, 120);

    return () => window.clearInterval(interval);
  }, []);

  useGameControls({ onAction: dispatchAction });

  const bridge = useMemo(
    () => createSceneBridge({
      getState: () => stateRef.current,
      dispatchAction,
    }),
    [dispatchAction],
  );

  const latestRewardIntent = rewardLog[0] || null;

  const handleDuplicateChoice = (policy) => {
    if (!state.lastCatch || state.phase !== STARFISHING_PHASES.caught) return;
    const nextFishpedia = updateFishpedia(fishpedia, state.lastCatch);
    const intent = buildCatchRewardIntent({
      catchRecord: state.lastCatch,
      duplicatePolicy: policy,
      durationMs: Math.max(0, Date.now() - state.castStartedAt),
    });

    setFishpedia(nextFishpedia);
    if (intent) setRewardLog((current) => [intent, ...current].slice(0, 25));
    setState((current) => ({
      ...current,
      lastRewardIntent: intent,
      phase: STARFISHING_PHASES.idle,
      activeFish: null,
      qtePattern: [],
      qteIndex: 0,
    }));
  };

  const handleReset = () => {
    setState(createInitialStarfishingState());
  };

  return (
    <div className="community-dashboard mx-auto max-w-7xl animate-fade-in">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <ButtonBack />
          <div className="mb-2 mt-3 flex items-center gap-2 text-cyan-200/75">
            <Fish className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Celestial pond</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Starfishing</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cast a line into the constellation pond, match the QTE prompts, and log local reward intents for the future portal economy.
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
            scene={StarfishingScene}
            bridge={bridge}
            backgroundColor="#060a1c"
            className="min-h-[28rem]"
          />
          <FishpediaPanel fishpedia={fishpedia} />
        </div>

        <aside className="min-w-0 space-y-4">
          <StarfishingHud
            state={state}
            rewardIntent={latestRewardIntent}
            onCast={() => dispatchAction(GAME_ACTIONS.cast)}
            onQteAction={dispatchAction}
            onDuplicateChoice={handleDuplicateChoice}
            onReset={handleReset}
          />

          <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Recent local log</p>
            {rewardLog.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No local catches logged yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {rewardLog.slice(0, 5).map((intent) => (
                  <article key={intent.eventId} className="rounded-lg border border-white/10 bg-black/15 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{intent.eventType}</span>
                      <span className="text-xs font-bold text-cyan-100">+{intent.favorPreview} Favor</span>
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
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-muted-foreground transition-all hover:border-cyan-200/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Quarters
    </Link>
  );
}
