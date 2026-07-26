import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogIn, Pause, Play, Sparkles } from "lucide-react";
import { supabase } from "@/api/communityClient";
import GameCanvasHost from "@/games/shared/ui/GameCanvasHost";
import GameShell from "@/games/shared/ui/GameShell";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import { useFamiliar } from "@/games/shared/familiar/useFamiliar";
import { createSceneBridge } from "@/games/shared/phaser/sceneBridge";
import {
  claimGameReward,
  progressGameRewardSession,
  startGameRewardSession,
} from "@/games/shared/rewards/gameRewardClient";
import TimeRunnerScene from "@/games/timeRunner/phaser/TimeRunnerScene";
import TimeRunnerHud from "@/games/timeRunner/ui/TimeRunnerHud";
import {
  applyRewardedPosture,
  createRewardedTimeRunnerState,
  createTimeRunnerReceiptIntent,
  findTimeRunnerHazardAction,
} from "@/games/timeRunner/simulation/timeRunnerRewardModel";
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
import { useAuth } from "@/lib/AuthContext";

export default function TimeRunner() {
  const { familiar } = useFamiliar();
  const { isAuthenticated, isLoadingAuth, openLogin } = useAuth();
  const [mode, setMode] = useState("practice");
  const [practiceState, setPracticeState] = useState(() => createInitialTimeRunnerState());
  const [rewardedState, setRewardedState] = useState(() => createInitialTimeRunnerState());
  const [rewardContext, setRewardContext] = useState(null);
  const [rewardSession, setRewardSession] = useState(null);
  const [rewardReceipt, setRewardReceipt] = useState(null);
  const [rewardError, setRewardError] = useState("");
  const [retryRequest, setRetryRequest] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(TIME_RUNNER_REWARD_LOG_KEY, []));
  const [latestPracticeIntent, setLatestPracticeIntent] = useState(null);
  const state = mode === "rewarded" ? rewardedState : practiceState;
  const stateRef = useRef(state);
  const requestInFlightRef = useRef(false);
  const lastSyncRef = useRef("");

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { writeLocalJson(TIME_RUNNER_REWARD_LOG_KEY, rewardLog.slice(0, 25)); }, [rewardLog]);

  const runRequest = useCallback(async (request, operation) => {
    if (requestInFlightRef.current) return null;
    requestInFlightRef.current = true;
    setIsBusy(true);
    setRewardError("");
    setRetryRequest(null);
    try {
      return await operation();
    } catch (error) {
      setRewardError(error?.message || "The reward service could not complete that request.");
      setRetryRequest(request);
      return null;
    } finally {
      requestInFlightRef.current = false;
      setIsBusy(false);
    }
  }, []);

  const startRewardedRun = useCallback(async () => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }
    setMode("rewarded");
    setRewardReceipt(null);
    setRewardSession(null);
    setRewardContext(null);
    lastSyncRef.current = "";
    const request = { kind: "start" };
    const session = await runRequest(request, async () => {
      if (!supabase) throw new Error("Portal rewards are not configured in this preview.");
      return startGameRewardSession(supabase, "time-runner");
    });
    if (!session) return;
    setRewardSession(session);
    setRewardContext(session.context);
    setRewardedState((current) => createRewardedTimeRunnerState(session.context, { previousState: current }));
  }, [isAuthenticated, openLogin, runRequest]);

  const submitRewardedAction = useCallback(async (request) => {
    if (!rewardSession) return;
    const result = await runRequest(request, () => progressGameRewardSession(supabase, {
      sessionId: rewardSession.sessionId,
      idempotencyKey: request.idempotencyKey,
      action: request.action,
    }));
    if (!result) return;
    setRewardContext(result.state);
    setRewardedState((current) => applyRewardedPosture(
      createRewardedTimeRunnerState(result.state, { previousState: current }),
      request.action.op,
    ));
  }, [rewardSession, runRequest]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (mode === "practice") {
        setPracticeState((current) => tickTimeRunner(current, now));
      } else if (rewardContext) {
        setRewardedState((current) => {
          const projected = createRewardedTimeRunnerState(rewardContext, { now, previousState: current });
          return current.postureUntil > now ? { ...projected, posture: current.posture, postureUntil: current.postureUntil } : projected;
        });
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [mode, rewardContext]);

  useEffect(() => {
    if (
      mode !== "rewarded"
      || rewardContext?.phase !== "running"
      || !rewardSession
      || isBusy
      || rewardError
    ) return undefined;
    const interval = window.setInterval(() => {
      const syncKey = `${rewardSession.sessionId}:${rewardContext.action_index}:${Math.floor(Date.now() / 1200)}`;
      if (lastSyncRef.current === syncKey) return;
      lastSyncRef.current = syncKey;
      submitRewardedAction({
        kind: "action",
        idempotencyKey: createIdempotencyKey(),
        action: { op: "sync" },
      });
    }, 1200);
    return () => window.clearInterval(interval);
  }, [isBusy, mode, rewardContext, rewardError, rewardSession, submitRewardedAction]);

  const dispatchPracticeAction = useCallback((action, payload = {}) => {
    setPracticeState((current) => {
      if (action === "select-landing") return selectMouseLanding(current, payload.landingId);
      const runnerAction = {
        [GAME_ACTIONS.moveUp]: GAME_ACTIONS.qteUp,
        [GAME_ACTIONS.moveDown]: GAME_ACTIONS.qteDown,
        [GAME_ACTIONS.moveRight]: GAME_ACTIONS.qteRight,
      }[action] || action;
      return applyTimeRunnerAction(current, runnerAction);
    });
  }, []);

  const dispatchRewardedAction = useCallback((action, payload = {}) => {
    if (!rewardContext || isBusy || rewardError || rewardContext.phase !== "running") return;
    let rewardAction = null;
    if (action === "select-landing" || action === GAME_ACTIONS.primary) {
      const landingId = payload.landingId || rewardContext.available_landings?.[0]?.id;
      if (landingId) rewardAction = { op: "land", landing_id: landingId };
    } else if (action === GAME_ACTIONS.moveUp || action === GAME_ACTIONS.qteUp) {
      rewardAction = findTimeRunnerHazardAction(rewardContext, "jump");
    } else if (action === GAME_ACTIONS.moveDown || action === GAME_ACTIONS.qteDown) {
      rewardAction = findTimeRunnerHazardAction(rewardContext, "duck");
    } else if ((action === GAME_ACTIONS.moveRight || action === GAME_ACTIONS.qteRight) && rewardContext.focus >= 30) {
      rewardAction = { op: "focus" };
    }
    if (!rewardAction) return;
    submitRewardedAction({ kind: "action", idempotencyKey: createIdempotencyKey(), action: rewardAction });
  }, [isBusy, rewardContext, rewardError, submitRewardedAction]);

  const dispatchAction = useCallback((action, payload = {}) => {
    if (mode === "rewarded") dispatchRewardedAction(action, payload);
    else dispatchPracticeAction(action, payload);
  }, [dispatchPracticeAction, dispatchRewardedAction, mode]);

  useGameControls({ onAction: dispatchAction, preserveNativeButtonActivation: true });

  const bridge = useMemo(() => createSceneBridge({
    getState: () => stateRef.current,
    getFamiliar: () => familiar,
    dispatchAction,
  }), [dispatchAction, familiar]);

  const handleReset = () => {
    setLatestPracticeIntent(null);
    setPracticeState((current) => resetTimeRunner(current.seed));
  };

  const handleClaimReward = () => {
    if (mode === "rewarded") {
      if (!rewardSession || !state.completed || rewardReceipt || isBusy) return;
      submitClaim({ kind: "claim", idempotencyKey: createIdempotencyKey() });
      return;
    }
    const intent = buildTimeRunnerRewardIntent({ state, durationMs: Math.max(0, state.elapsedMs) });
    if (!intent) return;
    setLatestPracticeIntent(intent);
    setRewardLog((current) => [intent, ...current].slice(0, 25));
    setPracticeState((current) => markTimeRunnerClaimed(current));
  };

  const submitClaim = useCallback(async (request) => {
    if (!rewardSession) return;
    const receipt = await runRequest(request, () => claimGameReward(supabase, {
      sessionId: rewardSession.sessionId,
      idempotencyKey: request.idempotencyKey,
      evidence: {},
    }));
    if (receipt) setRewardReceipt(receipt);
  }, [rewardSession, runRequest]);

  const handleRetry = () => {
    if (!retryRequest || isBusy) return;
    if (retryRequest.kind === "start") startRewardedRun();
    if (retryRequest.kind === "action") submitRewardedAction(retryRequest);
    if (retryRequest.kind === "claim") submitClaim(retryRequest);
  };

  const choosePractice = () => {
    setMode("practice");
    setRewardError("");
    setRetryRequest(null);
  };

  const isPaused = state.phase === TIME_RUNNER_PHASES.paused;
  const rewardIntent = mode === "rewarded" ? createTimeRunnerReceiptIntent(rewardReceipt) : latestPracticeIntent;
  const status = (
    <span className="inline-flex items-center gap-2 text-xs font-bold">
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      {mode === "rewarded" ? "Rewarded" : "Practice"} · {state.clockShards} Clock Brass
    </span>
  );
  const actions = mode === "practice" && (state.phase === TIME_RUNNER_PHASES.running || isPaused) ? (
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

  const hud = (
    <>
      <ModePanel
        mode={mode}
        isAuthenticated={isAuthenticated}
        isLoadingAuth={isLoadingAuth}
        isBusy={isBusy}
        onPractice={choosePractice}
        onRewarded={startRewardedRun}
      />
      <TimeRunnerHud
        familiar={familiar}
        state={state}
        mode={mode}
        isBusy={isBusy}
        rewardIntent={rewardIntent}
        rewardReceipt={rewardReceipt}
        onStart={() => dispatchAction(GAME_ACTIONS.confirm)}
        onReset={handleReset}
        onAction={dispatchAction}
        onClaimReward={handleClaimReward}
      />
      {rewardError ? <RewardError message={rewardError} onRetry={handleRetry} disabled={isBusy} /> : null}
    </>
  );

  return (
    <GameShell
      world="time-runner"
      eyebrow="Pendulum Cloister"
      title="Time Runner: Clocktower Traverse"
      status={status}
      actions={actions}
      sidebar={hud}
    >
      <div className="time-runner-stage">
        <GameCanvasHost scene={TimeRunnerScene} bridge={bridge} backgroundColor="#D9E6EC" />
        <div className="time-runner-stage__controls">
          <TimeRunnerHud
            familiar={familiar}
            state={state}
            mode={mode}
            isBusy={isBusy}
            rewardIntent={rewardIntent}
            rewardReceipt={rewardReceipt}
            onStart={() => dispatchAction(GAME_ACTIONS.confirm)}
            onReset={handleReset}
            onAction={dispatchAction}
            onClaimReward={handleClaimReward}
            compactControls
          />
        </div>
        <div className="time-runner-stage__legend" aria-label="Clocktower route guide">
          <div><strong>Clock hands</strong><span>Leap to a glowing brass landing.</span></div>
          <div><strong>Numeral gates</strong><span>Duck beneath each carved arch.</span></div>
          <div><strong>Clock Brass</strong><span>Gather fallen pieces of the old clock face.</span></div>
        </div>
        {isPaused ? <div className="absolute inset-0 z-30 grid place-items-center bg-[#FAF3EB]/80"><strong className="rounded-md border-2 border-[#485365] bg-[#D9E6EC] px-5 py-3 text-[#364152]">Traverse paused</strong></div> : null}
      </div>
    </GameShell>
  );
}

function ModePanel({ mode, isAuthenticated, isLoadingAuth, isBusy, onPractice, onRewarded }) {
  return (
    <section className="time-runner-mode" aria-label="Play mode">
      <div>
        <strong>{mode === "rewarded" ? "Rewarded traverse" : "Practice traverse"}</strong>
        <span>{mode === "rewarded" ? "Server validated · portal rewards" : "Local only · no portal rewards"}</span>
      </div>
      {mode === "rewarded" ? (
        <button type="button" onClick={onPractice} disabled={isBusy}>Practice instead</button>
      ) : (
        <button type="button" onClick={onRewarded} disabled={isLoadingAuth || isBusy}>
          <LogIn aria-hidden="true" /> {isAuthenticated ? "Start rewarded traverse" : "Sign in for rewards"}
        </button>
      )}
    </section>
  );
}

function RewardError({ message, onRetry, disabled }) {
  return (
    <section className="time-runner-error" role="alert">
      <strong>{message}</strong>
      <button type="button" onClick={onRetry} disabled={disabled}>Retry safely</button>
    </section>
  );
}

function createIdempotencyKey() {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("This browser cannot create secure reward request IDs.");
  }
  return crypto.randomUUID();
}
