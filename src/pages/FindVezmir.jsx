import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lightbulb, RotateCcw } from "lucide-react";
import CloisterDiorama from "@/games/findVezmir/ui/CloisterDiorama";
import ClueTray from "@/games/findVezmir/ui/ClueTray";
import {
  buildFindVezmirRewardIntent,
  createInitialFindVezmirState,
  cycleDioramaLayer,
  FIND_VEZMIR_PHASES,
  FIND_VEZMIR_REWARD_LOG_KEY,
  getFindVezmirDurationMs,
  getFindVezmirTargetRows,
  markFindVezmirRewardClaimed,
  panDiorama,
  readLocalJson,
  requestFindVezmirHint,
  resolveFindVezmirTap,
  writeLocalJson,
} from "@/games/findVezmir/simulation/findVezmirRules";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import GameShell from "@/games/shared/ui/GameShell";

const PAN_STEP = 2.5;

export default function FindVezmir() {
  const navigate = useNavigate();
  const [state, setState] = useState(() => createInitialFindVezmirState());
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(FIND_VEZMIR_REWARD_LOG_KEY, []));
  const targets = useMemo(() => getFindVezmirTargetRows(state), [state]);
  const complete = state.phase === FIND_VEZMIR_PHASES.complete;
  const durationSeconds = Math.round(getFindVezmirDurationMs(state) / 1000);

  useEffect(() => {
    writeLocalJson(FIND_VEZMIR_REWARD_LOG_KEY, rewardLog.slice(0, 20));
  }, [rewardLog]);

  const cycleLayer = useCallback((delta) => {
    setState((current) => cycleDioramaLayer(current, delta));
  }, []);

  const moveScene = useCallback((delta) => {
    setState((current) => panDiorama(current, delta));
  }, []);

  const handleAction = useCallback((action) => {
    const moves = {
      [GAME_ACTIONS.moveLeft]: { x: PAN_STEP, y: 0 },
      [GAME_ACTIONS.moveRight]: { x: -PAN_STEP, y: 0 },
      [GAME_ACTIONS.moveUp]: { x: 0, y: PAN_STEP },
      [GAME_ACTIONS.moveDown]: { x: 0, y: -PAN_STEP },
    };
    if (moves[action]) moveScene(moves[action]);
    if (action === GAME_ACTIONS.interact) cycleLayer(1);
    if (action === GAME_ACTIONS.cancel) navigate("/quarters");
  }, [cycleLayer, moveScene, navigate]);

  useGameControls({ enabled: !complete, onAction: handleAction });

  useEffect(() => {
    if (complete) return undefined;
    const handleDepthShortcut = (event) => {
      if (event.code !== "KeyQ" || event.metaKey || event.ctrlKey || event.altKey) return;
      const tagName = event.target?.tagName?.toUpperCase();
      if (event.target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;
      event.preventDefault();
      cycleLayer(-1);
    };
    window.addEventListener("keydown", handleDepthShortcut);
    return () => window.removeEventListener("keydown", handleDepthShortcut);
  }, [complete, cycleLayer]);

  const findObject = (objectKey) => {
    setState((current) => resolveFindVezmirTap(current, { objectKey }, Date.now()));
  };

  const claimPreview = () => {
    if (!complete || state.lastRewardIntent) return;
    const durationMs = getFindVezmirDurationMs(state);
    const intent = buildFindVezmirRewardIntent({ state, durationMs });
    if (!intent) return;
    setRewardLog((current) => [intent, ...current].slice(0, 20));
    setState((current) => markFindVezmirRewardClaimed(current, {
      durationMs,
      eventId: intent.eventId,
      createdAt: intent.createdAt,
    }));
  };

  const reset = () => setState(createInitialFindVezmirState());
  const foundCount = state.foundKeys.length;

  const status = (
    <div className="vezmir-status" aria-label="Find Vezmir progress">
      <span>{foundCount}/6 found</span>
      <span>{state.focus} focus</span>
      <span>{state.score} points</span>
    </div>
  );

  const sidebar = complete ? (
    <GameResultSheet
      intent={state.lastRewardIntent || buildFindVezmirRewardIntent({ state })}
      title="Vezmir found"
      record={{ label: state.hintsUsed === 0 ? "Lantern-eyed clear" : "Cloister clear", value: `${durationSeconds}s · ${state.score} points` }}
      choices={state.lastRewardIntent ? [] : [{ key: "claim", label: "Log reward preview", description: "Stores this preview locally; no portal balance changes." }]}
      onChoose={claimPreview}
      onReturn={() => navigate("/quarters")}
    />
  ) : (
    <div>
      <ClueTray targets={targets} activeHintRegion={state.activeHintRegion} />
      <div className="vezmir-actions">
        <button type="button" onClick={() => setState((current) => requestFindVezmirHint(current))}>
          <Lightbulb aria-hidden="true" /> Hint
        </button>
        <button type="button" onClick={reset}>
          <RotateCcw aria-hidden="true" /> Reset
        </button>
      </div>
      <p className="vezmir-case-note" role="status">{state.message}</p>
    </div>
  );

  return (
    <GameShell
      world="find-vezmir"
      eyebrow="The Lantern Cloister"
      title="Find Vezmir"
      status={status}
      sidebar={sidebar}
    >
      <CloisterDiorama
        state={state}
        targets={targets}
        onFind={findObject}
        onPan={moveScene}
        onCycleLayer={cycleLayer}
      />
    </GameShell>
  );
}
