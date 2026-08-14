import assert from "node:assert/strict";
import test from "node:test";
import { getMatchMergeGuidance } from "./matchMergeGuidance.js";

function tile(id, tier, label = "Moon Spark") {
  return { id, tier, label };
}

test("guidance identifies one clear neighboring pair before selection", () => {
  const grid = Array.from({ length: 16 }, () => null);
  grid[0] = tile("a", 1);
  grid[1] = tile("b", 1);
  grid[5] = tile("c", 2, "Candle Seal");

  assert.deepEqual(getMatchMergeGuidance(grid), {
    state: "source",
    sourceIndex: 0,
    targetIndexes: [1],
    eyebrow: "Next move",
    title: "Pair the highlighted Moon Sparks",
    detail: "Select either offering, then its highlighted neighbor.",
  });
});

test("guidance highlights every valid neighboring twin after selection", () => {
  const grid = Array.from({ length: 16 }, () => null);
  grid[0] = tile("a", 1);
  grid[1] = tile("b", 1);
  grid[4] = tile("c", 1);

  const guidance = getMatchMergeGuidance(grid, 0);

  assert.equal(guidance.state, "target");
  assert.equal(guidance.sourceIndex, 0);
  assert.deepEqual(guidance.targetIndexes, [4, 1]);
  assert.match(guidance.title, /Choose a neighboring Moon Spark/);
});

test("guidance falls back to another actionable pair when selection has no twin", () => {
  const grid = Array.from({ length: 16 }, () => null);
  grid[0] = tile("solo", 2, "Candle Seal");
  grid[5] = tile("a", 1);
  grid[6] = tile("b", 1);

  const guidance = getMatchMergeGuidance(grid, 0);

  assert.equal(guidance.state, "source");
  assert.equal(guidance.sourceIndex, 5);
  assert.deepEqual(guidance.targetIndexes, [6]);
});

test("guidance exposes the claim or reset state when no merge remains", () => {
  const grid = [
    1, 2, 1, 2,
    2, 1, 2, 1,
    1, 2, 1, 2,
    2, 1, 2, 1,
  ].map((tier, index) => tile(String(index), tier, `Tier ${tier}`));

  const guidance = getMatchMergeGuidance(grid);

  assert.equal(guidance.state, "locked");
  assert.equal(guidance.sourceIndex, null);
  assert.deepEqual(guidance.targetIndexes, []);
});
