import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Fish, Sparkles } from "lucide-react";
import GameCanvasHost from "@/games/shared/ui/GameCanvasHost";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import GameShell from "@/games/shared/ui/GameShell";
import { createSceneBridge } from "@/games/shared/phaser/sceneBridge";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import StarfishingScene from "@/games/starfishing/phaser/StarfishingScene";
import FishpediaPanel from "@/games/starfishing/ui/FishpediaPanel";
import StarfishingHud from "@/games/starfishing/ui/StarfishingHud";
import {
  applyStarfishingAction,
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
import { DUPLICATE_POLICIES } from "@/lib/gameRewards";
import "@/games/starfishing/ui/starfishing.css";

const DUPLICATE_CHOICES = [
  { key: DUPLICATE_POLICIES.keep, label: "Keep the star", description: "Preserve this catch in your local collection." },
  { key: DUPLICATE_POLICIES.release, label: "Release for Favor", description: "Preview a gentle Favor return." },
  { key: DUPLICATE_POLICIES.convert, label: "Distill to Star Glass", description: "Preview forge material conversion." },
];

export default function Starfishing() {
  const [state, setState] = useState(() => createInitialStarfishingState());
  const [fishpedia, setFishpedia] = useState(() => readLocalJson(FISHPEDIA_STORAGE_KEY, {}));
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(REWARD_LOG_STORAGE_KEY, []));
  const stateRef = useRef(state);
  const fishpediaRef = useRef(fishpedia);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    fishpediaRef.current = fishpedia;
    writeLocalJson(FISHPEDIA_STORAGE_KEY, fishpedia);
  }, [fishpedia]);
  useEffect(() => { writeLocalJson(REWARD_LOG_STORAGE_KEY, rewardLog.slice(0, 25)); }, [rewardLog]);

  const dispatchAction = useCallback((action) => {
    setState((current) => applyStarfishingAction(current, action, fishpediaRef.current));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setState((current) => tickStarfishing(current)), 120);
    return () => window.clearInterval(interval);
  }, []);

  useGameControls({
    enabled: state.phase !== STARFISHING_PHASES.caught,
    onAction: dispatchAction,
  });

  const bridge = useMemo(() => createSceneBridge({
    getState: () => stateRef.current,
    dispatchAction,
  }), [dispatchAction]);

  const handleCatchChoice = useCallback((policy) => {
    const catchRecord = stateRef.current.lastCatch;
    if (!catchRecord || stateRef.current.phase !== STARFISHING_PHASES.caught) return;

    const intent = buildCatchRewardIntent({
      catchRecord,
      duplicatePolicy: policy,
      durationMs: Math.max(0, Date.now() - stateRef.current.castStartedAt),
    });
    setFishpedia((current) => updateFishpedia(current, catchRecord));
    if (intent) setRewardLog((current) => [intent, ...current].slice(0, 25));
    setState((current) => ({
      ...current,
      lastRewardIntent: intent,
      phase: STARFISHING_PHASES.idle,
      activeFish: null,
      qtePattern: [],
      qteIndex: 0,
    }));
  }, []);

  const latestRewardIntent = rewardLog[0] || null;
  const isCatchReveal = state.phase === STARFISHING_PHASES.caught && state.lastCatch;
  const choices = state.lastCatch?.duplicate
    ? DUPLICATE_CHOICES
    : [{ key: DUPLICATE_POLICIES.none, label: "Add to Fishpedia", description: "Record this new constellation catch." }];

  return (
    <GameShell
      world="starfishing"
      title="Starfishing"
      eyebrow="Moonwater Observatory"
      status={<span className="starfishing-status"><Sparkles aria-hidden="true" /> Streak {state.streak}</span>}
      actions={<span className="starfishing-local" title="Rewards remain a local preview">Local preview</span>}
      sidebar={(
        <div className="starfishing-sidebar">
          {isCatchReveal ? (
            <GameResultSheet
              title={`${state.lastCatch.label} caught`}
              record={{ label: state.lastCatch.rarity, value: `${state.lastCatch.size}\" starspan` }}
              choices={choices}
              onChoose={handleCatchChoice}
            />
          ) : (
            <StarfishingHud
              state={state}
              rewardIntent={latestRewardIntent}
              onCast={() => dispatchAction(GAME_ACTIONS.primary)}
              onQteAction={dispatchAction}
              onReset={() => setState(createInitialStarfishingState())}
            />
          )}
        </div>
      )}
    >
      <div className="starfishing-world">
        <GameCanvasHost
          scene={StarfishingScene}
          bridge={bridge}
          backgroundColor="#d9e6ec"
          className="starfishing-canvas"
        />
        <div className="starfishing-scene-label" aria-hidden="true">
          <Fish /> Constellation Pond
        </div>
      </div>
      <FishpediaPanel fishpedia={fishpedia} />
      <p className="starfishing-safety-note">
        <BookOpen aria-hidden="true" /> Catch records and reward intents stay on this device until the portal reward service validates them.
      </p>
    </GameShell>
  );
}
