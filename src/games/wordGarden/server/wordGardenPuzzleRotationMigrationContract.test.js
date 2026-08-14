import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260810120000_seed_word_garden_puzzle_rotation.sql", import.meta.url),
  "utf8",
);

test("Word Garden ships a deterministic canonical puzzle rotation", () => {
  assert.match(migration, /date '2026-01-01'/);
  assert.match(migration, /date '2035-12-31'/);
  assert.match(migration, /date '2026-08-10'/);
  assert.match(migration, /'petal-rite'/);
  assert.match(migration, /'planter-song'/);
  assert.match(migration, /'garden-vow'/);
  assert.match(migration, /'violet-hour'/);
  assert.match(migration, /'thorned-path'/);
  assert.match(migration, /'pollen-drift'/);
  assert.match(migration, /'meadow-rest'/);
});

test("curated daily puzzles remain authoritative over the fallback rotation", () => {
  assert.match(migration, /on conflict \(puzzle_date, game_key\) do nothing/i);
  assert.doesNotMatch(migration, /on conflict[\s\S]*do update/i);
});
