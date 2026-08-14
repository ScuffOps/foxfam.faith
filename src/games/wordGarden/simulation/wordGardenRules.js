import { buildRewardIntent, DUPLICATE_POLICIES, applyLocalRewardCap } from "../../../lib/gameRewards.js";
import { getDailyWordGardenPuzzle, getLocalDateKey } from "../content/wordGardenCatalog.js";

export const WORD_GARDEN_STORAGE_KEY = "foxfam_word_garden_state_v1";
export const WORD_GARDEN_REWARD_LOG_KEY = "foxfam_word_garden_reward_log_v1";

export const WORD_GARDEN_STATUS = Object.freeze({
  playing: "playing",
  complete: "complete",
});

export function createWordGardenState({
  seedKey,
  letters,
  center,
  acceptedWords,
  featuredWords,
  fullBloomWords,
  theme,
  themePrompt,
  now = Date.now(),
} = {}) {
  const resolvedSeedKey = seedKey || getLocalDateKey(now);
  const puzzle = getDailyWordGardenPuzzle(resolvedSeedKey);
  const normalizedLetters = uniqueLetters(letters || puzzle.letters);
  const normalizedCenter = normalizeLetter(center || puzzle.center);

  if (normalizedLetters.length !== 7 || !normalizedLetters.includes(normalizedCenter)) {
    throw new Error("Word Garden puzzles require seven unique letters and a center letter from that set.");
  }

  return {
    seedKey: resolvedSeedKey,
    puzzleKey: puzzle.key,
    puzzleTitle: puzzle.title,
    theme: theme || puzzle.theme,
    themePrompt: themePrompt || puzzle.themePrompt,
    letters: normalizedLetters,
    center: normalizedCenter,
    petals: normalizedLetters.split("").filter((letter) => letter !== normalizedCenter),
    acceptedWords: normalizeWordList(acceptedWords || puzzle.acceptedWords),
    featuredWords: normalizeWordList(featuredWords || puzzle.featuredWords),
    fullBloomWords: normalizeWordList(fullBloomWords || puzzle.fullBloomWords),
    hintedWords: [],
    draftWord: "",
    foundWords: [],
    status: WORD_GARDEN_STATUS.playing,
    shuffleCount: 0,
    startedAt: new Date(now).toISOString(),
    completedAt: null,
    lastError: "",
  };
}

export function appendPetal(state, rawLetter) {
  if (!isPlaying(state)) return state;
  const letter = normalizeLetter(rawLetter);
  if (!state.letters.includes(letter)) return { ...state, lastError: "Choose one of the seven garden letters." };
  return { ...state, draftWord: `${state.draftWord}${letter}`, lastError: "" };
}

export function removePetal(state) {
  if (!isPlaying(state)) return state;
  return { ...state, draftWord: state.draftWord.slice(0, -1), lastError: "" };
}

export function submitGardenWord(state, rawWord = state?.draftWord || "", { now = Date.now() } = {}) {
  if (!isPlaying(state)) return { state, error: "Today's garden is resting." };
  const word = normalizeWord(rawWord);
  const error = validateGardenWord(state, word);
  if (error) return { state: { ...state, lastError: error }, error };

  const scored = scoreGardenWord(word, state);
  const foundWord = {
    word,
    score: scored.score,
    isFullBloom: scored.isFullBloom,
    foundAt: new Date(now).toISOString(),
  };

  return {
    state: {
      ...state,
      draftWord: "",
      foundWords: [...state.foundWords, foundWord],
      lastError: "",
    },
    foundWord,
    error: null,
  };
}

export function shufflePetals(state) {
  if (!state?.petals?.length) return state;
  const nextCount = (state.shuffleCount || 0) + 1;
  const offset = nextCount % state.petals.length;
  const rotated = [...state.petals.slice(offset), ...state.petals.slice(0, offset)];
  return { ...state, petals: nextCount % 2 === 0 ? rotated.reverse() : rotated, shuffleCount: nextCount };
}

