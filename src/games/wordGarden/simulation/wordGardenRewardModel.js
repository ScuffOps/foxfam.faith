import { createWordGardenState, scoreGardenWord, WORD_GARDEN_STATUS } from "./wordGardenRules.js";

export function createRewardedWordGardenState({ puzzle, context }, previousState = null) {
  const baseState = createWordGardenState({
    seedKey: puzzle.date,
    letters: puzzle.letters,
    center: puzzle.center,
    acceptedWords: [],
    fullBloomWords: [],
    now: context?.started_at ? Date.parse(context.started_at) : Date.now(),
  });
  const foundWords = (context?.found_words || []).map((word) => {
    const scored = scoreGardenWord(word, baseState);
    return {
      word,
      score: scored.score,
      isFullBloom: scored.isFullBloom,
      foundAt: context?.completed_at || new Date().toISOString(),
    };
  });

  return {
    ...baseState,
    ...(previousState ? {
      draftWord: previousState.draftWord,
      petals: previousState.petals,
      shuffleCount: previousState.shuffleCount,
    } : {}),
    puzzleKey: puzzle.key,
    puzzleTitle: puzzle.title,
    foundWords,
    status: context?.phase === "complete" ? WORD_GARDEN_STATUS.complete : WORD_GARDEN_STATUS.playing,
    completedAt: context?.completed_at || null,
    actionIndex: context?.action_index || 0,
    lastError: "",
  };
}

export function validateRewardedGardenDraft(state) {
  const word = String(state?.draftWord || "").trim().toUpperCase();
  if (word.length < 4) return "Words need at least 4 letters.";
  if (!word.includes(state.center)) return `Every word must use ${state.center}.`;
  if (Array.from(word).some((letter) => !state.letters.includes(letter))) return "Use only the seven garden letters.";
  if (state.foundWords.some((foundWord) => foundWord.word === word)) return `${word} has already bloomed.`;
  return "";
}

export function createWordGardenReceiptIntent(receipt) {
  if (!receipt) return null;
  return {
    favorPreview: receipt.favor?.delta || 0,
    items: (receipt.materials || []).map((material) => ({
      key: material.key,
      label: formatMaterialLabel(material.key),
      quantity: material.delta,
      type: "material",
    })),
    achievements: (receipt.achievements || []).map((achievement) => ({
      key: achievement.key,
      title: achievement.title,
    })),
  };
}

function formatMaterialLabel(key) {
  return String(key || "material")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
