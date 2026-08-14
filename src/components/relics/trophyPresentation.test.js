import test from "node:test";
import assert from "node:assert/strict";
import { getAchievementPresentation, getTrophyPresentation, TROPHY_CATALOG } from "./trophyPresentation.js";

test("the trophy catalog includes all three canonical Starfishing milestones", () => {
  assert.deepEqual(TROPHY_CATALOG.slice(0, 3), [
    "first-light",
    "pocket-constellation",
    "celestial-archivist",
  ]);
});

test("achievement presentation maps every game family and its unlock date", () => {
  const achievement = getAchievementPresentation({
    achievementKey: "word-garden-full-bloom",
    sourceRewardEventId: "123e4567-e89b-42d3-a456-426614174000",
    unlockedAt: "2026-07-22T12:00:00.000Z",
  });

  assert.equal(achievement.title, "Word Garden Full Bloom");
  assert.equal(achievement.gameLabel, "Word Garden");
  assert.equal(achievement.provenanceLabel, "Validated game reward");
  assert.notEqual(achievement.unlockedLabel, "Date unavailable");
  assert.equal(getAchievementPresentation({ achievement_key: "clocktower-clear" }).gameLabel, "Time Runner");
  assert.equal(
    getAchievementPresentation({ achievement_key: "first-light", source_catch_id: "catch" }).provenanceLabel,
    "Starfishing catch",
  );
});

test("trophy presentation preserves authoritative title and maps game provenance", () => {
  const presentation = getTrophyPresentation({
    trophyKey: "spotless-shift",
    sourceAchievementKey: "boba-cafe-spotless-shift",
    data: { title: "Spotless Shift" },
    acquiredAt: "2026-07-22T12:00:00.000Z",
  });

  assert.equal(presentation.title, "Spotless Shift");
  assert.equal(presentation.gameLabel, "Boba Cafe");
  assert.equal(presentation.achievementLabel, "Boba Cafe Spotless Shift");
  assert.notEqual(presentation.acquiredLabel, "Date unavailable");
});

test("public projection titles outrank key-derived trophy labels", () => {
  const presentation = getTrophyPresentation({
    trophyKey: "first-refinement",
    sourceAchievementKey: "first-merge",
    title: "First Reliquary Refinement",
  });

  assert.equal(presentation.title, "First Reliquary Refinement");
  assert.equal(presentation.gameLabel, "Match & Merge");
});

test("trophy presentation maps non-prefixed game achievements and legacy Starfishing rows", () => {
  assert.equal(getTrophyPresentation({ sourceAchievementKey: "first-merge" }).gameLabel, "Match & Merge");
  assert.equal(getTrophyPresentation({ sourceAchievementKey: "clocktower-clear" }).gameLabel, "Time Runner");
  assert.equal(getTrophyPresentation({ sourceAchievementKey: "celestial-archivist" }).gameLabel, "Starfishing");
});

test("trophy presentation degrades safely when optional metadata is absent", () => {
  assert.deepEqual(getTrophyPresentation({ trophyKey: "quiet-chain" }), {
    title: "Quiet Chain",
    gameLabel: "Priory",
    achievementLabel: "Priory milestone",
    acquiredLabel: "Date unavailable",
  });
});
