import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260814120000_expand_word_garden_vocabulary.sql", import.meta.url),
  "utf8",
);

test("the vocabulary repair expands every generated garden without changing reward authority", () => {
  for (const key of ["petal-rite", "planter-song", "garden-vow", "violet-hour", "thorned-path", "pollen-drift", "meadow-rest"]) {
    assert.match(migration, new RegExp(`'${key}'`));
  }
  assert.match(migration, /update public\.daily_word_puzzles/i);
  assert.match(migration, /puzzle\.puzzle_key ~ \('\^' \|\| words\.base_key \|\| '-\[0-9\]\{8\}\$'\)/);
  assert.doesNotMatch(migration, /policy|row level security|grant|revoke/i);
});

test("the repaired meadow list contains no impossible N or R answers", () => {
  const meadowRow = migration.match(/\('meadow-rest',[\s\S]*?array\['MEADOWS'\]::text\[\]\)/)?.[0] || "";
  assert.match(meadowRow, /'MEADOWS'/);
  assert.doesNotMatch(meadowRow, /'DAWN'|'SAND'|'WADERS'/);
});
