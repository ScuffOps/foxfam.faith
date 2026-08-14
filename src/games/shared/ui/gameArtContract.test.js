import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productionArtFiles = [
  "../../starfishing/phaser/StarfishingScene.js",
  "../../starfishing/ui/FishpediaPanel.jsx",
  "../../starfishing/ui/starfishing.css",
  "../../matchMerge/ui/MatchMergeBoard.jsx",
  "../../matchMerge/ui/match-merge.css",
  "../../bobaCafe/ui/BobaCounter.jsx",
  "../../bobaCafe/ui/BobaStationTray.jsx",
  "../../bobaCafe/ui/boba-cafe.css",
  "../../findVezmir/ui/CloisterDiorama.jsx",
  "../../findVezmir/ui/find-vezmir.css",
  "../../timeRunner/phaser/TimeRunnerScene.js",
  "../../timeRunner/ui/time-runner.css",
  "../../wordGarden/ui/WordFlower.jsx",
  "../../wordGarden/ui/word-garden.css",
];

const productionArtSource = productionArtFiles
  .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
  .join("\n");
const bobaCss = readFileSync(new URL("../../bobaCafe/ui/boba-cafe.css", import.meta.url), "utf8");

test("all playable game art follows the Foxfam flat cel-vector rendering contract", () => {
  assert.doesNotMatch(
    productionArtSource,
    /(?:linear|radial|conic)-gradient|filter\s*:|backdrop-filter|mix-blend-mode|feGaussianBlur|feTurbulence|drop-shadow|background-image\s*:/i,
  );
});

test("playable game art does not introduce grain or noise rendering", () => {
  assert.doesNotMatch(productionArtSource, /\b(?:grain|noise)\b/i);
});

test("Boba playfield derives height from its visible responsive width", () => {
  assert.match(bobaCss, /\.boba-counter\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*0;[^}]*aspect-ratio:\s*16\s*\/\s*9;/s);
  assert.doesNotMatch(bobaCss, /@media[^}]+\{[\s\S]*?\.boba-counter\s*\{[^}]*min-height:/);
});
