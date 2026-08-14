import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ENABLED_GAME_KEYS,
  GAME_REWARD_FIXTURE_PATHS,
  KNOWN_LIVE_PROJECT_REF,
  bobaRecipeActions,
  findCanonicalMerge,
  getGameRewardSmokeConfig,
  orderedFindVezmirTargets,
  wordGardenSmokeWordsForPuzzle,
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

test("smoke coverage matches every enabled shared-reward game", () => {
  assert.deepEqual(ENABLED_GAME_KEYS, [
    "word-garden",
    "match-merge",
    "boba-cafe",
    "puzzle-cat",
    "time-runner",
  ]);

  const smoke = readFileSync(new URL("./game-rewards-smoke.mjs", import.meta.url), "utf8");
  assert.match(smoke, /startSession\(clientA, "word-garden"\)/);
  assert.match(smoke, /completeTimeRunner\(clientA, await startSession\(clientA, "time-runner"\)\)/);
  assert.match(smoke, /completeMatchMerge/);
  assert.match(smoke, /completeBobaCafe/);
  assert.match(smoke, /completeFindVezmir/);
  assert.match(smoke, /completeTimeRunner/);
  assert.match(smoke, /assertCollectibleReceipt/);
  assert.match(smoke, /unknown game session/);
  assert.doesNotMatch(smoke, /disabled game session/);
});

test("smoke drivers derive legal actions from canonical server state", () => {
  assert.deepEqual(findCanonicalMerge([1, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), {
    op: "merge",
    from: 0,
    to: 1,
  });

  const recipe = {
    tea: "jasmine-tea",
    milk: "cream-cloud",
    topping: "star-jelly",
    charm: "ribbon-seal",
    sweetness: "soft",
  };
  assert.deepEqual(bobaRecipeActions({ active_order: { recipe } }), [
    { op: "select", station: "tea", choice: "jasmine-tea" },
    { op: "select", station: "milk", choice: "cream-cloud" },
    { op: "select", station: "topping", choice: "star-jelly" },
    { op: "select", station: "charm", choice: "ribbon-seal" },
    { op: "select", station: "sweetness", choice: "soft" },
  ]);

  const targets = [
    { key: "final", role: "final" },
    ...Array.from({ length: 5 }, (_, index) => ({ key: `clue-${index}`, role: "clue" })),
  ];
  assert.deepEqual(orderedFindVezmirTargets({ targets }).map((target) => target.role), [
    "clue", "clue", "clue", "clue", "clue", "final",
  ]);

  assert.deepEqual(wordGardenSmokeWordsForPuzzle({ key: "violet-hour-20260813" }), {
    normal: "VOTE",
    fullBloom: "VIOLETS",
  });
  assert.deepEqual(wordGardenSmokeWordsForPuzzle({ key: "petal-rite" }), {
    normal: "PALE",
    fullBloom: "PETALERS",
  });
  assert.throws(
    () => wordGardenSmokeWordsForPuzzle({ key: "unregistered-rotation-20260813" }),
    /No smoke words are registered/,
  );
});

test("Word Garden smoke covers every seeded server rotation", () => {
  const expected = new Map([
    ["petal-rite", ["PALE", "PETALERS"]],
    ["planter-song", ["PALE", "PLANTER"]],
    ["garden-vow", ["DARE", "GARDENS"]],
    ["violet-hour", ["VOTE", "VIOLETS"]],
    ["thorned-path", ["HORN", "THORNED"]],
    ["pollen-drift", ["FLOW", "FLOWERS"]],
    ["meadow-rest", ["DAME", "MEADOWS"]],
  ]);

  for (const [key, [normal, fullBloom]] of expected) {
    assert.deepEqual(wordGardenSmokeWordsForPuzzle({ key: `${key}-20300101` }), { normal, fullBloom });
  }
});
