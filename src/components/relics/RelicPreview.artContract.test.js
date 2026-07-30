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
