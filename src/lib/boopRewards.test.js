import test from "node:test";
import assert from "node:assert/strict";
import { getBoopReward } from "./boopRewards.js";

test("boop rewards only happen on odd milestone counts", () => {
  assert.equal(getBoopReward(2), null);
  assert.equal(getBoopReward(4), null);
  assert.equal(getBoopReward(6), null);
  assert.equal(getBoopReward(8), null);
});

test("boop rewards vary across odd milestone counts", () => {
  assert.deepEqual(getBoopReward(1), { count: 1, points: 1, label: "First boop" });
  assert.deepEqual(getBoopReward(5), { count: 5, points: 3, label: "Snoot sparkle" });
  assert.deepEqual(getBoopReward(11), { count: 11, points: 5, label: "Fox frenzy" });
});
