import { buildRewardIntent, DUPLICATE_POLICIES, applyLocalRewardCap } from "../../../lib/gameRewards.js";
import {
  COMMUNITY_WORDLE_ACCEPTED_GUESSES,
  COMMUNITY_WORDLE_WORD_LENGTH,
  COMMUNITY_WORDLE_WORD_SET,
  getDailyCommunityWord,
  getLocalDateKey,
} from "../content/wordBank.js";

export const COMMUNITY_WORDLE_MAX_ATTEMPTS = 6;
export const COMMUNITY_WORDLE_STORAGE_KEY = "foxfam_community_wordle_state_v1";
export const COMMUNITY_WORDLE_REWARD_LOG_KEY = "foxfam_community_wordle_reward_log_v1";

export const COMMUNITY_WORDLE_STATUS = {
  playing: "playing",
  solved: "solved",
  lost: "lost",
};

export const LETTER_RESULT = {
  correct: "correct",
  present: "present",
  absent: "absent",
  empty: "empty",
};

const RESULT_PRIORITY = {
  [LETTER_RESULT.correct]: 3,
  [LETTER_RESULT.present]: 2,
  [LETTER_RESULT.absent]: 1,
  [LETTER_RESULT.empty]: 0,
};

export function createInitialCommunityWordleState({ targetWord, seedKey, now = Date.now() } = {}) {
  const resolvedSeedKey = seedKey || getLocalDateKey(now);
  return {
    seedKey: resolvedSeedKey,
    targetWord: normalizeWord(targetWord || getDailyCommunityWord(resolvedSeedKey)),
    status: COMMUNITY_WORDLE_STATUS.playing,
    attempts: [],
    startedAt: new Date(now).toISOString(),
    completedAt: null,
    lastError: "",
  };
}

export function submitCommunityWordleGuess(state, rawGuess, {
  acceptedWords = COMMUNITY_WORDLE_ACCEPTED_GUESSES,
  now = Date.now(),
} = {}) {
  if (!state || state.status !== COMMUNITY_WORDLE_STATUS.playing) {
    return { state, error: "This round is already complete." };
  }

  const guess = normalizeWord(rawGuess);
  const validationError = validateGuess(guess, acceptedWords);
  if (validationError) {
    return {
      state: { ...state, lastError: validationError },
      error: validationError,
    };
  }

  const result = evaluateCommunityWordleGuess(state.targetWord, guess);
  const solved = result.every((letter) => letter.result === LETTER_RESULT.correct);
  const attempts = [
    ...state.attempts,
    {
      guess,
      result,
      submittedAt: new Date(now).toISOString(),
    },
  ];
  const status = solved
    ? COMMUNITY_WORDLE_STATUS.solved
    : attempts.length >= COMMUNITY_WORDLE_MAX_ATTEMPTS
      ? COMMUNITY_WORDLE_STATUS.lost
      : COMMUNITY_WORDLE_STATUS.playing;

  return {
    state: {
      ...state,
      attempts,
      status,
      completedAt: status === COMMUNITY_WORDLE_STATUS.playing ? null : new Date(now).toISOString(),
      lastError: "",
    },
    error: null,
  };
}

export function evaluateCommunityWordleGuess(targetWord, guessWord) {
  const targetLetters = normalizeWord(targetWord).split("");
  const guessLetters = normalizeWord(guessWord).split("");
  const results = guessLetters.map((letter, index) => ({
    letter,
    result: LETTER_RESULT.absent,
    index,
  }));
  const remainingTargetCounts = {};

  targetLetters.forEach((letter, index) => {
    if (guessLetters[index] === letter) {
      results[index] = { ...results[index], result: LETTER_RESULT.correct };
      return;
    }
    remainingTargetCounts[letter] = (remainingTargetCounts[letter] || 0) + 1;
  });

  guessLetters.forEach((letter, index) => {
    if (results[index].result === LETTER_RESULT.correct) return;
    if ((remainingTargetCounts[letter] || 0) > 0) {
      results[index] = { ...results[index], result: LETTER_RESULT.present };
      remainingTargetCounts[letter] -= 1;
    }
  });

  return results;
}

export function validateGuess(guess, acceptedWords = COMMUNITY_WORDLE_ACCEPTED_GUESSES) {
  if (guess.length !== COMMUNITY_WORDLE_WORD_LENGTH) {
    return `Enter ${COMMUNITY_WORDLE_WORD_LENGTH} letters.`;
  }
  if (!/^[A-Z]+$/.test(guess)) {
    return "Use letters only.";
  }
  const acceptedWordSet = acceptedWords instanceof Set ? acceptedWords : new Set(acceptedWords);
  if (!acceptedWordSet.has(guess) && !COMMUNITY_WORDLE_WORD_SET.has(guess)) {
    return "That word is not in this prototype list.";
  }
  return "";
}

export function calculateCommunityWordleScore(state) {
  if (!state || state.status !== COMMUNITY_WORDLE_STATUS.solved) return 0;
  const attemptsUsed = Math.max(1, state.attempts.length);
  const remainingAttemptBonus = Math.max(0, COMMUNITY_WORDLE_MAX_ATTEMPTS - attemptsUsed) * 80;
  const letterScore = state.attempts.reduce((score, attempt) => {
    return score + attempt.result.reduce((letterTotal, letter) => {
      if (letter.result === LETTER_RESULT.correct) return letterTotal + 12;
      if (letter.result === LETTER_RESULT.present) return letterTotal + 5;
      return letterTotal;
    }, 0);
  }, 0);

  return 180 + remainingAttemptBonus + letterScore;
}

export function buildCommunityWordleRewardIntent({ state, durationMs = 0 }) {
  if (!state || state.status !== COMMUNITY_WORDLE_STATUS.solved) return null;

  const score = calculateCommunityWordleScore(state);
  const attemptsUsed = Math.max(1, state.attempts.length);
  const items = [
    {
      key: "letter-bloom",
      label: "Letter Bloom",
      quantity: Math.max(1, COMMUNITY_WORDLE_MAX_ATTEMPTS - attemptsUsed + 1),
      type: "material",
    },
  ];

  if (attemptsUsed <= 3) {
    items.push({
      key: "golden-vowel",
      label: "Golden Vowel",
      quantity: 1,
      type: "collectible",
    });
  }

  const achievementKeys = ["community-wordle-solve"];
  if (attemptsUsed === 1) achievementKeys.push("one-guess-oracle");
  if (attemptsUsed <= 3) achievementKeys.push("cozy-quick-read");

  return applyLocalRewardCap(
    buildRewardIntent({
      gameKey: "community-wordle",
      eventType: "daily-word-solved",
      score,
      durationMs,
      favorPreview: Math.max(3, Math.floor(score / 95)),
      items,
      achievementKeys,
      duplicatePolicy: DUPLICATE_POLICIES.none,
    }),
    80,
  );
}

export function getKeyboardLetterResults(attempts = []) {
  return attempts.reduce((letterMap, attempt) => {
    attempt.result.forEach(({ letter, result }) => {
      const current = letterMap[letter] || LETTER_RESULT.empty;
      if (RESULT_PRIORITY[result] > RESULT_PRIORITY[current]) {
        letterMap[letter] = result;
      }
    });
    return letterMap;
  }, {});
}

export function normalizeWord(value = "") {
  return String(value).trim().toUpperCase();
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
  window.localStorage.setItem(key, JSON.stringify(value));
}
