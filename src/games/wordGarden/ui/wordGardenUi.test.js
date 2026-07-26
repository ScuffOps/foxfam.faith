import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cssSource = readFileSync(join(here, "word-garden.css"), "utf8");
const pageSource = readFileSync(join(here, "../../../pages/WordGarden.jsx"), "utf8");
const shellCssSource = readFileSync(join(here, "../../shared/ui/game-shell.css"), "utf8");

test("the conservatory uses authored solid-fill art without texture effects", () => {
  assert.match(pageSource, /word-garden-art__glass/);
  assert.match(pageSource, /word-garden-art__planters/);
  assert.doesNotMatch(cssSource, /(?:linear|radial|conic)-gradient|filter\s*:|backdrop-filter|background-image/);
});

test("the mobile conservatory reserves separate rows for its heading, guide, and flower", () => {
  assert.match(cssSource, /grid-template-rows:\s*auto auto 1fr/);
  assert.match(cssSource, /\.word-garden-scene__controls\s*\{[\s\S]*?min-height:/);
  assert.match(cssSource, /@media \(max-width: 520px\)[\s\S]*?\.word-flower\s*\{[\s\S]*?min-height:/);
});

test("the shared mobile shell keeps the playfield before its sidebar", () => {
  assert.match(shellCssSource, /\.game-shell__playfield\s*\{\s*order:\s*1/);
  assert.match(shellCssSource, /\.game-shell__sidebar\s*\{\s*order:\s*2/);
});
