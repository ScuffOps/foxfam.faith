import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Sparkles } from "lucide-react";
import GameCanvasHost from "@/games/shared/ui/GameCanvasHost";
import GameShell from "@/games/shared/ui/GameShell";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
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
  selectMouseLanding,
  TIME_RUNNER_PHASES,
  TIME_RUNNER_REWARD_LOG_KEY,
  tickTimeRunner,
  writeLocalJson,
} from "@/games/timeRunner/simulation/timeRunnerRules";

export default function TimeRunner() {
  const [state, setState] = useState(() => createInitialTimeRunnerState());
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(TIME_RUNNER_REWARD_LOG_KEY, []));
  const [latestRewardIntent, setLatestRewardIntent] = useState(null);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { writeLocalJson(TIME_RUNNER_REWARD_LOG_KEY, rewardLog.slice(0, 25)); }, [rewardLog]);
  useEffect(() => {
    const interval = window.setInterval(() => setState((current) => tickTimeRunner(current)), 100);
    return () => window.clearInterval(interval);
  }, []);

  const dispatchAction = useCallback((action, payload = {}) => {
    setState((current) => {
      if (action === "select-landing") return selectMouseLanding(current, payload.landingId);
      const runnerAction = {
        [GAME_ACTIONS.moveUp]: GAME_ACTIONS.qteUp,
        [GAME_ACTIONS.moveDown]: GAME_ACTIONS.qteDown,
        [GAME_ACTIONS.moveRight]: GAME_ACTIONS.qteRight,
      }[action] || action;
      return applyTimeRunnerAction(current, runnerAction);
    });
  }, []);

  useGameControls({ onAction: dispatchAction });

  const bridge = useMemo(() => createSceneBridge({
    getState: () => stateRef.current,
    dispatchAction,
  }), [dispatchAction]);

  const handleReset = () => {
    setLatestRewardIntent(null);
    setState((current) => resetTimeRunner(current.seed));
  };

  const handleClaimReward = () => {
    const intent = buildTimeRunnerRewardIntent({ state, durationMs: Math.max(0, state.elapsedMs) });
    if (!intent) return;
    setLatestRewardIntent(intent);
    setRewardLog((current) => [intent, ...current].slice(0, 25));
    setState((current) => markTimeRunnerClaimed(current));
  };

  const isPaused = state.phase === TIME_RUNNER_PHASES.paused;
  const status = (
    <span className="inline-flex items-center gap-2 text-xs font-bold">
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      {state.clockShards} Clock Brass
    </span>
  );
  const actions = state.phase === TIME_RUNNER_PHASES.running || isPaused ? (
    <button
      className="game-icon-button"
      type="button"
      onClick={() => dispatchAction(isPaused ? GAME_ACTIONS.confirm : GAME_ACTIONS.cancel)}
      aria-label={isPaused ? "Resume Time Runner" : "Pause Time Runner"}
      title={isPaused ? "Resume" : "Pause"}
    >
      {isPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
    </button>
  ) : null;

  return (
    <GameShell
      world="time-runner"
      eyebrow="Pendulum Cloister"
      title="Time Runner: Clocktower Traverse"
      status={status}
      actions={actions}
      sidebar={(
        <TimeRunnerHud
          state={state}
          rewardIntent={latestRewardIntent}
          onStart={() => dispatchAction(GAME_ACTIONS.confirm)}
          onReset={handleReset}
          onAction={dispatchAction}
          onClaimReward={handleClaimReward}
        />
      )}
    >
      <div className="time-runner-stage">
        <GameCanvasHost scene={TimeRunnerScene} bridge={bridge} backgroundColor="#D9E6EC" />
        <div className="time-runner-stage__legend" aria-label="Clocktower route guide">
          <div><strong>Clock hands</strong><span>Leap to the marked brass landing.</span></div>
          <div><strong>Numeral gates</strong><span>Duck beneath the carved seals.</span></div>
          <div><strong>Face shards</strong><span>Collect Clock Brass for the local reward preview.</span></div>
        </div>
        {isPaused ? <div className="absolute inset-0 z-30 grid place-items-center bg-[#FAF3EB]/80"><strong className="rounded-md border-2 border-[#485365] bg-[#D9E6EC] px-5 py-3 text-[#364152]">Traverse paused</strong></div> : null}
      </div>
    </GameShell>
  );
}
