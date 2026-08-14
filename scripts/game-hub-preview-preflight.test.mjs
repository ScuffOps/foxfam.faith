import assert from "node:assert/strict";
import test from "node:test";

import {
  KNOWN_LIVE_PROJECT_REF,
  validateGameHubPreviewConfig,
} from "./game-hub-preview-preflight.mjs";

const STAGING_PROJECT_REF = "drauxhhxlatvylzktuqq";

function validEnvironment(overrides = {}) {
  return {
    VITE_GAME_HUB_STAGING: "1",
    VITE_SUPABASE_URL: `https://${STAGING_PROJECT_REF}.supabase.co`,
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_preview_only",
    ...overrides,
  };
}

test("accepts only an explicitly marked isolated preview backend", () => {
  assert.deepEqual(validateGameHubPreviewConfig(validEnvironment()), {
    projectRef: STAGING_PROJECT_REF,
  });
});

test("refuses the live Foxfam project", () => {
  assert.throws(
    () => validateGameHubPreviewConfig(validEnvironment({
      VITE_SUPABASE_URL: `https://${KNOWN_LIVE_PROJECT_REF}.supabase.co`,
    })),
    /refuses the live Foxfam Supabase project/,
  );
});

test("refuses missing staging intent, malformed URLs, and privileged keys", () => {
  assert.throws(
    () => validateGameHubPreviewConfig(validEnvironment({ VITE_GAME_HUB_STAGING: "0" })),
    /must equal 1/,
  );
  assert.throws(
    () => validateGameHubPreviewConfig(validEnvironment({ VITE_SUPABASE_URL: "https://example.com" })),
    /must exactly match/,
  );
  assert.throws(
    () => validateGameHubPreviewConfig(validEnvironment({ VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_nope" })),
    /refuses privileged/,
  );
});
