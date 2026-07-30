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

test("all playable game art follows the Foxfam flat cel-vector rendering contract", () => {
  assert.doesNotMatch(
    productionArtSource,
    /(?:linear|radial|conic)-gradient|filter\s*:|backdrop-filter|mix-blend-mode|feGaussianBlur|feTurbulence|drop-shadow|background-image\s*:/i,
  );
});

test("playable game art does not introduce texture, grain, or noise rendering", () => {
  assert.doesNotMatch(productionArtSource, /\b(?:texture|grain|noise)\b/i);
});
