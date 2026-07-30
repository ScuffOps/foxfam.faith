import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaSource = readFileSync(new URL("./CloisterDiorama.jsx", import.meta.url), "utf8");
const dioramaCss = readFileSync(new URL("./find-vezmir.css", import.meta.url), "utf8");

test("Find Vezmir help distinguishes panning from depth controls", () => {
  assert.match(dioramaSource, /WASD \/ arrow keys to pan/);
  assert.match(dioramaSource, /Q \/ E changes depth/);
  assert.match(dioramaSource, /depth buttons move nearer or farther/);
  assert.doesNotMatch(dioramaSource, /arrows to change depth/);
});

test("Find Vezmir switches crisp flat layers without faded scene art", () => {
  const layerRule = dioramaCss.match(/\.diorama-layer\s*\{[^}]+\}/)?.[0] || "";
  const activeLayerRule = dioramaCss.match(/\.diorama-layer\[data-active="true"\]\s*\{[^}]+\}/)?.[0] || "";

  assert.match(layerRule, /visibility:\s*hidden/);
  assert.match(activeLayerRule, /visibility:\s*visible/);
  assert.doesNotMatch(`${layerRule}\n${activeLayerRule}`, /opacity|filter|mix-blend-mode/i);
  assert.doesNotMatch(dioramaCss, /#[0-9a-f]{8}\b/i);
});
