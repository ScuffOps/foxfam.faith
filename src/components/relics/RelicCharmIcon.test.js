import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const iconSource = readFileSync(fileURLToPath(new URL("./RelicCharmIcon.jsx", import.meta.url)), "utf8");
const previewSource = readFileSync(fileURLToPath(new URL("./RelicPreview.jsx", import.meta.url)), "utf8");
const artCss = readFileSync(fileURLToPath(new URL("./relic-art.css", import.meta.url)), "utf8");

test("each Starfishing achievement charm has distinct authored art", () => {
  const achievementKeys = ["starlit-bobber", "merciful-tide", "pocket-star", "glassfin-comet", "fishpedia-frame", "century-chain"];
  const artKeys = achievementKeys.map((key) => {
    const match = iconSource.match(new RegExp(`"${key}": "([^"]+)"`));
    assert.ok(match, `${key} should have an explicit art mapping`);
    return match[1];
  });
  assert.equal(new Set(artKeys).size, achievementKeys.length);
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
