import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260810110000_add_game_claim_collectible_receipts.sql", import.meta.url),
  "utf8",
);

test("shared claim receipts remain authoritative and attach catalog collectible metadata", () => {
  assert.match(migration, /claim_game_reward_collectible_receipt_internal/);
  assert.match(migration, /private\.claim_game_reward_collectible_receipt_internal\(/);
  assert.match(migration, /public\.achievement_catalog/);
  assert.match(migration, /'collectible', catalog\.reward/);
  assert.match(migration, /achievement\.value ->> 'key'/);
  assert.doesNotMatch(migration, /claim_evidence ->> 'collectible'|claim_evidence -> 'collectible'/);
});

test("the enriched claim boundary remains disabled until the isolated backend enable step", () => {
  assert.match(migration, /revoke all on function public\.claim_game_reward\(uuid, uuid, jsonb\) from public, anon, authenticated/);
  assert.doesNotMatch(migration, /grant execute on function public\.claim_game_reward/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
});
