import assert from "node:assert/strict";
import test from "node:test";

import {
  canRequestMatchMerge,
  createMatchMergeReceiptIntent,
  createRewardedMatchMergeState,
} from "./matchMergeRewardModel.js";

test("maps a canonical server board into the existing display model", () => {
  const state = createRewardedMatchMergeState({
    grid: [1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    score: 55,
    moves: 1,
    highest_tier: 2,
    merge_streak: 1,
    best_chain: 1,
    last_merge_at: "2026-07-22T12:00:00.000Z",
    action_index: 1,
  });

  assert.equal(state.grid.length, 16);
  assert.equal(state.grid[0].tier, 1);
  assert.equal(state.grid[2].label, "Candle Seal");
  assert.equal(state.grid[3], null);
  assert.equal(state.score, 55);
  assert.equal(state.actionIndex, 1);
});

test("accepts only equal neighboring merge candidates", () => {
  const state = createRewardedMatchMergeState({
    grid: [1, 1, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    score: 0,
    moves: 0,
    highest_tier: 2,
    merge_streak: 0,
    best_chain: 0,
    last_merge_at: null,
    action_index: 0,
  });

  assert.equal(canRequestMatchMerge(state.grid, 0, 1), true);
  assert.equal(canRequestMatchMerge(state.grid, 0, 4), true);
  assert.equal(canRequestMatchMerge(state.grid, 1, 4), false);
  assert.equal(canRequestMatchMerge(state.grid, 4, 5), false);
});

test("maps an authoritative receipt into the result sheet shape", () => {
  const intent = createMatchMergeReceiptIntent({
    favor: { delta: 4 },
    materials: [{ key: "sigil-shards", delta: 2, balance: 8 }],
  });
  assert.deepEqual(intent, {
    favorPreview: 4,
    items: [{ key: "sigil-shards", label: "Sigil Shards", quantity: 2, type: "material" }],
  });
});
