import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./game-rewards-staging-smoke.mjs", import.meta.url), "utf8");

test("staging reward smoke is pinned to the isolated branch project", () => {
  assert.match(source, /const EXPECTED_PROJECT_REF = "drauxhhxlatvylzktuqq"/);
  assert.match(source, /VITE_GAME_HUB_STAGING/);
  assert.match(source, /Refusing a non-isolated Supabase target/);
  assert.doesNotMatch(source, /wdypokgdqgvqpyabvshq/);
});

test("staging reward smoke signs in two exact disposable users without printing credentials", () => {
  assert.match(source, /signInWithPassword/);
  assert.match(source, /Authenticated fixture user does not match its expected id/);
  assert.match(source, /GAME_REWARDS_STAGING_USER_A_ID/);
  assert.match(source, /GAME_REWARDS_STAGING_USER_B_ID/);
  assert.doesNotMatch(source, /console\.(?:log|error).*password/i);
  assert.doesNotMatch(source, /console\.(?:log|error).*access_token/i);
});
