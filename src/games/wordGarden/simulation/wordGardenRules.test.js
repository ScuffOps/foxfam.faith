import assert from "node:assert/strict";
import test from "node:test";
import {
  WORD_GARDEN_STATUS,
  appendPetal,
  buildWordGardenRewardIntent,
  calculateWordGardenScore,
  completeWordGarden,
  createWordGardenState,
  removePetal,
  scoreGardenWord,
  shufflePetals,
  submitGardenWord,
} from "./wordGardenRules.js";

test("requires the center letter and four characters", () => {
  const state = createWordGardenState({ seedKey: "2026-07-12", letters: "PETALSR", center: "A", acceptedWords: ["PETS", "ARTS"] });
  assert.equal(submitGardenWord(state, "PETS").state.lastError, "Every word must use A.");
  assert.equal(submitGardenWord(state, "ART").state.lastError, "Words need at least 4 letters.");
});

test("rejects unavailable letters, unknown words, and duplicate submissions", () => {
  const state = createWordGardenState({ seedKey: "test", letters: "PETALSR", center: "A", acceptedWords: ["PALE", "PETAL"] });
  assert.match(submitGardenWord(state, "MALE").state.lastError, /seven garden letters/);
  assert.equal(submitGardenWord(state, "RATE").state.lastError, "That word is not in today's garden.");
  const first = submitGardenWord(state, "PALE").state;
  assert.equal(submitGardenWord(first, "PALE").state.lastError, "PALE has already bloomed.");
});

test("awards a Full Bloom for all seven letters", () => {
  const result = scoreGardenWord("PETALERS", { letters: "PETALSR", center: "A" });
  assert.equal(result.isFullBloom, true);
  assert.ok(result.score > "PETALERS".length);
});

test("petal drafting normalizes input and respects the puzzle letters", () => {
  let state = createWordGardenState({ seedKey: "test", letters: "PETALSR", center: "A" });
  state = appendPetal(state, "p");
  state = appendPetal(state, "x");
  state = appendPetal(state, "A");
  state = removePetal(state);
  assert.equal(state.draftWord, "P");
});

test("shuffling preserves the center and letter set", () => {
  const state = createWordGardenState({ seedKey: "2026-07-12" });
  const next = shufflePetals(state);
  assert.equal(next.center, state.center);
  assert.deepEqual([...next.petals].sort(), [...state.petals].sort());
  assert.notEqual(next, state);
});

test("scores found words and builds a capped local-only reward intent", () => {
  let state = createWordGardenState({
    seedKey: "test", letters: "PETALSR", center: "A", acceptedWords: ["PALE", "PETAL", "PETALERS"], fullBloomWords: ["PETALERS"], now: 1_000,
  });
  state = submitGardenWord(state, "PALE", { now: 2_000 }).state;
  state = submitGardenWord(state, "PETALERS", { now: 3_000 }).state;
  state = completeWordGarden(state, { now: 4_000 });
  assert.equal(state.status, WORD_GARDEN_STATUS.complete);
  assert.equal(calculateWordGardenScore(state), 4 + 15);
  const intent = buildWordGardenRewardIntent({ state, durationMs: 3_000 });
  assert.equal(intent.gameKey, "word-garden");
  assert.equal(intent.eventType, "daily-garden-complete");
  assert.ok(intent.favorPreview <= 80);
  assert.deepEqual(intent.items[0], { key: "blooming-ink", label: "Blooming Ink", quantity: 3, type: "material" });
  assert.ok(intent.achievementKeys.includes("word-garden-full-bloom"));
});

test("does not create rewards for an active or empty garden", () => {
  const active = createWordGardenState({ seedKey: "test" });
  assert.equal(buildWordGardenRewardIntent({ state: active }), null);
  assert.equal(completeWordGarden(active).lastError, "Bloom at least one word before resting.");
});
