import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260813130000_add_relic_forge_achievements.sql", import.meta.url),
  "utf8",
);

test("Forge milestones are sourced from completed durable receipts", () => {
  assert.match(migration, /private\.relic_charm_progression_receipts/);
  assert.match(migration, /after update of status, result_snapshot/);
  assert.match(migration, /new\.status = 'completed'/);
  assert.match(migration, /old\.status is distinct from new\.status/);
  assert.match(migration, /target_result_snapshot #>> '\{charm,star\}' = '3'/);
  assert.doesNotMatch(migration, /auth\.uid\(\)/);
});

test("Forge achievement rewards mint through the shared collectible trigger", () => {
  for (const achievementKey of [
    "quarters-first-temper",
    "quarters-first-transmutation",
    "quarters-ascendant-charm",
  ]) {
    assert.match(migration, new RegExp(achievementKey));
  }
  assert.match(migration, /"game_key":"relic-forge"/);
  assert.match(migration, /hearthforged-seal/);
  assert.match(migration, /ascendant-anvil/);
  assert.match(migration, /on conflict \(user_id, achievement_key\) do nothing/);
});

test("Forge milestone migration backfills completed receipts without exposing helpers", () => {
  assert.match(migration, /where completed\.status = 'completed'/);
  assert.match(migration, /revoke all on function private\.unlock_relic_forge_receipt_achievements/);
  assert.doesNotMatch(migration, /grant execute/);
});
