import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260813140000_apply_shared_game_charm_passives.sql", import.meta.url),
  "utf8",
);

test("shared-game passives derive only from equipped catalog-backed achievement charms", () => {
  assert.match(migration, /public\.user_relic_charms as charm/);
  assert.match(migration, /public\.user_achievements as unlocked/);
  assert.match(migration, /public\.achievement_catalog as achievement/);
  assert.match(migration, /charm\.data ->> 'equipped' = 'true'/);
  assert.match(migration, /charm\.data ->> 'charm_key' = achievement\.reward ->> 'charm_key'/);
  assert.match(migration, /achievement\.reward #>> '\{effects,game_favor_multiplier_bps\}'/);
  assert.doesNotMatch(migration, /charm\.data #>> '\{effects,game_/);
});

test("passive bonuses preserve caps, ledger idempotency, and replay snapshots", () => {
  assert.match(migration, /if claim_result ->> 'replayed' = 'true' then/);
  assert.match(migration, /least\(2500/);
  assert.match(migration, /least\(\s*cap_remaining,/);
  assert.match(migration, /private\.game_reward_scoped_uuid\(claim_idempotency_key, 'passive:favor'\)/);
  assert.match(migration, /'passive:material:' \|\|/);
  assert.match(migration, /result_snapshot = claim_result/);
  assert.match(migration, /favor_awarded = favor_awarded \+ favor_bonus/);
});

test("the final claim boundary remains authenticated-only", () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all on function public\.claim_game_reward/);
  assert.match(migration, /grant execute on function public\.claim_game_reward\(uuid, uuid, jsonb\)\s*to authenticated/);
  assert.doesNotMatch(migration, /to anon/);
});
