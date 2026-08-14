import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const host = source("./GameCanvasHost.jsx");
const factory = source("../phaser/createGameInstance.js");
const timePage = source("../../../pages/TimeRunner.jsx");
const timeScene = source("../../timeRunner/phaser/TimeRunnerScene.js");
const timeArtPlane = source("../../timeRunner/phaser/timeRunnerArtPlane.js");
const timeCss = source("../../timeRunner/ui/time-runner.css");
const fishingPage = source("../../../pages/Starfishing.jsx");
const fishingScene = source("../../starfishing/phaser/StarfishingScene.js");
const fishingArtPlane = source("../../starfishing/phaser/starfishingArtPlane.js");
const fishingCss = source("../../starfishing/ui/starfishing.css");

test("Phaser hosts can opt into a stable FIT coordinate plane without changing the shared default", () => {
  assert.match(host, /scaleMode = "resize"/);
  assert.match(host, /width = 960/);
  assert.match(host, /height = 540/);
  assert.match(factory, /fit: Phaser\.Scale\.FIT/);
  assert.match(factory, /resize: Phaser\.Scale\.RESIZE/);
  assert.match(factory, /SCALE_MODES\[scaleMode\] \|\| SCALE_MODES\.resize/);
});

test("Time Runner uses a stable widescreen plane with independent production art layers", () => {
  assert.match(timePage, /className="time-runner-canvas"[\s\S]*width=\{960\}[\s\S]*height=\{540\}[\s\S]*scaleMode="fit"/);
  assert.match(timeCss, /\.time-runner-canvas \{[^}]*aspect-ratio: 16 \/ 9/);
  assert.match(timeCss, /\.time-runner-canvas \{[^}]*height: auto !important;[^}]*min-height: 0 !important/);
  assert.match(timeScene, /time-runner-environment-layer/);
  assert.match(timeScene, /getApprovedGameArtAsset\("time-runner\.clocktower"\)/);
  assert.match(timeScene, /textures\.exists\("time-runner-environment"\)/);
  assert.match(timeScene, /time-runner-approved-environment-layer/);
  assert.match(timeScene, /TIME_RUNNER_APPROVED_ANCHORS/);
  assert.match(timeScene, /usesApprovedEnvironment\(\)/);
  assert.match(timeArtPlane, /familiar: point\(0\.286, 0\.365\)/);
  assert.match(timeArtPlane, /point\(0\.59, 0\.515\)/);
  assert.match(timeArtPlane, /point\(0\.85, 0\.605\)/);
  assert.match(timeScene, /time-runner-route-layer/);
  assert.match(timeScene, /time-runner-actor-layer/);
  assert.match(timeScene, /setData\("sceneLayer", "interaction"\)/);
  assert.match(timeScene, /new Phaser\.Geom\.Circle\(21, 21, 60\)/);
  assert.match(timeCss, /@media \(max-width: 760px\) \{[\s\S]*\.time-runner-stage__controls/);
  assert.doesNotMatch(timeCss, /\.time-runner-stage__controls \{[^}]*position: absolute/s);
});

test("Starfishing keeps its approved plate and interaction layers on one widescreen plane", () => {
  assert.match(fishingPage, /className="starfishing-canvas"[\s\S]*width=\{960\}[\s\S]*height=\{640\}[\s\S]*scaleMode="fit"/);
  assert.match(fishingCss, /\.starfishing-canvas \{[^}]*width: 100%;[^}]*min-width: 0;[^}]*max-width: 100%;[^}]*height: auto !important;[^}]*min-height: 0 !important;[^}]*aspect-ratio: 3 \/ 2/);
  assert.match(fishingCss, /\.starfishing-canvas canvas \{[^}]*width: 100% !important;[^}]*max-width: 100% !important;/);
  assert.doesNotMatch(fishingCss, /\.starfishing-canvas \{ aspect-ratio: 4 \/ 3/);
  assert.match(fishingScene, /getApprovedGameArtAsset/);
  assert.match(fishingScene, /STARFISHING_ART_ASSETS\.environment\.slotId/);
  assert.match(fishingScene, /STARFISHING_ART_ASSETS\.foreground\.slotId/);
  assert.match(fishingScene, /STARFISHING_ART_ASSETS\.environment\.textureKey/);
  assert.match(fishingScene, /STARFISHING_ART_ASSETS\.foreground\.textureKey/);
  assert.match(fishingScene, /starfishing-foreground-layer/);
  assert.match(fishingScene, /starfishing-familiar-fallback-layer/);
  assert.match(fishingScene, /STARFISHING_ART_LAYERS/);
  assert.match(fishingScene, /STARFISHING_ART_ANCHORS/);
  assert.match(fishingScene, /const point = \(x, y\) => \(\{ x, y \}\)/);
  assert.doesNotMatch(fishingScene, /new Phaser\.Geom\.Point/);
  assert.match(fishingArtPlane, /width: 960/);
  assert.match(fishingArtPlane, /height: 640/);
  assert.match(fishingArtPlane, /aspect: "3:2"/);
  assert.match(fishingArtPlane, /slotId: "starfishing\.pond-foreground"/);
  assert.match(fishingArtPlane, /requiresTransparency: true/);
  for (const layer of ["rig", "interaction", "catch", "reveal", "familiar"]) {
    assert.match(fishingScene, new RegExp(`setData\\(\"sceneLayer\", \"${layer}\"\\)`));
  }
  assert.match(fishingScene, /setData\("sceneLayer", STARFISHING_ART_ASSETS\.environment\.sceneLayer\)/);
  assert.match(fishingScene, /setData\("sceneLayer", STARFISHING_ART_ASSETS\.foreground\.sceneLayer\)/);
});
