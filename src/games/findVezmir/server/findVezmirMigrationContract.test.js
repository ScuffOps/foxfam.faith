import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260722200000_add_find_vezmir_reward_actions.sql", import.meta.url),
  "utf8",
);

test("Find Vezmir rewards remain disabled with all RPC execution revoked", () => {
  assert.match(migration, /values \('puzzle-cat', 1, false, 900, 60, 2\)/);
  assert.match(migration, /enabled = false/);
  assert.match(migration, /revoke all on function public\.start_game_reward_session/);
  assert.match(migration, /revoke all on function public\.progress_game_reward_session/);
  assert.match(migration, /revoke all on function public\.claim_game_reward/);
  assert.doesNotMatch(migration, /grant execute on function public\./);
});

test("the server owns deterministic target order, positions, time, score, and completion", () => {
  for (const targetKey of [
    "moon-mug",
    "ribbon-bell",
    "fox-pin",
    "star-note",
    "seed-pouch",
    "vezmir",
  ]) {
    assert.match(migration, new RegExp(`'${targetKey}'`));
  }
  assert.match(migration, /private\.game_reward_stable_roll\(session_seed, 'vezmir:order:'/);
  assert.match(migration, /'x', target\.base_x/);
  assert.match(migration, /'y', target\.base_y/);
  assert.match(migration, /action_created_at - reward_session\.started_at/);
  assert.match(migration, /private\.find_vezmir_score/);
  assert.match(migration, /when found_vezmir then 'complete'/);
  assert.match(migration, /'action_index'/);
  assert.match(migration, /action_index > 48/);
});

test("player intents are narrow and every session action is serialized and replayable", () => {
  assert.match(migration, /Find Vezmir search accepts op, integer x, integer y, and layer only/);
  assert.match(migration, /Find Vezmir hint accepts op only/);
  assert.match(migration, /search_layer not in \('foreground', 'room', 'background'\)/);
  assert.doesNotMatch(migration, /progress_action\s*->>\s*'(score|focus|misses|hints_used|found_keys)'/);
  assert.match(migration, /:game-session:' \|\| progress_session_id::text/);
  assert.match(migration, /where session\.id = progress_session_id\s+and session\.user_id = caller_id\s+for update/);
  assert.match(migration, /existing_action\.action <> progress_action/);
  assert.match(migration, /jsonb_set\(existing_action\.result_snapshot, '\{replayed\}', 'true'::jsonb/);
});

test("claims require canonical completion and server-computed capped rewards", () => {
  assert.match(migration, /claim_evidence <> '\{\}'::jsonb/);
  assert.match(migration, /Find Vezmir must be complete before claiming/);
  assert.match(migration, /requested_favor := least\(24, greatest\(4, score_total \/ 90\)\)/);
  assert.match(migration, /'catnip-silver'/);
  assert.match(migration, /'voidthread'/);
  assert.match(migration, /'find-vezmir-found'/);
  assert.match(migration, /'find-vezmir-quiet-detective' and miss_count = 0/);
  assert.match(migration, /'find-vezmir-lantern-eyed' and hint_count = 0/);
  assert.match(migration, /insert into public\.user_achievements/);
  assert.match(migration, /daily_material_cap - quantity_earned/);
  assert.match(migration, /'catnip-silver',[\s\S]{0,180}\n\s*10/);
  assert.match(migration, /'voidthread',[\s\S]{0,180}\n\s*8/);
  assert.match(migration, /daily_claim_cap/);
  assert.match(migration, /where session\.id = claim_session_id\s+and session\.user_id = caller_id\s+for update/);
  assert.match(migration, /existing_event\.evidence_hash <> pg_catalog\.md5\(claim_evidence::text\)/);
});

test("dispatchers preserve earlier reward games and add puzzle-cat only", () => {
  for (const gameKey of ["word-garden", "match-merge", "boba-cafe", "puzzle-cat"]) {
    assert.match(migration, new RegExp(`(?:requested_game_key|session_game_key) = '${gameKey}'`));
  }
  assert.match(migration, /private\.reserve_game_reward_claim/);
  assert.doesNotMatch(migration, /claim_(score|favor|materials|achievements)/);
});
