import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flower2, LogIn, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/communityClient";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import GameShell from "@/games/shared/ui/GameShell";
import { GAME_ACTIONS } from "@/games/shared/input/actions.js";
import { useGameControls } from "@/games/shared/input/useGameControls.js";
import {
  claimGameReward,
  progressGameRewardSession,
  startGameRewardSession,
} from "@/games/shared/rewards/gameRewardClient";
import { getLocalDateKey } from "@/games/wordGarden/content/wordGardenCatalog.js";
import WordFlower from "@/games/wordGarden/ui/WordFlower";
import WordGardenHud from "@/games/wordGarden/ui/WordGardenHud";
import {
  WORD_GARDEN_REWARD_LOG_KEY,
  WORD_GARDEN_STATUS,
  WORD_GARDEN_STORAGE_KEY,
  appendPetal,
  buildWordGardenRewardIntent,
  calculateWordGardenScore,
  completeWordGarden,
  createWordGardenState,
  readLocalJson,
  removePetal,
  shufflePetals,
  submitGardenWord,
  writeLocalJson,
} from "@/games/wordGarden/simulation/wordGardenRules.js";
import {
  createRewardedWordGardenState,
  createWordGardenReceiptIntent,
  validateRewardedGardenDraft,
} from "@/games/wordGarden/simulation/wordGardenRewardModel.js";
import { useAuth } from "@/lib/AuthContext";
import "@/games/wordGarden/ui/word-garden.css";

function createSavedGarden() {
  const seedKey = getLocalDateKey();
  const fresh = createWordGardenState({ seedKey });
  const saved = readLocalJson(WORD_GARDEN_STORAGE_KEY, null);
  if (!saved || saved.seedKey !== seedKey || !Array.isArray(saved.foundWords)) return fresh;

  return {
    ...fresh,
    draftWord: typeof saved.draftWord === "string" ? saved.draftWord : "",
    foundWords: saved.foundWords,
    petals: Array.isArray(saved.petals) && saved.petals.length === 6 ? saved.petals : fresh.petals,
    shuffleCount: Number(saved.shuffleCount) || 0,
    status: saved.status === WORD_GARDEN_STATUS.complete ? WORD_GARDEN_STATUS.complete : WORD_GARDEN_STATUS.playing,
    startedAt: saved.startedAt || fresh.startedAt,
    completedAt: saved.completedAt || null,
    lastError: "",
  };
}

