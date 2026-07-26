import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260722320000_add_game_achievement_collectibles.sql", import.meta.url),
  "utf8",
);

test("shared achievement fulfillment atomically mints protected charms and trophies", () => {
  assert.match(migration, /after insert on public\.user_achievements/);
  assert.match(migration, /private\.fulfill_achievement_collectibles_for/);
  assert.match(migration, /'type', 'achievement', 'key', target_achievement_key/);
  assert.match(migration, /on conflict \(user_id, trophy_key\) do nothing/);
  assert.match(migration, /for unlocked in[\s\S]*private\.fulfill_achievement_collectibles_for/);
});

test("every staged game receives collectible reward metadata", () => {
  for (const achievementKey of [
    "first-merge",
    "boba-cafe-first-service",
    "find-vezmir-found",
    "clocktower-clear",
    "word-garden-first-sprout",
  ]) {
    assert.match(migration, new RegExp(`'${achievementKey}'`));
  }
});
