import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCommunityWordleRewardIntent,
  calculateCommunityWordleScore,
  COMMUNITY_WORDLE_STATUS,
  createInitialCommunityWordleState,
  evaluateCommunityWordleGuess,
  LETTER_RESULT,
  submitCommunityWordleGuess,
} from "./communityWordleRules.js";

describe("communityWordleRules", () => {
  it("evaluates duplicate letters with Wordle count rules", () => {
    const result = evaluateCommunityWordleGuess("LEVEL", "EERIE").map((letter) => letter.result);

    assert.deepEqual(result, [
      LETTER_RESULT.present,
      LETTER_RESULT.correct,
      LETTER_RESULT.absent,
      LETTER_RESULT.absent,
      LETTER_RESULT.absent,
    ]);
  });

  it("does not over-award repeated guess letters after exact matches", () => {
    const result = evaluateCommunityWordleGuess("BOOST", "BOOBO").map((letter) => letter.result);

    assert.deepEqual(result, [
      LETTER_RESULT.correct,
      LETTER_RESULT.correct,
      LETTER_RESULT.correct,
      LETTER_RESULT.absent,
      LETTER_RESULT.absent,
    ]);
  });

  it("rejects invalid guesses without consuming an attempt", () => {
    const initial = createInitialCommunityWordleState({ targetWord: "CHARM", seedKey: "test", now: 1000 });
    const { state, error } = submitCommunityWordleGuess(initial, "CHA", { now: 2000 });

    assert.equal(error, "Enter 5 letters.");
    assert.equal(state.attempts.length, 0);
    assert.equal(state.status, COMMUNITY_WORDLE_STATUS.playing);
  });

  it("solves the round and records the submitted result", () => {
    const initial = createInitialCommunityWordleState({ targetWord: "RELIC", seedKey: "test", now: 1000 });
    const { state, error } = submitCommunityWordleGuess(initial, "RELIC", { now: 2000 });

    assert.equal(error, null);
    assert.equal(state.status, COMMUNITY_WORDLE_STATUS.solved);
    assert.equal(state.attempts.length, 1);
    assert.equal(state.attempts[0].result.every((letter) => letter.result === LETTER_RESULT.correct), true);
  });

  it("marks the round lost after the final available attempt", () => {
    let state = createInitialCommunityWordleState({ targetWord: "SIGIL", seedKey: "test", now: 1000 });

    for (let attempt = 0; attempt < 6; attempt += 1) {
      state = submitCommunityWordleGuess(state, "ALTAR", { now: 2000 + attempt }).state;
    }

    assert.equal(state.status, COMMUNITY_WORDLE_STATUS.lost);
    assert.equal(state.attempts.length, 6);
  });

  it("builds a local reward intent only for solved rounds", () => {
    const initial = createInitialCommunityWordleState({ targetWord: "GRACE", seedKey: "test", now: 1000 });
    const solved = submitCommunityWordleGuess(initial, "GRACE", { now: 2000 }).state;
    const intent = buildCommunityWordleRewardIntent({ state: solved, durationMs: 1000 });

    assert.equal(intent.gameKey, "community-wordle");
    assert.equal(intent.eventType, "daily-word-solved");
    assert.equal(intent.score, calculateCommunityWordleScore(solved));
    assert.equal(intent.items.some((item) => item.key === "letter-bloom"), true);
    assert.equal(intent.achievementKeys.includes("community-wordle-solve"), true);
  });
});
