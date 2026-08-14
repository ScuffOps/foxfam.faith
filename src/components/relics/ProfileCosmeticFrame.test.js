import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./ProfileCosmeticFrame.jsx", import.meta.url), "utf8");

test("profile particles prefer approved keyed art and retain the current fallback", () => {
  assert.match(source, /getApprovedCollectibleArtAsset\(COLLECTIBLE_ART_KINDS\.profileParticle, particle\.key\)/);
  assert.match(source, /data-art-source="approved"/);
  assert.match(source, /data-art-source="fallback"/);
});

test("profile particles render as sparse accents instead of a labeled badge", () => {
  assert.match(source, /data-profile-particle-accent/);
  assert.match(source, /Equipped profile effect:/);
  assert.doesNotMatch(source, /inline-flex items-center gap-1/);
  assert.doesNotMatch(source, /gradient|filter:|mix-blend|backdrop|blur|opacity-/i);
});
