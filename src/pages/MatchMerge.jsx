import { useCallback, useEffect, useRef, useState } from "react";
import { Gem, Sparkles } from "lucide-react";
import { supabase } from "@/api/communityClient";
import MatchMergeBoard from "@/games/matchMerge/ui/MatchMergeBoard";
import MatchMergeHud from "@/games/matchMerge/ui/MatchMergeHud";
import GameShell from "@/games/shared/ui/GameShell";
import GameFamiliarCompanion from "@/games/shared/familiar/GameFamiliarCompanion";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
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
import {
  canRequestMatchMerge,
  createRewardedMatchMergeState,
} from "@/games/matchMerge/simulation/matchMergeRewardModel";
import {
  createInitialMatchMergeState,
  markMatchMergeClaimed,
  MATCH_MERGE_GRID_SIZE,
  MATCH_MERGE_STORAGE_KEY,
  moveMatchMergeSelection,
  readLocalJson,
  selectMatchMergeCell,
  shuffleMatchMergeGrid,
  writeLocalJson,
} from "@/games/matchMerge/simulation/matchMergeRules";
import { useAuth } from "@/lib/AuthContext";

const QUIET_FEEDBACK = { tone: "quiet", message: "Pair neighboring offerings to refine them." };

export default function MatchMerge() {
  const { isAuthenticated, isLoadingAuth, openLogin, user } = useAuth();
  const [mode, setMode] = useState("practice");
  const [practiceState, setPracticeState] = useState(() => (
    readLocalJson(MATCH_MERGE_STORAGE_KEY, null) || createInitialMatchMergeState()
  ));
  const [rewardedState, setRewardedState] = useState(() => createInitialMatchMergeState());
  const [rewardSession, setRewardSession] = useState(null);
  const [rewardReceipt, setRewardReceipt] = useState(null);
  const [rewardError, setRewardError] = useState("");
  const [retryRequest, setRetryRequest] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [undoState, setUndoState] = useState(null);
  const [feedback, setFeedback] = useState(QUIET_FEEDBACK);
  const attemptedUserRef = useRef("");
  const requestInFlightRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const state = mode === "rewarded" ? rewardedState : practiceState;
  const readyScore = Math.max(0, state.score - (state.claimedScore || 0));

  useEffect(() => {
    writeLocalJson(MATCH_MERGE_STORAGE_KEY, practiceState);
  }, [practiceState]);

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
        gameKey: "match-merge",
        ownerId: attemptedUserRef.current,
      });
      return result;
    } catch (error) {
      if (requestGeneration !== requestGenerationRef.current) return null;
      setRewardError(error?.message || "The reward service could not complete that request.");
      setRetryRequest(request);
      writeGameRewardRecovery(window.sessionStorage, {
        gameKey: "match-merge",
        ownerId: attemptedUserRef.current,
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

  const startRewardedRun = useCallback(async () => {
    setMode("rewarded");
    setRewardReceipt(null);
    setRewardSession(null);
    setFeedback({ tone: "quiet", message: "Opening a server-validated Reliquary Bench..." });
    const request = { kind: "start" };
    const session = await runRequest(request, async () => {
      if (!supabase) throw new Error("Portal rewards are not configured in this preview.");
      return startGameRewardSession(supabase, "match-merge");
    });
    if (!session) return;
    setRewardSession(session);
    setRewardedState((current) => createRewardedMatchMergeState(session.context, current));
    setFeedback(QUIET_FEEDBACK);
  }, [runRequest]);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      requestGenerationRef.current += 1;
      requestInFlightRef.current = false;
      attemptedUserRef.current = "";
      setMode("practice");
      setRewardSession(null);
      setRewardReceipt(null);
      setRewardError("");
      setRetryRequest(null);
      return;
    }

    const userKey = user?.id || "authenticated";
    if (attemptedUserRef.current === userKey) return;
    requestGenerationRef.current += 1;
    requestInFlightRef.current = false;
    attemptedUserRef.current = userKey;
    const recovery = readGameRewardRecovery(window.sessionStorage, {
      gameKey: "match-merge",
      ownerId: userKey,
    });
    if (recovery?.request.kind === "start") {
      setMode("rewarded");
      setRewardError("A Reliquary session start is ready to retry safely.");
      setRetryRequest(recovery.request);
      return;
    }
    if (recovery?.session && recovery.request.kind !== "start") {
      setMode("rewarded");
      setRewardSession(recovery.session);
      setRewardedState((current) => createRewardedMatchMergeState(recovery.session.context, current));
      setRewardError("A Reliquary reward request is ready to retry safely.");
      setRetryRequest(recovery.request);
      return;
    }
    startRewardedRun();
  }, [isAuthenticated, isLoadingAuth, startRewardedRun, user?.id]);

  const applyPracticeSelection = useCallback((current, index) => {
    const cursor = indexToCursor(index);
    const next = selectMatchMergeCell({ ...current, cursor }, index);
    if (next.score > current.score) {
      setUndoState(current);
      setFeedback({ tone: "success", message: `Refined into ${next.grid[index]?.label || "a higher offering"}. Chain ${next.mergeStreak}!` });
    } else if (current.selectedIndex !== null && current.selectedIndex !== index && current.grid[index]) {
      setFeedback({ tone: "warning", message: "Those offerings must be matching neighbors." });
    } else {
      setFeedback(QUIET_FEEDBACK);
    }
    return next;
  }, []);

  const submitRewardedMerge = useCallback(async (request) => {
    if (!rewardSession) return;
    const result = await runRequest(request, () => progressGameRewardSession(supabase, {
      sessionId: rewardSession.sessionId,
      idempotencyKey: request.idempotencyKey,
      action: request.action,
    }), rewardSession);
    if (!result) {
      setFeedback({ tone: "warning", message: "That merge did not reach the Reliquary. Retry it safely." });
      return;
    }
    setRewardSession((current) => updateRewardSessionContext(current, result.state));
    setRewardedState((current) => createRewardedMatchMergeState(result.state, current));
    setFeedback({ tone: "success", message: `Offering refined. Chain ${result.state.merge_streak}!` });
  }, [rewardSession, runRequest]);

  const handleRewardedSelection = useCallback((index) => {
    if (isBusy || rewardError || !rewardSession || rewardReceipt) return;
    const selectedIndex = rewardedState.selectedIndex;
    const cursor = indexToCursor(index);

    if (selectedIndex === null || selectedIndex === index) {
      setRewardedState((current) => ({
        ...current,
        cursor,
        selectedIndex: selectedIndex === index ? null : index,
      }));
      setFeedback(QUIET_FEEDBACK);
      return;
    }

    if (!canRequestMatchMerge(rewardedState.grid, selectedIndex, index)) {
      setRewardedState((current) => ({ ...current, cursor, selectedIndex: index }));
      setFeedback({ tone: "warning", message: "Those offerings must be matching neighbors." });
      return;
    }

    submitRewardedMerge({
      kind: "action",
      idempotencyKey: createIdempotencyKey(),
      action: { op: "merge", from: selectedIndex, to: index },
    });
  }, [isBusy, rewardError, rewardReceipt, rewardSession, rewardedState.grid, rewardedState.selectedIndex, submitRewardedMerge]);

  const handleSelectCell = useCallback((index) => {
    if (mode === "rewarded") {
      handleRewardedSelection(index);
      return;
    }
    setPracticeState((current) => applyPracticeSelection(current, index));
  }, [applyPracticeSelection, handleRewardedSelection, mode]);

  const handleDragSwap = useCallback((sourceIndex, targetIndex) => {
    if (mode === "rewarded") {
      setRewardedState((current) => ({ ...current, selectedIndex: sourceIndex }));
      if (canRequestMatchMerge(rewardedState.grid, sourceIndex, targetIndex)) {
        submitRewardedMerge({
          kind: "action",
          idempotencyKey: createIdempotencyKey(),
          action: { op: "merge", from: sourceIndex, to: targetIndex },
        });
      } else {
        setFeedback({ tone: "warning", message: "Those offerings must be matching neighbors." });
      }
      return;
    }
    setPracticeState((current) => {
      const sourceSelected = selectMatchMergeCell({ ...current, selectedIndex: null }, sourceIndex);
      return applyPracticeSelection(sourceSelected, targetIndex);
    });
  }, [applyPracticeSelection, mode, rewardedState.grid, submitRewardedMerge]);

  const handleGameAction = useCallback((action) => {
    if (isBusy) return;
    const movement = {
      [GAME_ACTIONS.moveLeft]: [0, -1],
      [GAME_ACTIONS.moveUp]: [-1, 0],
      [GAME_ACTIONS.moveRight]: [0, 1],
      [GAME_ACTIONS.moveDown]: [1, 0],
    }[action];

    if (movement) {
      const update = (current) => moveMatchMergeSelection(current, movement[0], movement[1]);
      if (mode === "rewarded") setRewardedState(update);
      else setPracticeState(update);
      return;
    }

    if ([GAME_ACTIONS.confirm, GAME_ACTIONS.interact, GAME_ACTIONS.primary].includes(action)) {
      const cursor = state.cursor || { row: 0, column: 0 };
      const index = cursor.row * MATCH_MERGE_GRID_SIZE + cursor.column;
      handleSelectCell(index);
    }
  }, [handleSelectCell, isBusy, mode, state.cursor]);

  useGameControls({ onAction: handleGameAction, preserveNativeButtonActivation: true });

  const handleUndo = () => {
    if (mode !== "practice" || !undoState) return;
    setPracticeState(undoState);
    setUndoState(null);
    setFeedback({ tone: "quiet", message: "The last practice action was restored." });
  };

  const handleShuffle = () => {
    if (mode !== "practice") return;
    setPracticeState((current) => {
      setUndoState(current);
      return shuffleMatchMergeGrid(current);
    });
    setFeedback({ tone: "quiet", message: "The practice offerings have been rearranged." });
  };

  const submitClaim = useCallback(async (request) => {
    if (!rewardSession) return;
    const receipt = await runRequest(request, () => claimGameReward(supabase, {
      sessionId: rewardSession.sessionId,
      idempotencyKey: request.idempotencyKey,
      evidence: {},
    }), rewardSession);
    if (!receipt) return;
    setRewardReceipt(receipt);
    setRewardedState((current) => markMatchMergeClaimed(current));
    setFeedback({ tone: "success", message: "Rewards recorded in your portal inventory." });
  }, [rewardSession, runRequest]);

  const handleClaim = () => {
    if (mode === "practice") {
      setPracticeState((current) => markMatchMergeClaimed(current));
      setFeedback({ tone: "quiet", message: "Practice complete. Sign in for a rewarded run." });
      return;
    }
    if (rewardedState.moves < 1 || isBusy || rewardReceipt) return;
    submitClaim({ kind: "claim", idempotencyKey: createIdempotencyKey() });
  };

  const handleRetry = () => {
    if (!retryRequest || isBusy) return;
    if (retryRequest.kind === "start") startRewardedRun();
    if (retryRequest.kind === "action") submitRewardedMerge(retryRequest);
    if (retryRequest.kind === "claim") submitClaim(retryRequest);
  };

  const handleReset = () => {
    if (mode === "rewarded") {
      if (rewardReceipt) startRewardedRun();
      return;
    }
    setUndoState(practiceState);
    setPracticeState(createInitialMatchMergeState());
    setFeedback({ tone: "quiet", message: "A fresh practice bench is ready." });
  };

  const choosePractice = () => {
    setMode("practice");
    setRewardError("");
    setRetryRequest(null);
    setFeedback({ tone: "quiet", message: "Practice mode is local and grants no portal rewards." });
  };

  const status = (
    <div className="reliquary-shell-status" aria-label="Match and Merge status">
      <span><Gem aria-hidden="true" /> {state.score} refinement</span>
      <span><Sparkles aria-hidden="true" /> {state.mergeStreak} chain</span>
      <span><Gem aria-hidden="true" /> {mode === "rewarded" ? `${readyScore} ready` : "Practice"}</span>
    </div>
  );

  const compactAction = getCompactAction({
    isAuthenticated,
    isBusy,
    mode,
    readyScore,
    rewardError,
    rewardReceipt,
    onClaim: handleClaim,
    onNewRun: handleReset,
    onRetry: handleRetry,
    onSignIn: isAuthenticated ? startRewardedRun : openLogin,
  });

  return (
    <GameShell
      world="match-merge"
      eyebrow="Reliquary puzzle"
      title="Match & Merge"
      status={status}
      sidebar={(
        <div>
          <GameFamiliarCompanion label="Reliquary helper" />
          <MatchMergeHud
            state={state}
            mode={mode}
            rewardReceipt={rewardReceipt}
            isPending={isBusy}
            rewardError={rewardError}
            onClaim={handleClaim}
            onReset={mode === "practice" || rewardReceipt ? handleReset : undefined}
            onRetry={handleRetry}
            onSignIn={isAuthenticated ? startRewardedRun : openLogin}
            onPractice={choosePractice}
          />
        </div>
      )}
    >
      <MatchMergeBoard
        state={state}
        feedback={feedback}
        canUndo={Boolean(undoState)}
        isBusy={isBusy || (mode === "rewarded" && (!rewardSession || Boolean(rewardError)))}
        allowPracticeTools={mode === "practice"}
        onSelectCell={handleSelectCell}
        onDragSwap={handleDragSwap}
        onUndo={handleUndo}
        onShuffle={handleShuffle}
        compactAction={compactAction}
      />
    </GameShell>
  );
}

