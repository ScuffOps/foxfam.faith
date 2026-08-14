import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaSource = readFileSync(new URL("./CloisterDiorama.jsx", import.meta.url), "utf8");
const clueTraySource = readFileSync(new URL("./ClueTray.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./find-vezmir.css", import.meta.url), "utf8");

test("Find Vezmir consumes its pending art only through the atomic local family", () => {
  assert.match(dioramaSource, /FIND_VEZMIR_INTERACTIVE_ART\.depth/);
  assert.match(dioramaSource, /FIND_VEZMIR_INTERACTIVE_ART\.clues/);
  assert.match(dioramaSource, /FIND_VEZMIR_INTERACTIVE_ART\.vezmir/);
  assert.match(clueTraySource, /FIND_VEZMIR_INTERACTIVE_ART\.clues/);
  assert.match(clueTraySource, /FIND_VEZMIR_INTERACTIVE_ART\.vezmir/);
  assert.doesNotMatch(`${dioramaSource}\n${clueTraySource}`, /getApprovedGameArtAsset\("find-vezmir\.(?:clues|vezmir|depth)"\)/);
  assert.doesNotMatch(`${dioramaSource}\n${clueTraySource}`, /["']\/assets\//);
});

test("Find Vezmir retains every functional fallback when the family is unavailable", () => {
  assert.match(clueTraySource, /target\.found \? <Check \/> : target\.locked \? <LockKeyhole \/> : <Search \/>/);
  assert.match(dioramaSource, /<span>\{LAYER_LABELS\[layer\]\}<\/span>/);
  assert.match(dioramaSource, /target\?\.found \? <Check \/> : target\?\.hinted \? <LocateFixed \/> : null/);
  assert.match(dioramaSource, /if \(!FIND_VEZMIR_INTERACTIVE_ART\) return null/);
});

test("authored decoration remains pointer-inert and outside the accessibility tree", () => {
  assert.ok((dioramaSource.match(/aria-hidden="true"/g) || []).length >= 5);
  assert.ok((dioramaSource.match(/draggable="false"/g) || []).length >= 3);
  assert.ok((clueTraySource.match(/draggable="false"/g) || []).length >= 2);
  assert.match(dioramaSource, /aria-label=\{`Search \$\{object\.region\} for \$\{object\.label\}`\}/);
  assert.match(dioramaSource, /onClick=\{\(\) => onSelectLayer\(layer\)\}/);
  assert.match(dioramaSource, /onSearch\(\{ objectKey: object\.key, layer: activeLayer \}\)/);
  assert.match(styles, /\.vezmir-depth-control__art\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(styles, /\.vezmir-hotspot__authored-object\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(styles, /\.vezmir-clue-list__atlas-art\s*\{[^}]*pointer-events:\s*none/s);
});
