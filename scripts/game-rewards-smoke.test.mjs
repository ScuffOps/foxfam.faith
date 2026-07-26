import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GAME_REWARD_FIXTURE_PATHS,
  KNOWN_LIVE_PROJECT_REF,
  getGameRewardSmokeConfig,
} from "./game-rewards-smoke.mjs";

const TOKEN_HEADER = { alg: "none", typ: "JWT" };
function tokenFor(sub, issuer) {
  const payload = { sub, role: "authenticated", iss: `${issuer}/auth/v1`, exp: Math.floor(Date.now() / 1000) + 3600 };
  return `${Buffer.from(JSON.stringify(TOKEN_HEADER)).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

function validEnv() {
  const projectRef = "abcdefghijklmnopqrst";
  const url = `https://${projectRef}.supabase.co`;
  return {
    GAME_REWARDS_E2E_DISPOSABLE: "1",
    GAME_REWARDS_E2E_PROJECT_REF: projectRef,
    GAME_REWARDS_E2E_SUPABASE_URL: url,
    GAME_REWARDS_E2E_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_disposable_test",
    GAME_REWARDS_E2E_FIXTURE_MARKER: "reward-boundary-test",
    GAME_REWARDS_E2E_TEARDOWN_CONTRACT: "DELETE_DISPOSABLE_PROJECT_AFTER_RUN",
    GAME_REWARDS_E2E_USER_A_ACCESS_TOKEN: tokenFor("11111111-1111-4111-8111-111111111111", url),
    GAME_REWARDS_E2E_USER_B_ACCESS_TOKEN: tokenFor("22222222-2222-4222-8222-222222222222", url),
  };
}

test("smoke config accepts only an explicit disposable non-production target", () => {
  const config = getGameRewardSmokeConfig(validEnv());
  assert.equal(config.projectRef, "abcdefghijklmnopqrst");
  assert.notEqual(config.projectRef, KNOWN_LIVE_PROJECT_REF);

  assert.throws(() => getGameRewardSmokeConfig({ ...validEnv(), GAME_REWARDS_E2E_DISPOSABLE: "0" }));
  assert.throws(() => getGameRewardSmokeConfig({
    ...validEnv(),
    GAME_REWARDS_E2E_PROJECT_REF: KNOWN_LIVE_PROJECT_REF,
    GAME_REWARDS_E2E_SUPABASE_URL: `https://${KNOWN_LIVE_PROJECT_REF}.supabase.co`,
  }));
});

test("fixed fixtures leave rewards disabled until the enable step", () => {
  const bootstrap = readFileSync(GAME_REWARD_FIXTURE_PATHS.bootstrap, "utf8");
  const enable = readFileSync(GAME_REWARD_FIXTURE_PATHS.enable, "utf8");
  const allowlist = JSON.parse(readFileSync(GAME_REWARD_FIXTURE_PATHS.allowlist, "utf8"));

  assert.match(bootstrap, /game_rewards_disposable_smoke_sentinel/i);
  assert.doesNotMatch(bootstrap, /set enabled = true/i);
  assert.match(enable, /set enabled = \(game_key in \('word-garden', 'match-merge', 'boba-cafe', 'puzzle-cat', 'time-runner'\)\)/i);
  assert.match(enable, /grant execute on function public\.start_game_reward_session\(text\) to authenticated/i);
  assert.match(enable, /grant execute on function public\.progress_game_reward_session\(uuid, uuid, jsonb\) to authenticated/i);
  assert.match(enable, /grant execute on function public\.claim_game_reward\(uuid, uuid, jsonb\) to authenticated/i);
  assert.equal(allowlist.contract, "game-rewards-disposable-v1");
});
