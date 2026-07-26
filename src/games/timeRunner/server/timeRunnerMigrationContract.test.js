import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260722230000_add_time_runner_reward_actions.sql", import.meta.url),
  "utf8",
);

test("Time Runner rewards remain disabled with all public RPC execution revoked", () => {
  assert.match(migration, /values \('time-runner', 1, false, 600, 60, 2\)/);
  assert.match(migration, /enabled = false/);
  assert.match(migration, /revoke all on function public\.start_game_reward_session/);
  assert.match(migration, /revoke all on function public\.progress_game_reward_session/);
  assert.match(migration, /revoke all on function public\.claim_game_reward/);
  assert.doesNotMatch(migration, /grant execute on function public\./);
});

test("the server owns seed, layout, elapsed time, shards, falls, score, and completion", () => {
  assert.match(migration, /private\.game_reward_stable_roll\(run_seed, 'time-runner:hazard:'/);
  assert.match(migration, /private\.game_reward_stable_roll\([\s\S]*'time-runner:landing:'/);
  assert.match(migration, /'hand-sweep'/);
  assert.match(migration, /'roman-gate'/);
  assert.match(migration, /'clock-shard'/);
  assert.match(migration, /action_created_at - reward_session\.started_at/);
  assert.match(migration, /clock_shard_count := clock_shard_count \+ 1/);
  assert.match(migration, /falls_count := falls_count \+ 1/);
  assert.match(migration, /private\.time_runner_score/);
  assert.match(migration, /completed := elapsed_ms = 45000 and falls_count < 3/);
  assert.match(migration, /action_index > 128/);
});

test("only narrow run intents can mutate a locked owner session", () => {
  assert.match(migration, /action_op in \('jump', 'duck'\)/);
  assert.match(migration, /Time Runner jump and duck accept op and hazard_id only/);
  assert.match(migration, /Time Runner land accepts op and landing_id only/);
  assert.match(migration, /action_op in \('focus', 'sync'\)/);
  assert.doesNotMatch(migration, /progress_action\s*->>\s*'(score|elapsed_ms|clock_shards|falls|completed)'/);
  assert.match(migration, /:game-action:' \|\| progress_idempotency_key::text/);
  assert.match(migration, /:game-session:' \|\| progress_session_id::text/);
  assert.match(migration, /where session\.id = progress_session_id\s+and session\.user_id = caller_id\s+for update/);
  assert.match(migration, /existing_action\.action <> progress_action/);
  assert.match(migration, /jsonb_set\(existing_action\.result_snapshot, '\{replayed\}', 'true'::jsonb/);
});

test("a failed traverse cannot trap the player in an unclaimable reused session", () => {
  assert.match(migration, /coalesce\(session\.canonical_context ->> 'phase', 'running'\) <> 'failed'/);
});

test("claims require canonical completion and award capped Favor, Clock Brass, and three achievements", () => {
  assert.match(migration, /claim_evidence <> '\{\}'::jsonb/);
  assert.match(migration, /Time Runner must be canonically complete before claiming/);
  assert.match(migration, /requested_favor := least\(24, greatest\(4, score_total \/ 150\)\)/);
  assert.match(migration, /daily_clock_brass_cap constant integer := 10/);
  assert.match(migration, /least\(6, greatest\(1, clock_shard_count\)\)/);
  assert.match(migration, /'clock-brass'/);
  for (const achievementKey of ["clocktower-clear", "shard-sprinter", "unfractured-loop"]) {
    assert.match(migration, new RegExp(`'${achievementKey}'`));
  }
  assert.match(migration, /insert into public\.user_achievements/);
  assert.match(migration, /daily_claim_cap/);
  assert.match(migration, /where session\.id = claim_session_id\s+and session\.user_id = caller_id\s+for update/);
  assert.match(migration, /existing_event\.evidence_hash <> pg_catalog\.md5\(claim_evidence::text\)/);
});

test("dispatchers preserve every earlier reward game and add time-runner", () => {
  for (const gameKey of ["word-garden", "match-merge", "boba-cafe", "puzzle-cat", "time-runner"]) {
    assert.match(migration, new RegExp(`(?:requested_game_key|session_game_key) = '${gameKey}'`));
  }
  assert.match(migration, /private\.reserve_game_reward_claim/);
  assert.doesNotMatch(migration, /claim_(score|favor|materials|achievements)/);
});
