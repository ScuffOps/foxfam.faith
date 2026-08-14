import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260813120000_enable_game_reward_boundaries.sql",
    import.meta.url,
  ),
  "utf8",
);

const SHARED_GAME_KEYS = [
  "match-merge",
  "boba-cafe",
  "puzzle-cat",
  "time-runner",
  "word-garden",
];

const AUTHENTICATED_RPC_SIGNATURES = [
  "public.start_starfishing_cast()",
  "public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)",
  "public.start_game_reward_session(text)",
  "public.progress_game_reward_session(uuid, uuid, jsonb)",
  "public.claim_game_reward(uuid, uuid, jsonb)",
];

test("forward boundary enables only the reviewed shared reward games", () => {
  assert.match(migration, /update public\.game_reward_games[\s\S]*set enabled = true/i);
  for (const gameKey of SHARED_GAME_KEYS) {
    assert.match(migration, new RegExp(`'${gameKey}'`));
  }
  assert.doesNotMatch(migration, /set enabled = \(game_key in/i);
  assert.doesNotMatch(migration, /where game_key not in/i);
  assert.match(migration, /get diagnostics enabled_game_count = row_count/i);
  assert.match(migration, /if enabled_game_count <> 5 then/i);
});

test("forward boundary grants each game RPC only to authenticated users", () => {
  for (const signature of AUTHENTICATED_RPC_SIGNATURES) {
    const escapedSignature = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      migration,
      new RegExp(`revoke all on function ${escapedSignature}\\s+from public, anon, authenticated`, "i"),
    );
    assert.match(
      migration,
      new RegExp(`grant execute on function ${escapedSignature}\\s+to authenticated`, "i"),
    );
  }

  assert.doesNotMatch(migration, /grant execute[\s\S]*to (?:public|anon)\b/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete|all) on (?:table )?public\./i);
});
