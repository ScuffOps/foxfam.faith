import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { selectAuthoritativeCatchEffect } from "./starfishingCatchEffectModel.js";

const componentSource = readFileSync(new URL("./StarfishingCatchEffect.jsx", import.meta.url), "utf8");

const releaseClaim = {
  catch: { duplicate: true, duplicatePolicy: "release" },
};

const equippedMercifulTide = {
  charmKey: "merciful-tide",
  equipped: true,
  source: { type: "achievement", key: "gentle-return" },
  effects: { catch_effect: "untrusted-effect" },
};

test("catch effects derive from the canonical equipped achievement charm", () => {
  assert.deepEqual(selectAuthoritativeCatchEffect([equippedMercifulTide], releaseClaim), {
    key: "merciful-tide",
    label: "Merciful Tide",
  });
});

test("catch effects reject unverified catch outcomes and untrusted charm provenance", () => {
  assert.equal(selectAuthoritativeCatchEffect([equippedMercifulTide], { catch: { duplicate: true, duplicatePolicy: "keep" } }), null);
  assert.equal(selectAuthoritativeCatchEffect([{ ...equippedMercifulTide, equipped: false }], releaseClaim), null);
  assert.equal(selectAuthoritativeCatchEffect([{ ...equippedMercifulTide, source: { type: "relic_roll", key: "gentle-return" } }], releaseClaim), null);
  assert.equal(selectAuthoritativeCatchEffect([{ ...equippedMercifulTide, source: { type: "achievement", key: "first-light" } }], releaseClaim), null);
});

test("catch effect rendering remains absent until its keyed art clears approval", () => {
  assert.match(componentSource, /getApprovedCollectibleArtAsset\(COLLECTIBLE_ART_KINDS\.catchEffect, effect\.key\)/);
  assert.match(componentSource, /if \(!approvedAsset\) return null/);
  assert.match(componentSource, /data-art-source="approved"/);
});