function getCompactAction({
  isAuthenticated,
  isBusy,
  mode,
  readyScore,
  rewardError,
  rewardReceipt,
  onClaim,
  onNewRun,
  onRetry,
  onSignIn,
}) {
  if (mode === "practice") {
    return {
      label: "Practice bench",
      detail: "Progress stays on this device.",
      actionLabel: isAuthenticated ? "Start rewarded" : "Sign in to earn",
      disabled: isBusy,
      onAction: onSignIn,
    };
  }

  if (rewardError) {
    return {
      label: "Reward service paused",
      detail: "Your last request can be retried safely.",
      actionLabel: isBusy ? "Retrying..." : "Retry",
      tone: "warning",
      disabled: isBusy,
      onAction: onRetry,
    };
  }

  if (rewardReceipt) {
    return {
      label: "Rewards received",
      detail: "The Priory ledger is up to date.",
      actionLabel: "New rewarded run",
      tone: "success",
      disabled: isBusy,
      onAction: onNewRun,
    };
  }

  return {
    label: readyScore > 0 ? `${readyScore} refinement ready` : "Complete a merge",
    detail: readyScore > 0 ? "Claim whenever you are ready." : "Each valid pair adds forge rewards.",
    actionLabel: isBusy ? "Recording..." : "Claim rewards",
    tone: readyScore > 0 ? "success" : "quiet",
    disabled: isBusy || readyScore <= 0,
    onAction: onClaim,
  };
}

function indexToCursor(index) {
  return {
    row: Math.floor(index / MATCH_MERGE_GRID_SIZE),
    column: index % MATCH_MERGE_GRID_SIZE,
  };
}

function createIdempotencyKey() {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("This browser cannot create secure reward request IDs.");
  }
  return crypto.randomUUID();
}
