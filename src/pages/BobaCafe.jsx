import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, RotateCcw } from "lucide-react";
import BobaCounter from "@/games/bobaCafe/ui/BobaCounter";
import BobaOrderTicket from "@/games/bobaCafe/ui/BobaOrderTicket";
import BobaStationTray from "@/games/bobaCafe/ui/BobaStationTray";
import "@/games/bobaCafe/ui/boba-cafe.css";
import {
  BOBA_CAFE_PHASES,
  BOBA_CAFE_REWARD_LOG_KEY,
  BOBA_CAFE_STORAGE_KEY,
  BOBA_ORDER_LIMIT,
  buildBobaCafeRewardIntent,
  clearBobaTray,
  createInitialBobaCafeState,
  getPatiencePercent,
  isTrayComplete,
  markBobaCafeClaimed,
  readLocalJson,
  selectCafeOptionByShortcut,
  startNextBobaOrder,
  submitBobaDrink,
  tickBobaCafe,
  writeLocalJson,
} from "@/games/bobaCafe/simulation/bobaCafeRules";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import GameShell from "@/games/shared/ui/GameShell";

const CAFE_SEED = "dulcis-cafe-v1";
const STATION_ORDER = ["tea", "milk", "topping", "charm", "sweetness"];

export default function BobaCafe() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const [activeStation, setActiveStation] = useState("tea");
  const [state, setState] = useState(() => (
    readLocalJson(BOBA_CAFE_STORAGE_KEY, null) || createInitialBobaCafeState({ seed: CAFE_SEED })
  ));
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(BOBA_CAFE_REWARD_LOG_KEY, []));

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);
      setState((current) => tickBobaCafe(current, currentNow));
    }, 250);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => writeLocalJson(BOBA_CAFE_STORAGE_KEY, state), [state]);
  useEffect(() => writeLocalJson(BOBA_CAFE_REWARD_LOG_KEY, rewardLog.slice(0, 20)), [rewardLog]);

  const activeOrder = state.activeOrder;
  const isServing = state.phase === BOBA_CAFE_PHASES.serving;
  const canServe = isTrayComplete(state.tray);
  const patiencePercent = activeOrder ? getPatiencePercent(activeOrder, now) : 0;
  const canClaim = state.score > state.claimedScore;
  const pendingIntent = useMemo(() => buildBobaCafeRewardIntent({
    state,
    durationMs: Math.max(0, Date.now() - new Date(state.startedAt).getTime()),
  }), [state]);
  const displayedIntent = pendingIntent || rewardLog[0] || null;

  const selectOption = useCallback((stationKey, ordinal) => {
    setState((current) => selectCafeOptionByShortcut(current, stationKey, ordinal));
    const nextStation = STATION_ORDER[STATION_ORDER.indexOf(stationKey) + 1];
    if (nextStation) setActiveStation(nextStation);
  }, []);

  const handleNext = useCallback(() => {
    setState((current) => startNextBobaOrder(current));
    setActiveStation("tea");
  }, []);

  const handleSubmit = useCallback(() => {
    setState((current) => (isTrayComplete(current.tray) ? submitBobaDrink(current) : current));
  }, []);

  const handleClear = useCallback(() => {
    setState((current) => clearBobaTray(current));
    setActiveStation("tea");
  }, []);

  const handleAction = useCallback((action) => {
    if (action === GAME_ACTIONS.confirm || action === GAME_ACTIONS.primary) {
      if (state.phase === BOBA_CAFE_PHASES.result) handleNext();
      else if (isServing && canServe) handleSubmit();
    }
    if (action === GAME_ACTIONS.cancel && isServing) handleClear();
  }, [canServe, handleClear, handleNext, handleSubmit, isServing, state.phase]);

  useGameControls({ enabled: true, onAction: handleAction });

  useEffect(() => {
    const handleNumberShortcut = (event) => {
      if (!isServing || event.metaKey || event.ctrlKey || event.altKey) return;
      const tagName = event.target?.tagName?.toUpperCase();
      if (event.target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;
      const ordinal = Number(event.key);
      if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 9) return;
      event.preventDefault();
      selectOption(activeStation, ordinal);
    };
    window.addEventListener("keydown", handleNumberShortcut);
    return () => window.removeEventListener("keydown", handleNumberShortcut);
  }, [activeStation, isServing, selectOption]);

  const handleClaim = () => {
    if (!pendingIntent) return;
    setRewardLog((current) => [pendingIntent, ...current].slice(0, 20));
    setState((current) => markBobaCafeClaimed(current));
  };

  const handleRestart = () => {
    setState(createInitialBobaCafeState({ seed: CAFE_SEED }));
    setActiveStation("tea");
    setNow(Date.now());
  };

  const sidebar = (
    <div className="boba-cafe__sidebar">
      {state.phase === BOBA_CAFE_PHASES.shiftComplete ? (
        <GameResultSheet
          intent={displayedIntent}
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

      {state.phase === BOBA_CAFE_PHASES.result ? (
        <section className="boba-cafe__result" aria-live="polite">
          <p>Order result</p>
          <strong>{state.lastResult?.message}</strong>
          <button className="boba-cafe__button boba-cafe__button--primary" type="button" onClick={handleNext}>
            Next ticket <kbd>Enter</kbd>
          </button>
        </section>
      ) : null}

      {state.phase === BOBA_CAFE_PHASES.shiftComplete ? (
        <div className="boba-cafe__actions">
          <button className="boba-cafe__button boba-cafe__button--primary" type="button" onClick={handleClaim} disabled={!canClaim}>
            <Gift aria-hidden="true" /> {canClaim ? "Bank local reward preview" : "Reward preview banked"}
          </button>
          <button className="boba-cafe__button" type="button" onClick={handleRestart}>
            <RotateCcw aria-hidden="true" /> New shift
          </button>
        </div>
      ) : null}

      <p className="boba-cafe__help">
        Click a station and ingredient, or press <kbd>1-4</kbd>. <kbd>Enter</kbd> serves a complete cup and advances tickets. <kbd>Esc</kbd> clears the tray.
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
            <span>Ticket {Math.min(state.servedCount + 1, BOBA_ORDER_LIMIT)}/{BOBA_ORDER_LIMIT}</span>
            <span>{state.phase === BOBA_CAFE_PHASES.shiftComplete ? "Closed" : `${patiencePercent}% patience`}</span>
          </div>
        )}
        sidebar={sidebar}
      >
        <div className="boba-cafe__scene">
          <BobaCounter order={activeOrder} tray={state.tray} phase={state.phase} result={state.lastResult} />
        </div>
        <BobaStationTray
          activeStation={activeStation}
          tray={state.tray}
          disabled={!isServing}
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
