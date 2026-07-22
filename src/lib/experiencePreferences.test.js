import assert from "node:assert/strict";
import test from "node:test";
import {
  applyExperiencePreferences,
  DEFAULT_EXPERIENCE_PREFERENCES,
  readExperiencePreferences,
} from "./experiencePreferences.js";

test("experience preferences have privacy-safe, low-effect defaults", () => {
  assert.deepEqual(readExperiencePreferences(), DEFAULT_EXPERIENCE_PREFERENCES);
  assert.deepEqual(applyExperiencePreferences(), DEFAULT_EXPERIENCE_PREFERENCES);
});
