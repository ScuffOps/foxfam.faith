import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, LogIn, RotateCcw } from "lucide-react";
import { supabase } from "@/api/communityClient";
import BobaCounter from "@/games/bobaCafe/ui/BobaCounter";
import BobaOrderTicket from "@/games/bobaCafe/ui/BobaOrderTicket";
import BobaStationTray from "@/games/bobaCafe/ui/BobaStationTray";
import "@/games/bobaCafe/ui/boba-cafe.css";
import {
  BOBA_CAFE_PHASES,
  BOBA_CAFE_STORAGE_KEY,
  BOBA_OPTIONS_BY_STATION,
  BOBA_ORDER_LIMIT,
  buildBobaCafeRewardIntent,
  clearBobaTray,
  createInitialBobaCafeState,
  getPatiencePercent,
  isTrayComplete,
  markBobaCafeClaimed,
  readLocalJson,
  restoreBobaCafePracticeState,
  selectCafeOptionByShortcut,
  startNextBobaOrder,
  submitBobaDrink,
  tickBobaCafe,
  writeLocalJson,
} from "@/games/bobaCafe/simulation/bobaCafeRules";
import {
  createBobaCafeReceiptIntent,
  createRewardedBobaCafeState,
  getRewardedBobaPatiencePercent,
} from "@/games/bobaCafe/simulation/bobaCafeRewardModel";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import { useFamiliar } from "@/games/shared/familiar/useFamiliar";
import {
  claimGameReward,
  progressGameRewardSession,
  startGameRewardSession,
} from "@/games/shared/rewards/gameRewardClient";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import GameShell from "@/games/shared/ui/GameShell";
import { useAuth } from "@/lib/AuthContext";

const CAFE_SEED = "dulcis-cafe-v1";
const STATION_ORDER = ["tea", "milk", "topping", "charm", "sweetness"];

