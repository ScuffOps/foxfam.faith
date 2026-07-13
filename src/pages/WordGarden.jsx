import { useCallback, useEffect, useMemo, useState } from "react";
import { Flower2, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import GameShell from "@/games/shared/ui/GameShell";
import { GAME_ACTIONS } from "@/games/shared/input/actions.js";
import { useGameControls } from "@/games/shared/input/useGameControls.js";
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
  const [state, setState] = useState(createSavedGarden);
  const [rewardIntent, setRewardIntent] = useState(null);
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(WORD_GARDEN_REWARD_LOG_KEY, []));
  const isPlaying = state.status === WORD_GARDEN_STATUS.playing;
  const score = useMemo(() => calculateWordGardenScore(state), [state]);

  useEffect(() => writeLocalJson(WORD_GARDEN_STORAGE_KEY, state), [state]);
  useEffect(() => writeLocalJson(WORD_GARDEN_REWARD_LOG_KEY, rewardLog.slice(0, 25)), [rewardLog]);

  const addLetter = useCallback((letter) => setState((current) => appendPetal(current, letter)), []);
  const deleteLetter = useCallback(() => setState((current) => removePetal(current)), []);
  const shuffle = useCallback(() => setState((current) => shufflePetals(current)), []);
  const submit = useCallback(() => setState((current) => submitGardenWord(current).state), []);
  const clearDraft = useCallback(() => setState((current) => ({ ...current, draftWord: "", lastError: "" })), []);

  const onAction = useCallback((action) => {
    if (action === GAME_ACTIONS.confirm) submit();
    if (action === GAME_ACTIONS.cancel) clearDraft();
    if (action === GAME_ACTIONS.primary) shuffle();
  }, [clearDraft, shuffle, submit]);
  useGameControls({ enabled: isPlaying, onAction });

  useEffect(() => {
    if (!isPlaying) return undefined;
    const handleLetterKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tagName = event.target?.tagName?.toUpperCase();
      if (event.target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;
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
  }, [addLetter, deleteLetter, isPlaying]);

  const finishGarden = () => {
    const next = completeWordGarden(state);
    setState(next);
    if (next.status !== WORD_GARDEN_STATUS.complete || state.status === WORD_GARDEN_STATUS.complete) return;
    const intent = buildWordGardenRewardIntent({
      state: next,
      durationMs: Math.max(0, Date.now() - new Date(next.startedAt).getTime()),
    });
    setRewardIntent(intent);
    if (intent) setRewardLog((entries) => [intent, ...entries].slice(0, 25));
  };

  const resetGarden = () => {
    setState(createWordGardenState({ seedKey: getLocalDateKey() }));
    setRewardIntent(null);
  };

  const sidebar = state.status === WORD_GARDEN_STATUS.complete ? (
    <GameResultSheet
      intent={rewardIntent || buildWordGardenRewardIntent({ state })}
      record={{ label: `${state.foundWords.length} words`, value: `${score} dewlight` }}
      title="Garden resting"
      onReturn={() => navigate("/quarters")}
    />
  ) : <WordGardenHud state={state} onComplete={finishGarden} />;

  return (
    <GameShell
      world="word-garden"
      eyebrow="Priory conservatory"
      title="Word Garden"
      status={<span className="game-interaction-prompt"><Flower2 aria-hidden="true" /> {state.puzzleTitle} · {state.seedKey.slice(5)}</span>}
      actions={(
        <button className="game-icon-button" type="button" onClick={resetGarden} aria-label="Reset today's local garden" title="Reset today's local garden">
          <RotateCcw aria-hidden="true" />
        </button>
      )}
      sidebar={sidebar}
    >
      <div className="word-garden-scene">
        <div className="word-garden-scene__glasshouse" aria-hidden="true" />
        <div className="word-garden-scene__canopy">
          <p>Today's heart letter</p>
          <h2>Every bloom carries {state.center}</h2>
        </div>
        <div className="word-garden-scene__controls" aria-label="Keyboard controls">
          <span><kbd>A-Z</kbd> petals</span><span><kbd>Enter</kbd> bloom</span><span><kbd>⌫</kbd> prune</span><span><kbd>Space</kbd> shuffle</span><span><kbd>Esc</kbd> clear</span>
        </div>
        {state.lastError ? <p className="word-garden-scene__error" role="alert">{state.lastError}</p> : null}
        <WordFlower
          center={state.center}
          petals={state.petals}
          draftWord={state.draftWord}
          disabled={!isPlaying}
          onPetal={addLetter}
          onRemove={deleteLetter}
          onShuffle={shuffle}
          onSubmit={submit}
        />
      </div>
    </GameShell>
  );
}
