import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ROUTES = Object.freeze([
  ["Match & Merge", "../../../pages/MatchMerge.jsx", "match-merge"],
  ["Boba Cafe", "../../../pages/BobaCafe.jsx", "boba-cafe"],
  ["Find Vezmir", "../../../pages/FindVezmir.jsx", "puzzle-cat"],
  ["Time Runner", "../../../pages/TimeRunner.jsx", "time-runner"],
  ["Word Garden", "../../../pages/WordGarden.jsx", "word-garden"],
]);

const FORBIDDEN_CLIENT_WRITES = /\.from\(["'](?:currency_accounts|user_material_balances|user_achievements|user_trophies|user_relic_charms)["']\)\s*\.\s*(?:insert|upsert|update|delete)/s;

for (const [label, path, gameKey] of ROUTES) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");

  test(`${label} keeps practice local and rewarded progress server-authoritative`, () => {
    assert.match(source, /startGameRewardSession/);
    assert.match(source, /progressGameRewardSession/);
    assert.match(source, /claimGameReward/);
    assert.match(source, new RegExp(`startGameRewardSession\\(supabase, ["']${gameKey}["']\\)`));
    assert.match(source, /Local only · no portal rewards|Practice mode is local and grants no portal rewards/);
    assert.doesNotMatch(source, FORBIDDEN_CLIENT_WRITES);
  });
}

for (const [label, path] of ROUTES) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");

  test(`${label} invalidates rewarded state and in-flight responses when the auth owner changes`, () => {
    assert.match(source, /const \{ isAuthenticated, isLoadingAuth, openLogin, user \} = useAuth\(\)/);
    assert.match(source, /requestGenerationRef/);
    assert.match(source, /requestGeneration !== requestGenerationRef\.current/);
    assert.match(source, /user\?\.id \|\| "authenticated"/);
    assert.match(source, /setMode\("practice"\)/);
    assert.match(source, /setRewardSession\(null\)/);
    assert.match(source, /setRewardReceipt\(null\)/);
    assert.match(source, /setRetryRequest\(null\)/);
  });

  test(`${label} restores owner-scoped retry intent with its canonical reward session`, () => {
    assert.match(source, /readGameRewardRecovery/);
    assert.match(source, /writeGameRewardRecovery/);
    assert.match(source, /clearGameRewardRecovery/);
    assert.match(source, /recovery\?\.request\.kind === "start"/);
    assert.match(source, /recovery\?\.session/);
    assert.match(source, /progressGameRewardSession[\s\S]{0,500}\}\), rewardSession\);/);
    assert.match(source, /claimGameReward[\s\S]{0,500}\}\), rewardSession\);/);
  });
}
