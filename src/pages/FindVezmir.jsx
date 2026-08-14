import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lightbulb, LogIn, RotateCcw } from "lucide-react";
import { supabase } from "@/api/communityClient";
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
import {
  createFindVezmirReceiptIntent,
  createFindVezmirSearchAction,
  createRewardedFindVezmirState,
} from "@/games/findVezmir/simulation/findVezmirRewardModel";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import GameFamiliarCompanion from "@/games/shared/familiar/GameFamiliarCompanion";
import {
  claimGameReward,
  progressGameRewardSession,
  startGameRewardSession,
} from "@/games/shared/rewards/gameRewardClient";
import {
  clearGameRewardRecovery,
  readGameRewardRecovery,
  updateRewardSessionContext,
  writeGameRewardRecovery,
} from "@/games/shared/rewards/gameRewardRecovery";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import GameShell from "@/games/shared/ui/GameShell";
import { useAuth } from "@/lib/AuthContext";

const PAN_STEP = 2.5;

export default function FindVezmir() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, openLogin, user } = useAuth();
  const [mode, setMode] = useState("practice");
  const [practiceState, setPracticeState] = useState(() => createInitialFindVezmirState());
  const [rewardedState, setRewardedState] = useState(() => createInitialFindVezmirState());
  const [rewardSession, setRewardSession] = useState(null);
  const [rewardReceipt, setRewardReceipt] = useState(null);
  const [rewardError, setRewardError] = useState("");
  const [retryRequest, setRetryRequest] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(FIND_VEZMIR_REWARD_LOG_KEY, []));
  const requestInFlightRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const rewardOwnerRef = useRef("");
  const state = mode === "rewarded" ? rewardedState : practiceState;
  const targets = useMemo(() => getFindVezmirTargetRows(state), [state]);
  const complete = state.phase === FIND_VEZMIR_PHASES.complete;
  const durationSeconds = Math.round(getFindVezmirDurationMs(state) / 1000);

  useEffect(() => {
    writeLocalJson(FIND_VEZMIR_REWARD_LOG_KEY, rewardLog.slice(0, 20));
  }, [rewardLog]);

  const runRequest = useCallback(async (request, operation, recoverySession = null) => {
    if (requestInFlightRef.current) return null;
    const requestGeneration = requestGenerationRef.current;
    requestInFlightRef.current = true;
    setIsBusy(true);
    setRewardError("");
    setRetryRequest(null);
    try {
      const result = await operation();
      if (requestGeneration !== requestGenerationRef.current) return null;
      clearGameRewardRecovery(window.sessionStorage, {
        gameKey: "puzzle-cat",
        ownerId: rewardOwnerRef.current,
      });
      return result;
    } catch (error) {
      if (requestGeneration !== requestGenerationRef.current) return null;
      setRewardError(error?.message || "The reward service could not complete that request.");
      setRetryRequest(request);
      writeGameRewardRecovery(window.sessionStorage, {
        gameKey: "puzzle-cat",
        ownerId: rewardOwnerRef.current,
        request,
        session: recoverySession,
      });
      return null;
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        requestInFlightRef.current = false;
        setIsBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isLoadingAuth) return;
    const ownerKey = isAuthenticated ? (user?.id || "authenticated") : "";
    if (rewardOwnerRef.current === ownerKey) return;
    rewardOwnerRef.current = ownerKey;
    requestGenerationRef.current += 1;
    requestInFlightRef.current = false;
    setIsBusy(false);
    setMode("practice");
    setRewardSession(null);
    setRewardReceipt(null);
    setRewardError("");
    setRetryRequest(null);
    if (!ownerKey) return;
    const recovery = readGameRewardRecovery(window.sessionStorage, {
      gameKey: "puzzle-cat",
      ownerId: ownerKey,
    });
    if (recovery?.request.kind === "start") {
      setMode("rewarded");
      setRewardError("A cloister session start is ready to retry safely.");
      setRetryRequest(recovery.request);
      return;
    }
    if (recovery?.session && recovery.request.kind !== "start") {
      setMode("rewarded");
      setRewardSession(recovery.session);
      setRewardedState((current) => createRewardedFindVezmirState(recovery.session.context, current));
      setRewardError("A cloister reward request is ready to retry safely.");
      setRetryRequest(recovery.request);
    }
  }, [isAuthenticated, isLoadingAuth, user?.id]);

  const startRewardedCase = useCallback(async () => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }
    setMode("rewarded");
    setRewardReceipt(null);
    setRewardSession(null);
    const request = { kind: "start" };
    const session = await runRequest(request, async () => {
      if (!supabase) throw new Error("Portal rewards are not configured in this preview.");
      return startGameRewardSession(supabase, "puzzle-cat");
    });
    if (!session) return;
    setRewardSession(session);
    setRewardedState((current) => createRewardedFindVezmirState(session.context, {
      ...current,
      startedAt: Date.parse(session.startedAt),
    }));
  }, [isAuthenticated, openLogin, runRequest]);

  const submitRewardedAction = useCallback(async (request) => {
    if (!rewardSession) return;
    const result = await runRequest(request, () => progressGameRewardSession(supabase, {
      sessionId: rewardSession.sessionId,
      idempotencyKey: request.idempotencyKey,
      action: request.action,
    }), rewardSession);
    if (!result) return;
    setRewardSession((current) => updateRewardSessionContext(current, result.state));
    setRewardedState((current) => createRewardedFindVezmirState(result.state, current));
  }, [rewardSession, runRequest]);

  const cycleLayer = useCallback((delta) => {
    const update = (current) => cycleDioramaLayer(current, delta);
    if (mode === "rewarded") setRewardedState(update);
    else setPracticeState(update);
  }, [mode]);

  const selectLayer = useCallback((layer) => {
    const update = (current) => {
      const activeLayer = current.layers.indexOf(layer);
      return activeLayer === -1 ? current : { ...current, activeLayer };
    };
    if (mode === "rewarded") setRewardedState(update);
    else setPracticeState(update);
  }, [mode]);

  const moveScene = useCallback((delta) => {
    const update = (current) => panDiorama(current, delta);
    if (mode === "rewarded") setRewardedState(update);
    else setPracticeState(update);
  }, [mode]);

  const recenterScene = useCallback(() => {
    const update = (current) => ({ ...current, pan: { x: 0, y: 0 } });
    if (mode === "rewarded") setRewardedState(update);
    else setPracticeState(update);
  }, [mode]);

  const handleAction = useCallback((action, event) => {
    if (isBusy || complete) return;
    if (event?.target?.closest?.("button") && action !== GAME_ACTIONS.cancel) return;
    const moves = {
      [GAME_ACTIONS.moveLeft]: { x: PAN_STEP, y: 0 },
      [GAME_ACTIONS.moveRight]: { x: -PAN_STEP, y: 0 },
      [GAME_ACTIONS.moveUp]: { x: 0, y: PAN_STEP },
      [GAME_ACTIONS.moveDown]: { x: 0, y: -PAN_STEP },
    };
    if (moves[action]) moveScene(moves[action]);
    if (action === GAME_ACTIONS.interact) cycleLayer(1);
    if (action === GAME_ACTIONS.cancel && mode === "practice") navigate("/quarters");
  }, [complete, cycleLayer, isBusy, mode, moveScene, navigate]);

  const handleDepthShortcut = useCallback((event) => {
    if (event.code !== "KeyQ" || event.metaKey || event.ctrlKey || event.altKey) return false;
    event.preventDefault();
    cycleLayer(-1);
    return true;
  }, [cycleLayer]);

  useGameControls({
    enabled: !complete,
    onAction: handleAction,
    onKeyDown: handleDepthShortcut,
    preserveNativeButtonActivation: true,
  });

  const searchScene = (tap) => {
    if (isBusy || complete) return;
    if (mode === "rewarded") {
      const activeLayer = state.layers[state.activeLayer];
      const action = createFindVezmirSearchAction(tap, activeLayer);
      if (!action) return;
      submitRewardedAction({ kind: "action", idempotencyKey: createIdempotencyKey(), action });
      return;
    }
    setPracticeState((current) => resolveFindVezmirTap(current, tap, Date.now()));
  };

  const requestHint = () => {
    if (isBusy || complete) return;
    if (mode === "rewarded") {
      submitRewardedAction({ kind: "action", idempotencyKey: createIdempotencyKey(), action: { op: "hint" } });
      return;
    }
    setPracticeState((current) => requestFindVezmirHint(current));
  };

  const claimPreview = () => {
    if (!complete || state.lastRewardIntent) return;
    const durationMs = getFindVezmirDurationMs(state);
    const intent = buildFindVezmirRewardIntent({ state, durationMs });
    if (!intent) return;
    setRewardLog((current) => [intent, ...current].slice(0, 20));
    setPracticeState((current) => markFindVezmirRewardClaimed(current, {
      durationMs,
      eventId: intent.eventId,
      createdAt: intent.createdAt,
    }), rewardSession);
  };

  const submitClaim = useCallback(async (request) => {
    if (!rewardSession) return;
    const receipt = await runRequest(request, () => claimGameReward(supabase, {
      sessionId: rewardSession.sessionId,
      idempotencyKey: request.idempotencyKey,
      evidence: {},
    }), rewardSession);
    if (receipt) setRewardReceipt(receipt);
  }, [rewardSession, runRequest]);

  const handleResultChoice = async () => {
    if (mode === "practice") {
      claimPreview();
      return;
    }
    if (rewardReceipt || isBusy) return;
    await submitClaim({ kind: "claim", idempotencyKey: createIdempotencyKey() });
  };

  const handleRetry = () => {
    if (!retryRequest || isBusy) return;
    if (retryRequest.kind === "start") startRewardedCase();
    if (retryRequest.kind === "action") submitRewardedAction(retryRequest);
    if (retryRequest.kind === "claim") submitClaim(retryRequest);
  };

  const choosePractice = () => {
    setMode("practice");
    setRewardError("");
    setRetryRequest(null);
  };

  const reset = () => setPracticeState(createInitialFindVezmirState());
  const foundCount = state.foundKeys.length;
  const currentTarget = targets.find((target) => !target.found && !target.locked)
    || targets.find((target) => !target.found)
    || null;
  const displayedIntent = mode === "rewarded"
    ? createFindVezmirReceiptIntent(rewardReceipt)
    : (state.lastRewardIntent || buildFindVezmirRewardIntent({ state }));

  const status = (
    <div className="vezmir-status" aria-label="Find Vezmir progress">
      <span>{mode === "rewarded" ? "Rewarded" : "Practice"}</span>
      <span>{foundCount}/6 found</span>
      <span>{state.focus} focus</span>
      <span>{state.score} points</span>
    </div>
  );

  const sidebar = complete ? (
    <div>
      <GameFamiliarCompanion label="Clue keeper" />
      <ModePanel
        mode={mode}
        isAuthenticated={isAuthenticated}
        isLoadingAuth={isLoadingAuth}
        isBusy={isBusy}
        onPractice={choosePractice}
        onRewarded={startRewardedCase}
      />
      <GameResultSheet
        intent={displayedIntent}
        rewardLabel={mode === "rewarded" ? (rewardReceipt ? "Portal rewards" : "Server-validated result") : "Practice reward preview"}
        finalReward={mode === "rewarded" && Boolean(rewardReceipt)}
        title="Vezmir found"
        record={{ label: state.hintsUsed === 0 ? "Lantern-eyed clear" : "Cloister clear", value: `${durationSeconds}s · ${state.score} points` }}
        choices={(mode === "rewarded" ? rewardReceipt : state.lastRewardIntent) ? [] : [{
          key: "claim",
          label: mode === "rewarded" ? "Claim portal rewards" : "Log reward preview",
          description: mode === "rewarded" ? "Records server-validated Favor and forge materials." : "Stores this preview locally; no portal balance changes.",
        }]}
        onChoose={handleResultChoice}
        onReturn={() => navigate("/quarters")}
      />
      {rewardError ? <RewardError message={rewardError} onRetry={handleRetry} disabled={isBusy} /> : null}
    </div>
  ) : (
    <div className="vezmir-sidebar">
      <GameFamiliarCompanion label="Clue keeper" />
      <div className="vezmir-sidebar__quick-actions">
        <ModePanel
          mode={mode}
          isAuthenticated={isAuthenticated}
          isLoadingAuth={isLoadingAuth}
          isBusy={isBusy}
          onPractice={choosePractice}
          onRewarded={startRewardedCase}
        />
        <div className="vezmir-actions">
          <button type="button" onClick={requestHint} disabled={isBusy || Boolean(rewardError)}>
            <Lightbulb aria-hidden="true" /> Hint
          </button>
          <button type="button" onClick={reset} disabled={mode === "rewarded" || isBusy}>
            <RotateCcw aria-hidden="true" /> Reset
          </button>
        </div>
      </div>
      <ClueTray
        targets={targets}
        activeHintRegion={state.activeHintRegion}
        currentTargetKey={currentTarget?.key}
        foundCount={foundCount}
      />
      {rewardError ? <RewardError message={rewardError} onRetry={handleRetry} disabled={isBusy} /> : null}
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
        currentTarget={currentTarget}
        message={state.message}
        onSearch={searchScene}
        onPan={moveScene}
        onSelectLayer={selectLayer}
        onRecenter={recenterScene}
        disabled={isBusy || Boolean(rewardError)}
      />
    </GameShell>
  );
}

function ModePanel({ mode, isAuthenticated, isLoadingAuth, isBusy, onPractice, onRewarded }) {
  return (
    <section className="vezmir-mode" aria-label="Play mode">
      <div>
        <strong>{mode === "rewarded" ? "Rewarded case" : "Practice case"}</strong>
        <span>{mode === "rewarded" ? "Server validated · portal rewards" : "Local only · no portal rewards"}</span>
      </div>
      {mode === "rewarded" ? (
        <button type="button" onClick={onPractice} disabled={isBusy}>Practice instead</button>
      ) : (
        <button type="button" onClick={onRewarded} disabled={isLoadingAuth || isBusy}>
          <LogIn aria-hidden="true" /> {isAuthenticated ? "Start rewarded case" : "Sign in for rewards"}
        </button>
      )}
    </section>
  );
}

function RewardError({ message, onRetry, disabled }) {
  return (
    <section className="vezmir-error" role="alert">
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