export function scoreGardenWord(rawWord, puzzle) {
  const word = normalizeWord(rawWord);
  const usedLetters = new Set(word);
  const isFullBloom = String(puzzle.letters).split("").every((letter) => usedLetters.has(letter));
  return { score: word.length + (isFullBloom ? 7 : 0), isFullBloom };
}

export function calculateWordGardenScore(state) {
  return (state?.foundWords || []).reduce((total, foundWord) => total + Number(foundWord.score || 0), 0);
}

export function completeWordGarden(state, { now = Date.now() } = {}) {
  if (!isPlaying(state)) return state;
  if (!state.foundWords.length) return { ...state, lastError: "Bloom at least one word before resting." };
  return { ...state, status: WORD_GARDEN_STATUS.complete, completedAt: new Date(now).toISOString(), draftWord: "", lastError: "" };
}

export function getWordGardenJournal(state) {
  const foundWords = new Set((state?.foundWords || []).map((entry) => entry.word));
  const hintedWords = new Set(state?.hintedWords || []);
  const entries = (state?.featuredWords || []).map((word) => {
    const isFound = foundWords.has(word);
    const isHinted = !isFound && hintedWords.has(word);
    return {
      word,
      isFound,
      isHinted,
      display: isFound ? word : `${isHinted ? word[0] : "_"}${"_".repeat(word.length - 1)}`,
    };
  });
  return {
    entries,
    foundCount: entries.filter((entry) => entry.isFound).length,
    remainingCount: entries.filter((entry) => !entry.isFound).length,
    canRevealHint: entries.some((entry) => !entry.isFound && !entry.isHinted),
  };
}

export function revealWordGardenHint(state) {
  if (!isPlaying(state)) return state;
  const nextEntry = getWordGardenJournal(state).entries.find((entry) => !entry.isFound && !entry.isHinted);
  if (!nextEntry) return state;
  return { ...state, hintedWords: [...(state.hintedWords || []), nextEntry.word], lastError: "" };
}

export function buildWordGardenRewardIntent({ state, durationMs = 0 }) {
  if (!state || state.status !== WORD_GARDEN_STATUS.complete || !state.foundWords.length) return null;
  const score = calculateWordGardenScore(state);
  const fullBloomCount = state.foundWords.filter((word) => word.isFullBloom).length;
  const achievementKeys = ["word-garden-first-sprout"];
  if (fullBloomCount) achievementKeys.push("word-garden-full-bloom");

  return applyLocalRewardCap(buildRewardIntent({
    gameKey: "word-garden",
    eventType: "daily-garden-complete",
    score,
    durationMs,
    favorPreview: Math.max(3, Math.floor(score / 4)),
    items: [{
      key: "blooming-ink",
      label: "Blooming Ink",
      quantity: Math.min(5, state.foundWords.length + fullBloomCount),
      type: "material",
    }],
    achievementKeys,
    duplicatePolicy: DUPLICATE_POLICIES.none,
  }), 80);
}

export function validateGardenWord(state, word) {
  if (word.length < 4) return "Words need at least 4 letters.";
  if (!word.includes(state.center)) return `Every word must use ${state.center}.`;
  if (Array.from(word).some((letter) => !state.letters.includes(letter))) return "Use only the seven garden letters.";
  if (!state.acceptedWords.includes(word)) return "That word is not in today's garden.";
  if (state.foundWords.some((foundWord) => foundWord.word === word)) return `${word} has already bloomed.`;
  return "";
}

export function readLocalJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is optional; gameplay remains available without it.
  }
}

function isPlaying(state) {
  return Boolean(state && state.status === WORD_GARDEN_STATUS.playing);
}

function normalizeLetter(value) {
  return normalizeWord(value).slice(0, 1);
}

function normalizeWord(value = "") {
  return String(value).trim().toUpperCase();
}

function normalizeWordList(words = []) {
  return [...new Set(words.map(normalizeWord).filter(Boolean))];
}

function uniqueLetters(value) {
  return [...new Set(normalizeWord(value).split(""))].join("");
}
