import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RELIC_CHARM_CATALOG } from "../../lib/relicCharms.js";

const iconSource = readFileSync(fileURLToPath(new URL("./RelicCharmIcon.jsx", import.meta.url)), "utf8");
const previewSource = readFileSync(fileURLToPath(new URL("./RelicPreview.jsx", import.meta.url)), "utf8");
const artCss = readFileSync(fileURLToPath(new URL("./relic-art.css", import.meta.url)), "utf8");

test("every legacy charm fallback is explicit until its approved production asset exists", () => {
  const achievementKeys = RELIC_CHARM_CATALOG
    .filter((charm) => charm.kind === "achievement")
    .map((charm) => charm.key);
  const artKeys = achievementKeys.map((key) => {
    const match = iconSource.match(new RegExp(`"${key}": "([^"]+)"`));
    assert.ok(match, `${key} should have an explicit art mapping`);
    return match[1];
  });
  assert.equal(new Set(artKeys).size, achievementKeys.length);
});

test("charm art resolves through the approval manifest before the legacy fallback", () => {
  assert.match(iconSource, /getApprovedCollectibleArtAsset\(COLLECTIBLE_ART_KINDS\.charm, charmKey\)/);
  assert.match(iconSource, /data-art-source="approved"/);
  assert.match(iconSource, /data-art-source="fallback"/);
});

test("relic art avoids texture, blur, filter, and gradient rendering", () => {
  const combined = `${iconSource}\n${previewSource}\n${artCss}`;
  assert.doesNotMatch(combined, /(?:linear|radial)-gradient|<filter|feGaussianBlur|feDropShadow|backdrop-blur|mixBlendMode/i);
});

test("relic art keeps accessible image labels and reduced motion support", () => {
  assert.match(iconSource, /role="img"/);
  assert.match(previewSource, /aria-label="Crafted profile relic"/);
  assert.match(artCss, /prefers-reduced-motion/);
});
