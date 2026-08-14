import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./ProfileAvatarFrame.jsx", import.meta.url), "utf8");

test("profile frames resolve approved key-specific art inside a square avatar layer", () => {
  assert.match(source, /getApprovedCollectibleArtAsset\(COLLECTIBLE_ART_KINDS\.profileFrame, frame\.key\)/);
  assert.match(source, /aspect-square/);
  assert.match(source, /data-profile-avatar-frame/);
  assert.match(source, /data-art-source="approved"/);
});

test("profile frame fallback remains flat and avoids card-wide visual effects", () => {
  assert.match(source, /data-art-source="fallback"/);
  assert.doesNotMatch(source, /gradient|filter:|mix-blend|backdrop|blur|opacity-/i);
});
