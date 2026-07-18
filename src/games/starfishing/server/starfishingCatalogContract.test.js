import assert from "node:assert/strict";
import test from "node:test";
import {
  STARFISHING_ACHIEVEMENT_KEYS,
  STARFISHING_SERVER_CATALOG_VERSION,
} from "./starfishingCatalogContract.js";

test("server catalog exposes stable Phase 2 keys", () => {
  assert.equal(STARFISHING_SERVER_CATALOG_VERSION, 1);
  assert.deepEqual(STARFISHING_ACHIEVEMENT_KEYS, [
    "first-light",
    "gentle-return",
    "pocket-constellation",
    "myth-in-moonwater",
    "celestial-archivist",
    "hundred-lights",
  ]);
});