export default function WordGarden() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, openLogin } = useAuth();
  const [mode, setMode] = useState("practice");
  const [practiceState, setPracticeState] = useState(createSavedGarden);
  const [rewardedState, setRewardedState] = useState(() => createWordGardenState({ seedKey: getLocalDateKey() }));
  const [rewardSession, setRewardSession] = useState(null);
  const [rewardReceipt, setRewardReceipt] = useState(null);
  const [rewardError, setRewardError] = useState("");
  const [retryRequest, setRetryRequest] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [practiceRewardIntent, setPracticeRewardIntent] = useState(null);
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(WORD_GARDEN_REWARD_LOG_KEY, []));
  const requestInFlightRef = useRef(false);
  const state = mode === "rewarded" ? rewardedState : practiceState;
  const isPlaying = state.status === WORD_GARDEN_STATUS.playing;
  const score = useMemo(() => calculateWordGardenScore(state), [state]);

  useEffect(() => writeLocalJson(WORD_GARDEN_STORAGE_KEY, practiceState), [practiceState]);
  useEffect(() => writeLocalJson(WORD_GARDEN_REWARD_LOG_KEY, rewardLog.slice(0, 25)), [rewardLog]);

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

  const startRewardedGarden = useCallback(async () => {
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
      return startGameRewardSession(supabase, "word-garden");
    });
    if (!session) return;
    setRewardSession(session);
    setRewardedState((current) => createRewardedWordGardenState(session, current));
  }, [isAuthenticated, openLogin, runRequest]);

  const submitRewardedAction = useCallback(async (request) => {
    if (!rewardSession) return;
    const result = await runRequest(request, () => progressGameRewardSession(supabase, {
      sessionId: rewardSession.sessionId,
      idempotencyKey: request.idempotencyKey,
      action: request.action,
    }));
    if (!result) return;
    setRewardedState((current) => {
      const next = createRewardedWordGardenState({
        puzzle: rewardSession.puzzle,
        context: result.state,
      }, current);
      return request.clearDraft ? { ...next, draftWord: "" } : next;
    });
  }, [rewardSession, runRequest]);

  const updateActiveState = useCallback((updater) => {
    if (mode === "rewarded") setRewardedState(updater);
    else setPracticeState(updater);
  }, [mode]);
  const addLetter = useCallback((letter) => updateActiveState((current) => appendPetal(current, letter)), [updateActiveState]);
  const deleteLetter = useCallback(() => updateActiveState((current) => removePetal(current)), [updateActiveState]);
  const shuffle = useCallback(() => updateActiveState((current) => shufflePetals(current)), [updateActiveState]);
  const clearDraft = useCallback(() => updateActiveState((current) => ({ ...current, draftWord: "", lastError: "" })), [updateActiveState]);

  const submit = useCallback(() => {
    if (isBusy || rewardError) return;
    if (mode === "practice") {
      setPracticeState((current) => submitGardenWord(current).state);
      return;
    }
    const error = validateRewardedGardenDraft(rewardedState);
    if (error) {
      setRewardedState((current) => ({ ...current, lastError: error }));
      return;
    }
    submitRewardedAction({
      kind: "action",
      idempotencyKey: createIdempotencyKey(),
      action: { op: "submit", word: rewardedState.draftWord },
      clearDraft: true,
    });
  }, [isBusy, mode, rewardError, rewardedState, submitRewardedAction]);

  const onAction = useCallback((action) => {
    if (action === GAME_ACTIONS.confirm) submit();
    if (action === GAME_ACTIONS.cancel) clearDraft();
    if (action === GAME_ACTIONS.primary) shuffle();
  }, [clearDraft, shuffle, submit]);
  useGameControls({ enabled: isPlaying && !isBusy, onAction, preserveNativeButtonActivation: true });

  useEffect(() => {
    if (!isPlaying) return undefined;
    const handleLetterKey = (event) => {
      if (isBusy || event.metaKey || event.ctrlKey || event.altKey) return;
      const tagName = event.target?.tagName?.toUpperCase();
      if (event.target?.isContentEditable || ["BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;
      if (event.key === "Backspace") {
        event.preventDefault();
        deleteLetter();
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        addLetter(event.key);
      }
    };
    window.addEventListener("keydown", handleLetterKey);
    return () => window.removeEventListener("keydown", handleLetterKey);
  }, [addLetter, deleteLetter, isBusy, isPlaying]);

  const finishGarden = () => {
    if (isBusy || rewardError) return;
    if (mode === "rewarded") {
      submitRewardedAction({
        kind: "action",
        idempotencyKey: createIdempotencyKey(),
        action: { op: "rest" },
      });
      return;
    }
    const next = completeWordGarden(practiceState);
    setPracticeState(next);
    if (next.status !== WORD_GARDEN_STATUS.complete || practiceState.status === WORD_GARDEN_STATUS.complete) return;
    const intent = buildWordGardenRewardIntent({
      state: next,
      durationMs: Math.max(0, Date.now() - new Date(next.startedAt).getTime()),
    });
    setPracticeRewardIntent(intent);
    if (intent) setRewardLog((entries) => [intent, ...entries].slice(0, 25));
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

  const handleResultChoice = () => {
    if (mode === "practice" || rewardReceipt || isBusy) return;
    submitClaim({ kind: "claim", idempotencyKey: createIdempotencyKey() });
  };

  const handleRetry = () => {
    if (!retryRequest || isBusy) return;
    if (retryRequest.kind === "start") startRewardedGarden();
    if (retryRequest.kind === "action") submitRewardedAction(retryRequest);
    if (retryRequest.kind === "claim") submitClaim(retryRequest);
  };

  const choosePractice = () => {
    setMode("practice");
    setRewardError("");
    setRetryRequest(null);
  };

  const resetGarden = () => {
    setPracticeState(createWordGardenState({ seedKey: getLocalDateKey() }));
    setPracticeRewardIntent(null);
  };

  const displayedIntent = mode === "rewarded"
    ? createWordGardenReceiptIntent(rewardReceipt)
    : (practiceRewardIntent || buildWordGardenRewardIntent({ state }));

  const sidebar = (
    <div className="word-garden-sidebar">
      <ModePanel
        mode={mode}
        isAuthenticated={isAuthenticated}
        isLoadingAuth={isLoadingAuth}
        isBusy={isBusy}
        onPractice={choosePractice}
        onRewarded={startRewardedGarden}
      />
      {state.status === WORD_GARDEN_STATUS.complete ? (
        <GameResultSheet
          intent={displayedIntent}
          rewardLabel={mode === "rewarded" ? (rewardReceipt ? "Portal rewards" : "Server-validated result") : "Practice reward preview"}
          finalReward={mode === "rewarded" && Boolean(rewardReceipt)}
          record={{ label: `${state.foundWords.length} words`, value: `${score} dewlight` }}
          title="Garden resting"
          choices={mode === "rewarded" && !rewardReceipt ? [{
            key: "claim",
            label: "Claim portal rewards",
            description: "Records server-validated Favor, Blooming Ink, and achievements.",
          }] : []}
          onChoose={handleResultChoice}
          onReturn={() => navigate("/quarters")}
        />
      ) : <WordGardenHud state={state} mode={mode} onComplete={finishGarden} />}
      {rewardError ? <RewardError message={rewardError} onRetry={handleRetry} disabled={isBusy} /> : null}
    </div>
  );

  return (
    <GameShell
      world="word-garden"
      eyebrow="Priory conservatory"
      title="Blooming Ink"
      status={<span className="game-interaction-prompt"><Flower2 aria-hidden="true" /> {state.puzzleTitle} · {state.seedKey.slice(5)}</span>}
      actions={mode === "practice" ? (
        <button className="game-icon-button" type="button" onClick={resetGarden} aria-label="Reset today's local garden" title="Reset today's local garden">
          <RotateCcw aria-hidden="true" />
        </button>
      ) : null}
      sidebar={sidebar}
    >
      <div className="word-garden-scene">
        <svg className="word-garden-scene__glasshouse" viewBox="0 0 800 320" aria-hidden="true">
          <path className="word-garden-art__back" d="M93 251V129L217 43h366l124 86v122Z" />
          <path className="word-garden-art__glass" d="M114 230V140l111-76h350l111 76v90Z" />
          <path className="word-garden-art__glass-light" d="M146 205v-52l93-64h128v116Zm287 0V89h128l93 64v52Z" />
          <path className="word-garden-art__frame" d="M93 251V129L217 43h366l124 86v122M217 43v208m366-208v208M400 43v208M93 129h614M114 230h572" />
          <path className="word-garden-art__floor" d="m80 252 320-63 320 63-320 64Z" />
          <path className="word-garden-art__aisle" d="m299 250 101-42 101 42-101 50Z" />
          <path className="word-garden-art__bench" d="M118 221h176l30 24-31 25H95l-23-19Z" />
          <path className="word-garden-art__bench-top" d="m95 219 173-1 28 14-177 4Z" />
          <path className="word-garden-art__bench" d="M506 221h176l46 30-23 19H507l-31-25Z" />
          <path className="word-garden-art__bench-top" d="m532 218 173 1 23 17-177-4Z" />
          <g className="word-garden-art__planters">
            <path d="m114 206 38-17 49 19-40 19Z" /><path d="m161 227 40-19v29l-40 19-47-21v-29Z" />
            <path d="m592 208 49-19 38 17v29l-47 21-40-19Z" /><path d="m592 208 49-19 38 17-47 21Z" />
          </g>
          <g className="word-garden-art__plants">
            <path d="M140 204q-18-25 4-37 17 17 8 37m10 0q-4-34 23-36 8 28-15 40" />
            <path d="M630 204q-8-33 19-37 12 26-10 40m-26-3q-17-27 7-38 15 18 5 40" />
          </g>
        </svg>
        <div className="word-garden-scene__canopy">
          <p>Today's heart letter</p>
          <h2>Every bloom carries {state.center}</h2>
        </div>
        <div className="word-garden-scene__controls" role="group" aria-label="Keyboard controls">
          <span><kbd>A-Z</kbd> petals</span><span><kbd>Enter</kbd> bloom</span><span><kbd>⌫</kbd> prune</span><span><kbd>Space</kbd> shuffle</span><span><kbd>Esc</kbd> clear</span>
        </div>
        {state.lastError ? <p className="word-garden-scene__error" role="alert">{state.lastError}</p> : null}
        <WordFlower
          center={state.center}
          petals={state.petals}
          draftWord={state.draftWord}
          disabled={!isPlaying || isBusy || Boolean(rewardError)}
          onPetal={addLetter}
          onRemove={deleteLetter}
          onShuffle={shuffle}
          onSubmit={submit}
        />
      </div>
    </GameShell>
  );
}

function ModePanel({ mode, isAuthenticated, isLoadingAuth, isBusy, onPractice, onRewarded }) {
  return (
    <section className="word-garden-mode" aria-label="Play mode">
      <div>
        <strong>{mode === "rewarded" ? "Rewarded garden" : "Practice garden"}</strong>
        <span>{mode === "rewarded" ? "Server validated · portal rewards" : "Local only · no portal rewards"}</span>
      </div>
      {mode === "rewarded" ? (
        <button type="button" onClick={onPractice} disabled={isBusy}>Practice instead</button>
      ) : (
        <button type="button" onClick={onRewarded} disabled={isLoadingAuth || isBusy}>
          <LogIn aria-hidden="true" /> {isAuthenticated ? "Start rewarded garden" : "Sign in for rewards"}
        </button>
      )}
    </section>
  );
}

function RewardError({ message, onRetry, disabled }) {
  return (
    <section className="word-garden-error" role="alert">
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
