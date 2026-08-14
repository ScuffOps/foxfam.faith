import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createRewardedWordGardenState,
  createWordGardenReceiptIntent,
  getRecoverableWordGardenError,
  validateRewardedGardenDraft,
} from "./wordGardenRewardModel.js";

const here = dirname(fileURLToPath(import.meta.url));
const resultSheetSource = readFileSync(join(here, "../../shared/ui/GameResultSheet.jsx"), "utf8");

const sessionState = {
  puzzle: { date: "2026-07-22", key: "petal-rite", title: "Petal Rite", letters: "PETALSR", center: "A" },
  context: {
    phase: "playing",
    found_words: ["PALE", "PETALERS"],
    score: 19,
    full_bloom_count: 1,
    action_index: 2,
    completed_at: null,
  },
};

test("canonical words become pressed flowers without exposing the answer list", () => {
  const state = createRewardedWordGardenState(sessionState);
  assert.equal(state.acceptedWords.length, 0);
  assert.ok(state.featuredWords.includes("PETAL"));
  assert.match(state.theme, /pressed petals/i);
  assert.equal(state.foundWords.length, 2);
  assert.equal(state.foundWords[1].isFullBloom, true);
});

test("client-side journal hints survive canonical rewarded progress refreshes", () => {
  const hinted = { ...createRewardedWordGardenState(sessionState), hintedWords: ["PETAL"] };
  const refreshed = createRewardedWordGardenState(sessionState, hinted);
  assert.deepEqual(refreshed.hintedWords, ["PETAL"]);
  assert.equal(refreshed.acceptedWords.length, 0);
});

test("rewarded drafts receive only structural client checks", () => {
  const state = { ...createRewardedWordGardenState(sessionState), draftWord: "PALE" };
  assert.equal(validateRewardedGardenDraft(state), "PALE has already bloomed.");
  assert.equal(validateRewardedGardenDraft({ ...state, draftWord: "TEAL" }), "");
});

test("canonical word rejections remain recoverable without hiding service failures", () => {
  assert.equal(getRecoverableWordGardenError(
    { code: "GAME_REWARD_REQUEST_REJECTED" },
    { op: "submit", word: "TEAL" },
  ), "That word is not in today's garden. Try another bloom.");
  assert.equal(getRecoverableWordGardenError(
    { code: "GAME_REWARD_TEMPORARILY_UNAVAILABLE" },
    { op: "submit", word: "TEAL" },
  ), "");
  assert.equal(getRecoverableWordGardenError(
    { code: "GAME_REWARD_REQUEST_REJECTED" },
    { op: "rest" },
  ), "");
});

test("Blooming Ink receipts become display-only intents", () => {
  assert.deepEqual(createWordGardenReceiptIntent({
    favor: { delta: 4 },
    materials: [{ key: "blooming-ink", delta: 3, balance: 8 }],
    achievements: [{ key: "first-sprout", title: "A Garden Answers" }],
  }), {
    favorPreview: 4,
    items: [{ key: "blooming-ink", label: "Blooming Ink", quantity: 3, type: "material" }],
    achievements: [{ key: "first-sprout", title: "A Garden Answers" }],
  });
});

test("the shared result sheet presents authoritative achievement titles", () => {
  assert.match(resultSheetSource, /intent\.achievements/);
  assert.match(resultSheetSource, /\{achievement\.title\}/);
  assert.match(resultSheetSource, /Achievement unlocked/);
  assert.doesNotMatch(resultSheetSource, /achievement\.key\.replace|format.*achievement/i);
});

test("the shared result sheet announces completion and receives focus", () => {
  assert.match(resultSheetSource, /resultRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(resultSheetSource, /role="status"/);
  assert.match(resultSheetSource, /aria-live="polite"/);
  assert.match(resultSheetSource, /tabIndex=\{-1\}/);
  assert.match(resultSheetSource, /aria-labelledby=\{titleId\}/);
});
