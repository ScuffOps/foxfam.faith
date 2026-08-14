import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CharmForgeWorkbench.jsx", import.meta.url), "utf8");

test("Forge star progression uses meter semantics and guest actions stay disabled", () => {
  assert.match(source, /role="meter"/);
  assert.match(source, /aria-valuemin=\{0\}/);
  assert.match(source, /aria-valuemax=\{3\}/);
  assert.match(source, /aria-valuenow=\{charm\.star\}/);
  assert.match(source, /disabled=\{readOnly \|\| !recipe/);
  assert.match(source, /disabled=\{readOnly \|\| !canConvert/);
});

test("Forge cards preserve game provenance and passive or cosmetic presentation", () => {
  assert.match(source, /getCharmPresentation\(charm\)/);
  assert.match(source, /\{presentation\.provenance\}/);
  assert.match(source, /presentation\.effectLabels\.map/);
  assert.match(source, /aria-label="Charm effects"/);
});
