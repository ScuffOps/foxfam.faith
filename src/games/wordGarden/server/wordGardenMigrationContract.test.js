import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260722310000_add_word_garden_reward_actions.sql", import.meta.url),
  "utf8",
);

test("Blooming Ink rewards remain disabled with every public RPC revoked", () => {
  assert.match(migration, /values \('word-garden', 2, false, 1800, 80, 1\)/);
  assert.match(migration, /display_name', 'Blooming Ink'/);
  assert.match(migration, /enabled = false/);
  assert.match(migration, /revoke all on function public\.start_game_reward_session/);
  assert.match(migration, /revoke all on function public\.progress_game_reward_session/);
  assert.match(migration, /revoke all on function public\.claim_game_reward/);
  assert.doesNotMatch(migration, /grant execute on function public\./);
});

test("the server owns the daily puzzle, found words, score, blooms, and completion", () => {
  assert.match(migration, /from public\.daily_word_puzzles as daily/);
  assert.match(migration, /daily\.puzzle_date = \(session_started_at at time zone 'UTC'\)::date/);
  assert.match(migration, /'found_words', '\[\]'::jsonb/);
  assert.match(migration, /submitted_word = any\(puzzle\.accepted_words\)/);
  assert.match(migration, /submitted_word = any\(puzzle\.full_bloom_words\)/);
  assert.match(migration, /word_score := pg_catalog\.length\(submitted_word\) \+ case when is_full_bloom then 7 else 0 end/);
  assert.match(migration, /'\{phase\}', '\"complete\"'::jsonb/);
  assert.match(migration, /pg_catalog\.to_jsonb\(action_created_at\)/);
  assert.match(migration, /action_index > 101/);
});

test("only narrow submit and rest intents can mutate a locked owner session", () => {
  assert.match(migration, /Blooming Ink submit accepts op and word only/);
  assert.match(migration, /Blooming Ink rest accepts op only/);
  assert.doesNotMatch(migration, /progress_action\s*->>\s*'(score|favor|materials|achievements|found_words|full_bloom_count)'/);
  assert.match(migration, /:game-action:' \|\| progress_idempotency_key::text/);
  assert.match(migration, /:game-session:' \|\| progress_session_id::text/);
  assert.match(migration, /where session\.id = progress_session_id\s+and session\.user_id = caller_id\s+for update/);
  assert.match(migration, /existing_action\.action <> progress_action/);
  assert.match(migration, /jsonb_set\(existing_action\.result_snapshot, '\{replayed\}', 'true'::jsonb/);
});

test("claims require canonical completion and award server-computed capped rewards", () => {
  assert.match(migration, /claim_evidence <> '\{\}'::jsonb/);
  assert.match(migration, /Blooming Ink claims accept no client-authored result fields/);
  assert.match(migration, /Blooming Ink must be canonically complete before claiming/);
  assert.match(migration, /Canonical Blooming Ink totals are inconsistent/);
  assert.match(migration, /requested_favor := least\(32, greatest\(3, score_total \/ 4\)\)/);
  assert.match(migration, /daily_blooming_ink_cap constant integer := 12/);
  assert.match(migration, /'blooming-ink'/);
  assert.doesNotMatch(migration, /voidthread|vezmir-thread/i);
  assert.match(migration, /'word-garden-first-sprout'/);
  assert.match(migration, /'word-garden-full-bloom'/);
  assert.match(migration, /insert into public\.user_achievements/);
  assert.match(migration, /where session\.id = claim_session_id\s+and session\.user_id = caller_id\s+for update/);
  assert.match(migration, /existing_event\.evidence_hash <> pg_catalog\.md5\(claim_evidence::text\)/);
});

test("the progress dispatcher preserves every Phase 2 reward game", () => {
  for (const gameKey of ["word-garden", "match-merge", "boba-cafe", "puzzle-cat", "time-runner"]) {
    assert.match(migration, new RegExp(`session_game_key = '${gameKey}'`));
  }
  assert.match(migration, /private\.progress_word_garden_reward_session/);
  assert.doesNotMatch(migration, /claim_(score|favor|materials|achievements)/);
});
