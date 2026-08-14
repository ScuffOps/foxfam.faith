import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const previewSource = fs.readFileSync(new URL("./RelicPreview.jsx", import.meta.url), "utf8");
const artCss = fs.readFileSync(new URL("./relic-art.css", import.meta.url), "utf8");
const familiarCss = fs.readFileSync(new URL("../../games/shared/familiar/familiar-avatar.css", import.meta.url), "utf8");

test("relic and familiar presentation avoids filtered or blend-mode rendering", () => {
  assert.doesNotMatch(`${previewSource}\n${artCss}\n${familiarCss}`, /mix-blend-mode|filter\s*:|drop-shadow|(?:linear|radial|conic)-gradient/i);
  assert.doesNotMatch(`${previewSource}\n${artCss}`, /opacity[=:]/i);
});

test("relic preview renders no more than one active cosmetic effect", () => {
  assert.match(previewSource, /const \[primaryEffect\] = EFFECT_PRIORITY/);
  assert.doesNotMatch(previewSource, /secondaryEffect/);
});

test("relic preview keeps equipped charms in a two-item rail with overflow", () => {
  assert.match(previewSource, /const MAX_VISIBLE_SOCKET_CHARMS = 2/);
  assert.match(previewSource, /equipped\.slice\(0, MAX_VISIBLE_SOCKET_CHARMS\)/);
  assert.match(previewSource, /overflowCharmCount/);
  assert.doesNotMatch(previewSource, /compact \? 3 : 4/);
});

test("relic evolution is derived from forged charm state rather than equipped count", () => {
  assert.match(previewSource, /getRelicEvolutionStage\(equipped\)/);
  assert.doesNotMatch(previewSource, /equipped\.length \+ mythicBonus/);
});

test("relic evolution uses a compact crest instead of orbiting decoration", () => {
  assert.doesNotMatch(previewSource, /<circle cx="80" cy="78"/);
  assert.match(previewSource, /data-relic-stage=\{stage\}/);
  assert.match(previewSource, /stage >= 3/);
});

test("relic bases resolve approved production art before the inline fallback", () => {
  assert.match(previewSource, /getApprovedCollectibleArtAsset\(COLLECTIBLE_ART_KINDS\.relicBase, baseId \|\| "lantern"\)/);
  assert.match(previewSource, /data-art-source="approved"/);
  assert.match(previewSource, /data-art-source="fallback"/);
});

test("relic effects resolve as one separately approved keyed layer", () => {
  assert.match(previewSource, /getApprovedCollectibleArtAsset\(COLLECTIBLE_ART_KINDS\.relicEffect, primaryEffect\)/);
  assert.match(previewSource, /data-art-kind="relic-effect"/);
  assert.match(artCss, /relic-art__approved-layer--effect/);
});

test("approved bases keep theme, evolution, and pending-effect fallback layers", () => {
  assert.match(previewSource, /RelicApprovedOverlaySvg/);
  assert.match(previewSource, /data-art-source="fallback-overlay"/);
  assert.match(previewSource, /EvolutionOrnaments colors=\{colors\} stage=\{stage\}/);
  assert.match(previewSource, /effect=\{approvedEffectAsset \? null : primaryEffect\}/);
  assert.match(previewSource, /relic-art__layer--theme-inlay/);
  assert.match(artCss, /relic-art__approved-layer--fallback-overlay/);
});
