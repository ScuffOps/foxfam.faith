import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMatchMergeRewardIntent,
  confirmMatchMergeSelection,
  createInitialMatchMergeState,
  createMatchMergeTile,
  isMatchMergeBoardLocked,
  markMatchMergeClaimed,
  moveMatchMergeSelection,
  selectMatchMergeCell,
  shuffleMatchMergeGrid,
} from "./matchMergeRules.js";

describe("matchMergeRules", () => {
  it("starts with a seeded reliquary board", () => {
    const state = createInitialMatchMergeState({ now: 1000 });

    assert.equal(state.grid.length, 16);
    assert.equal(state.grid.filter(Boolean).length, 8);
    assert.equal(state.highestTier, 2);
  });

  it("merges adjacent equal tiles and spawns a new tile", () => {
    const grid = Array.from({ length: 16 }, () => null);
    grid[0] = createMatchMergeTile(1, "a");
    grid[1] = createMatchMergeTile(1, "b");
    const selected = selectMatchMergeCell(createInitialMatchMergeState({ grid, now: 1000 }), 0, 1000, 0);
    const merged = selectMatchMergeCell(selected, 1, 2000, 0.2);

    assert.equal(merged.grid[0], null);
    assert.equal(merged.grid[1].tier, 2);
    assert.equal(merged.grid.filter(Boolean).length, 2);
    assert.equal(merged.score, 55);
    assert.equal(merged.moves, 1);
  });

  it("does not merge non-adjacent matches", () => {
    const grid = Array.from({ length: 16 }, () => null);
    grid[0] = createMatchMergeTile(1, "a");
    grid[5] = createMatchMergeTile(1, "b");
    const selected = selectMatchMergeCell(createInitialMatchMergeState({ grid, now: 1000 }), 0, 1000, 0);
    const next = selectMatchMergeCell(selected, 5, 2000, 0);

    assert.equal(next.grid[0].tier, 1);
    assert.equal(next.grid[5].tier, 1);
    assert.equal(next.selectedIndex, 5);
    assert.equal(next.score, 0);
  });

  it("moves the keyboard cursor within the reliquary grid bounds", () => {
    const state = createInitialMatchMergeState({ now: 1000 });
    const upperLeft = moveMatchMergeSelection(state, -1, -1);
    const lowerRight = moveMatchMergeSelection(
      { ...state, cursor: { row: 3, column: 3 } },
      1,
      1,
    );

    assert.deepEqual(upperLeft.cursor, { row: 0, column: 0 });
    assert.deepEqual(lowerRight.cursor, { row: 3, column: 3 });
  });

  it("confirms the keyboard cursor through the existing merge rules", () => {
    const grid = Array.from({ length: 16 }, () => null);
    grid[0] = createMatchMergeTile(1, "a");
    grid[1] = createMatchMergeTile(1, "b");
    const initial = createInitialMatchMergeState({ grid, now: 1000 });
    const selected = confirmMatchMergeSelection(initial, 1000, 0);
    const moved = moveMatchMergeSelection(selected, 0, 1);
    const merged = confirmMatchMergeSelection(moved, 2000, 0.2);

    assert.equal(selected.selectedIndex, 0);
    assert.equal(merged.grid[0], null);
    assert.equal(merged.grid[1].tier, 2);
    assert.equal(merged.score, 55);
  });

  it("shuffles tiles without changing progress or reward state", () => {
    const state = {
      ...createInitialMatchMergeState({ now: 1000 }),
      selectedIndex: 2,
      score: 180,
      claimedScore: 55,
    };
    const shuffled = shuffleMatchMergeGrid(state, () => 0);

    assert.deepEqual(
      shuffled.grid.filter(Boolean).map((tile) => tile.id).sort(),
      state.grid.filter(Boolean).map((tile) => tile.id).sort(),
    );
    assert.equal(shuffled.score, 180);
    assert.equal(shuffled.claimedScore, 55);
    assert.equal(shuffled.selectedIndex, null);
  });

  it("builds a local material reward intent for unclaimed score", () => {
    const state = {
      ...createInitialMatchMergeState({ now: 1000 }),
      score: 360,
      claimedScore: 120,
      moves: 4,
      highestTier: 4,
      mergeStreak: 4,
    };
    const intent = buildMatchMergeRewardIntent({ state, durationMs: 20000 });

    assert.equal(intent.gameKey, "match-merge");
    assert.equal(intent.eventType, "forge-material-claim");
    assert.equal(intent.score, 240);
    assert.equal(intent.favorPreview, 2);
    assert.equal(intent.items.some((item) => item.key === "moonwax"), true);
    assert.equal(intent.items.some((item) => item.key === "charm-cord"), true);
    assert.equal(intent.achievementKeys.includes("quiet-chain"), true);
  });

  it("marks score as claimed after a reward preview", () => {
    const state = { ...createInitialMatchMergeState({ now: 1000 }), score: 160 };
    const claimed = markMatchMergeClaimed(state, 2000);

    assert.equal(claimed.claimedScore, 160);
  });

  it("detects a locked full board", () => {
    const grid = [
      1, 2, 1, 2,
      2, 1, 2, 1,
      1, 2, 1, 2,
      2, 1, 2, 1,
    ].map((tier, index) => createMatchMergeTile(tier, `tile-${index}`));

    assert.equal(isMatchMergeBoardLocked(grid), true);
  });
});