export default function BobaCafe() {
  const navigate = useNavigate();
  const { familiar } = useFamiliar();
  const { isAuthenticated, isLoadingAuth, openLogin, user } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [activeStation, setActiveStation] = useState("tea");
  const [mode, setMode] = useState("practice");
  const [practiceState, setPracticeState] = useState(() => (
    restoreBobaCafePracticeState(readLocalJson(BOBA_CAFE_STORAGE_KEY, null), { seed: CAFE_SEED })
  ));
  const [rewardedState, setRewardedState] = useState(() => createInitialBobaCafeState());
  const [rewardSession, setRewardSession] = useState(null);
  const [rewardReceipt, setRewardReceipt] = useState(null);
  const [rewardError, setRewardError] = useState("");
  const [retryRequest, setRetryRequest] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const attemptedUserRef = useRef("");
  const requestInFlightRef = useRef(false);
  const settleAttemptRef = useRef("");
  const state = mode === "rewarded" ? rewardedState : practiceState;

  useEffect(() => writeLocalJson(BOBA_CAFE_STORAGE_KEY, practiceState), [practiceState]);

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

  const startRewardedShift = useCallback(async () => {
    setMode("rewarded");
    setRewardReceipt(null);
    setRewardSession(null);
    settleAttemptRef.current = "";
    const request = { kind: "start" };
    const session = await runRequest(request, async () => {
      if (!supabase) throw new Error("Portal rewards are not configured in this preview.");
      return startGameRewardSession(supabase, "boba-cafe");
    });
    if (!session) return;
    setRewardSession(session);
    setRewardedState((current) => createRewardedBobaCafeState(session.context, current));
  }, [runRequest]);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
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
    attemptedUserRef.current = userKey;
    startRewardedShift();
  }, [isAuthenticated, isLoadingAuth, startRewardedShift, user?.id]);

  const submitRewardedAction = useCallback(async (request) => {
    if (!rewardSession) return;
    const result = await runRequest(request, () => progressGameRewardSession(supabase, {
      sessionId: rewardSession.sessionId,
      idempotencyKey: request.idempotencyKey,
      action: request.action,
    }));
    if (!result) return;
    setRewardedState((current) => createRewardedBobaCafeState(result.state, current));
  }, [rewardSession, runRequest]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);
      if (mode === "practice") setPracticeState((current) => tickBobaCafe(current, currentNow));
    }, 250);
    return () => window.clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode !== "rewarded" || rewardedState.phase !== BOBA_CAFE_PHASES.serving || !rewardedState.deadlineAt) return;
    if (now < rewardedState.deadlineAt + 250 || isBusy || rewardError || !rewardSession) return;
    const attemptKey = `${rewardSession.sessionId}:${rewardedState.actionIndex}`;
    if (settleAttemptRef.current === attemptKey) return;
    settleAttemptRef.current = attemptKey;
    submitRewardedAction({ kind: "action", idempotencyKey: createIdempotencyKey(), action: { op: "settle" } });
  }, [isBusy, mode, now, rewardError, rewardSession, rewardedState.actionIndex, rewardedState.deadlineAt, rewardedState.phase, submitRewardedAction]);

  const activeOrder = state.activeOrder;
  const isServing = state.phase === BOBA_CAFE_PHASES.serving;
  const canServe = isTrayComplete(state.tray);
  const patiencePercent = activeOrder
    ? (mode === "rewarded" ? getRewardedBobaPatiencePercent(state, now) : getPatiencePercent(activeOrder, now))
    : 0;
  const practiceIntent = useMemo(() => buildBobaCafeRewardIntent({
    state: practiceState,
    durationMs: Math.max(0, Date.now() - new Date(practiceState.startedAt).getTime()),
  }), [practiceState]);
  const displayedIntent = mode === "rewarded"
    ? createBobaCafeReceiptIntent(rewardReceipt)
    : practiceIntent;

  const selectOption = useCallback((stationKey, ordinal) => {
    if (isBusy || rewardError || !isServing) return;
    if (mode === "rewarded") {
      const options = BOBA_OPTIONS_BY_STATION[stationKey] || [];
      const choice = options[ordinal - 1]?.key;
      if (!choice) return;
      submitRewardedAction({
        kind: "action",
        idempotencyKey: createIdempotencyKey(),
        action: { op: "select", station: stationKey, choice },
      });
    } else {
      setPracticeState((current) => selectCafeOptionByShortcut(current, stationKey, ordinal));
    }
    const nextStation = STATION_ORDER[STATION_ORDER.indexOf(stationKey) + 1];
    if (nextStation) setActiveStation(nextStation);
  }, [isBusy, isServing, mode, rewardError, submitRewardedAction]);

  const handleNext = useCallback(() => {
    if (isBusy || rewardError) return;
    if (mode === "rewarded") {
      submitRewardedAction({ kind: "action", idempotencyKey: createIdempotencyKey(), action: { op: "next" } });
    } else {
      setPracticeState((current) => startNextBobaOrder(current));
    }
    setActiveStation("tea");
  }, [isBusy, mode, rewardError, submitRewardedAction]);

  const handleSubmit = useCallback(() => {
    if (!canServe || isBusy || rewardError) return;
    if (mode === "rewarded") {
      submitRewardedAction({ kind: "action", idempotencyKey: createIdempotencyKey(), action: { op: "serve" } });
    } else {
      setPracticeState((current) => (isTrayComplete(current.tray) ? submitBobaDrink(current) : current));
    }
  }, [canServe, isBusy, mode, rewardError, submitRewardedAction]);

  const handleClear = useCallback(() => {
    if (isBusy || rewardError || !isServing) return;
    if (mode === "rewarded") {
      submitRewardedAction({ kind: "action", idempotencyKey: createIdempotencyKey(), action: { op: "clear" } });
    } else {
      setPracticeState((current) => clearBobaTray(current));
    }
    setActiveStation("tea");
  }, [isBusy, isServing, mode, rewardError, submitRewardedAction]);

  const handleAction = useCallback((action) => {
    if (isBusy) return;
    if (action === GAME_ACTIONS.confirm || action === GAME_ACTIONS.primary) {
      if (state.phase === BOBA_CAFE_PHASES.result) handleNext();
      else if (isServing && canServe) handleSubmit();
    }
    if (action === GAME_ACTIONS.cancel && isServing) handleClear();
  }, [canServe, handleClear, handleNext, handleSubmit, isBusy, isServing, state.phase]);

  useGameControls({ enabled: true, onAction: handleAction, preserveNativeButtonActivation: true });

  useEffect(() => {
    const handleNumberShortcut = (event) => {
      if (!isServing || isBusy || event.metaKey || event.ctrlKey || event.altKey) return;
      const tagName = event.target?.tagName?.toUpperCase();
      if (event.target?.isContentEditable || ["BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;
      const ordinal = Number(event.key);
      if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 4) return;
      event.preventDefault();
      selectOption(activeStation, ordinal);
    };
    window.addEventListener("keydown", handleNumberShortcut);
    return () => window.removeEventListener("keydown", handleNumberShortcut);
  }, [activeStation, isBusy, isServing, selectOption]);

  const submitClaim = useCallback(async (request) => {
    if (!rewardSession) return;
    const receipt = await runRequest(request, () => claimGameReward(supabase, {
      sessionId: rewardSession.sessionId,
      idempotencyKey: request.idempotencyKey,
      evidence: {},
    }));
    if (receipt) setRewardReceipt(receipt);
  }, [rewardSession, runRequest]);

  const handleClaim = () => {
    if (mode === "practice") {
      setPracticeState((current) => markBobaCafeClaimed(current));
      return;
    }
    if (state.phase !== BOBA_CAFE_PHASES.shiftComplete || isBusy || rewardReceipt) return;
    submitClaim({ kind: "claim", idempotencyKey: createIdempotencyKey() });
  };

  const handleRetry = () => {
    if (!retryRequest || isBusy) return;
    if (retryRequest.kind === "start") startRewardedShift();
    if (retryRequest.kind === "action") submitRewardedAction(retryRequest);
    if (retryRequest.kind === "claim") submitClaim(retryRequest);
  };

  const handleRestart = () => {
    if (mode === "rewarded") {
      if (rewardReceipt) startRewardedShift();
      return;
    }
    setPracticeState(createInitialBobaCafeState({ seed: CAFE_SEED }));
    setActiveStation("tea");
    setNow(Date.now());
  };

  const choosePractice = () => {
    setMode("practice");
    setRewardError("");
    setRetryRequest(null);
  };

  const sidebar = (
    <div className="boba-cafe__sidebar">
      <section className="boba-cafe__mode" aria-live="polite">
        <strong>{mode === "rewarded" ? "Rewarded shift" : "Practice shift"}</strong>
        <span>{mode === "rewarded" ? "Server validated · portal rewards" : "Local only · no portal rewards"}</span>
        {mode === "rewarded" ? (
          <button type="button" onClick={choosePractice}>Practice instead</button>
        ) : (
          <button type="button" onClick={isAuthenticated ? startRewardedShift : openLogin} disabled={isLoadingAuth}>
            <LogIn aria-hidden="true" /> {isAuthenticated ? "Start rewarded shift" : "Sign in for rewards"}
          </button>
        )}
      </section>

      {state.phase === BOBA_CAFE_PHASES.shiftComplete ? (
        <GameResultSheet
          intent={displayedIntent}
          rewardLabel={mode === "rewarded" && rewardReceipt ? "Portal rewards" : "Practice reward preview"}
          finalReward={mode === "rewarded" && Boolean(rewardReceipt)}
          record={{ label: "Best combo", value: `${state.bestCombo} · ${state.perfectCount} perfect` }}
          title="Moonbrew shift complete"
          onReturn={() => navigate("/quarters")}
        />
      ) : (
        <BobaOrderTicket
          order={activeOrder}
          tray={state.tray}
          patiencePercent={patiencePercent}
          ticketNumber={Math.min(state.servedCount + 1, BOBA_ORDER_LIMIT)}
          ticketTotal={BOBA_ORDER_LIMIT}
        />
      )}

      <dl className="boba-cafe__stats">
        <div><dt>Score</dt><dd>{state.score}</dd></div>
        <div><dt>Combo</dt><dd>{state.combo}</dd></div>
        <div><dt>Perfect</dt><dd>{state.perfectCount}</dd></div>
        <div><dt>Served</dt><dd>{state.servedCount}/{BOBA_ORDER_LIMIT}</dd></div>
      </dl>

      {rewardError ? (
        <section className="boba-cafe__error" role="alert">
          <strong>{rewardError}</strong>
          <button className="boba-cafe__button" type="button" onClick={handleRetry} disabled={isBusy}>Retry safely</button>
        </section>
      ) : null}

      {state.phase === BOBA_CAFE_PHASES.result ? (
        <section className="boba-cafe__result" aria-live="polite">
          <p>Order result</p>
          <strong>{state.lastResult?.message}</strong>
          <button className="boba-cafe__button boba-cafe__button--primary" type="button" onClick={handleNext} disabled={isBusy || Boolean(rewardError)}>
            Next ticket <kbd>Enter</kbd>
          </button>
        </section>
      ) : null}

      {state.phase === BOBA_CAFE_PHASES.shiftComplete ? (
        <div className="boba-cafe__actions">
          <button className="boba-cafe__button boba-cafe__button--primary" type="button" onClick={handleClaim} disabled={isBusy || Boolean(rewardError) || (mode === "rewarded" ? Boolean(rewardReceipt) : !practiceIntent)}>
            <Gift aria-hidden="true" /> {mode === "rewarded" ? (rewardReceipt ? "Rewards recorded" : "Claim portal rewards") : (practiceIntent ? "Save practice preview" : "Practice preview saved")}
          </button>
          <button className="boba-cafe__button" type="button" onClick={handleRestart} disabled={mode === "rewarded" && !rewardReceipt}>
            <RotateCcw aria-hidden="true" /> New shift
          </button>
        </div>
      ) : null}

      <p className="boba-cafe__help">
        Click a station and ingredient, or use its number key. <kbd>Enter</kbd> serves a complete cup and advances tickets. <kbd>Esc</kbd> clears the tray.
      </p>
    </div>
  );

  return (
    <div className="boba-cafe">
      <GameShell
        world="boba-cafe"
        eyebrow="Priory Courtyard · Moonbrew Counter"
        title="Boba Shrine Cafe"
        status={(
          <div className="boba-cafe__status" aria-label="Shift status">
            <span>{mode === "rewarded" ? "Rewarded" : "Practice"}</span>
            <span>Ticket {Math.min(state.servedCount + 1, BOBA_ORDER_LIMIT)}/{BOBA_ORDER_LIMIT}</span>
            <span>{state.phase === BOBA_CAFE_PHASES.shiftComplete ? "Closed" : `${patiencePercent}% patience`}</span>
          </div>
        )}
        sidebar={sidebar}
      >
        {state.phase !== BOBA_CAFE_PHASES.shiftComplete ? (
          <div className="boba-cafe__mobile-order">
            <BobaOrderTicket
              compact
              order={activeOrder}
              tray={state.tray}
              patiencePercent={patiencePercent}
              ticketNumber={Math.min(state.servedCount + 1, BOBA_ORDER_LIMIT)}
              ticketTotal={BOBA_ORDER_LIMIT}
            />
          </div>
        ) : null}
        <div className="boba-cafe__scene">
          <BobaCounter familiar={familiar} order={activeOrder} tray={state.tray} phase={state.phase} result={state.lastResult} />
        </div>
        {state.phase === BOBA_CAFE_PHASES.result ? (
          <div className="boba-cafe__mobile-action">
            <button className="boba-cafe__button boba-cafe__button--primary" type="button" onClick={handleNext} disabled={isBusy || Boolean(rewardError)}>Next ticket</button>
          </div>
        ) : null}
        <BobaStationTray
          activeStation={activeStation}
          tray={state.tray}
          disabled={!isServing || isBusy || Boolean(rewardError)}
          canServe={canServe}
          onStationChange={setActiveStation}
          onOptionSelect={selectOption}
          onClear={handleClear}
          onServe={handleSubmit}
        />
      </GameShell>
    </div>
  );
}

function createIdempotencyKey() {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("This browser cannot create secure reward request IDs.");
  }
  return crypto.randomUUID();
}
