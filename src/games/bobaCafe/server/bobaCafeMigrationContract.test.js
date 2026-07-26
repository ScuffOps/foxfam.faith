import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260722160000_add_boba_cafe_reward_actions.sql", import.meta.url),
  "utf8",
);
const disposableEnableFixture = readFileSync(
  new URL("../../../../scripts/fixtures/game-rewards/enable.sql", import.meta.url),
  "utf8",
);

test("Boba rewards remain disabled and inaccessible after the migration", () => {
  assert.match(migration, /values \('boba-cafe', 1, false, 1800, 90, 3\)/);
  assert.match(migration, /enabled = false/);
  assert.match(migration, /revoke all on function public\.start_game_reward_session/);
  assert.match(migration, /revoke all on function public\.progress_game_reward_session/);
  assert.match(migration, /revoke all on function public\.claim_game_reward/);
  assert.doesNotMatch(migration, /grant execute on function public\./);
});

test("Boba sessions own recipes, customers, timing, progress, and action volume", () => {
  for (const recipeKey of [
    "lantern-latte",
    "shrine-matcha",
    "taro-ribbon",
    "garden-jasmine",
    "cocoa-comet",
    "soft-starlight",
  ]) {
    assert.match(migration, new RegExp(`'${recipeKey}'`));
  }
  for (const customerKey of [
    "choir-helper",
    "library-visitor",
    "courtyard-runner",
    "relic-polisher",
    "vesper-guest",
  ]) {
    assert.match(migration, new RegExp(`"key":"${customerKey}"`));
  }
  assert.match(migration, /'customer', customer/);
  assert.match(migration, /"palette":\["#[0-9a-f]{6}","#[0-9a-f]{6}"\]/i);
  assert.match(migration, /'"shiftComplete"'::jsonb/);
  assert.match(migration, /pg_catalog\.clock_timestamp\(\)/);
  assert.match(migration, /action_index > 96/);
  assert.match(migration, /Only expired Boba orders can be settled/);
  assert.match(migration, /Complete all eight Boba Cafe orders before claiming/);
});

test("Boba actions and claim rewards are strictly server-authored", () => {
  assert.match(migration, /Boba select accepts op, station, and choice only/);
  assert.match(migration, /action_op in \('serve', 'settle'\)/);
  assert.match(migration, /action_op = 'next'/);
  assert.match(migration, /Boba Cafe claims accept no client-authored result fields/);
  assert.match(migration, /requested_favor := greatest\(1, score_total \/ 140\)/);
  assert.match(migration, /least\(64, greatest\(1, score_total \/ 80\)\)/);
  assert.match(migration, /least\(2, perfect_count \/ 3\)/);
  assert.match(migration, /'boba-cafe-first-service'/);
  assert.match(migration, /'boba-cafe-perfect-pour'/);
  assert.match(migration, /'boba-cafe-rush-hour-combo'/);
  assert.match(migration, /'boba-cafe-spotless-shift'/);
});

test("dispatchers preserve existing games and the disposable fixture enables all local RPCs", () => {
  assert.match(migration, /requested_game_key = 'word-garden'/);
  assert.match(migration, /requested_game_key = 'match-merge'/);
  assert.match(migration, /requested_game_key = 'boba-cafe'/);
  assert.match(migration, /session_game_key = 'word-garden'/);
  assert.match(migration, /session_game_key = 'match-merge'/);
  assert.match(migration, /session_game_key = 'boba-cafe'/);
  assert.match(disposableEnableFixture, /game_key in \('word-garden', 'match-merge', 'boba-cafe', 'puzzle-cat', 'time-runner'\)/);
  assert.match(disposableEnableFixture, /grant execute on function public\.progress_game_reward_session/);
});
