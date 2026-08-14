import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./game-rewards-staging-ephemeral-smoke.mjs", import.meta.url), "utf8");

test("ephemeral staging smoke is pinned to the isolated branch and refuses production", () => {
  assert.match(source, /EXPECTED_PROJECT_REF = "drauxhhxlatvylzktuqq"/);
  assert.match(source, /Refusing a non-isolated Supabase target/);
  assert.doesNotMatch(source, /wdypokgdqgvqpyabvshq/);
});

test("ephemeral staging smoke uses publishable auth and never logs credentials", () => {
  assert.match(source, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(source, /client\.auth\.signUp/);
  assert.doesNotMatch(source, /service[_-]?role|supabase_admin/i);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*(?:password|accessToken)/s);
});

test("ephemeral staging smoke reports ids for deterministic cleanup", () => {
  assert.match(source, /confirmationError\.cleanupUserId = data\.user\.id/);
  assert.match(source, /cleanupUserIds\.push\(error\.cleanupUserId\)/);
  assert.match(source, /claimedGames: result\.claimedGames/);
});
