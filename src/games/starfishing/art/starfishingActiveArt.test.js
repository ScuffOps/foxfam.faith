import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./starfishingActiveArt.js", import.meta.url), "utf8");
const sceneSource = readFileSync(new URL("../phaser/StarfishingScene.js", import.meta.url), "utf8");
const planeSource = readFileSync(new URL("../phaser/starfishingArtPlane.js", import.meta.url), "utf8");

test("Starfishing active art resolves as one fail-closed production family", () => {
  for (const slotId of [
    "starfishing.rig",
    "starfishing.fisher",
    "starfishing.fish-family",
    "starfishing.qte",
  ]) {
    assert.match(source, new RegExp(slotId.replace(".", "\\.")));
  }
  assert.match(source, /getApprovedGameArtFamily\(STARFISHING_ACTIVE_ART_SLOT_IDS\)/);
  assert.match(source, /if \(!family\) return null/);
  for (const species of ["fox-cat", "moon-rabbit", "shrine-cat", "cloud-poodle", "moss-turtle", "moon-seal"]) {
    assert.match(source, new RegExp(`\\"${species}\\"`));
  }
  assert.match(source, /STARFISHING_FISH_ATLAS = Object\.freeze\(\{/);
  assert.match(source, /columns: 3,/);
  assert.match(source, /rows: 2,/);
  for (const fishKey of [
    "ember-mote",
    "lunar-guppy",
    "aurora-minnow",
    "comet-koi",
    "eclipse-ray",
    "veri-starwhale",
  ]) {
    assert.match(source, new RegExp(`\"${fishKey}\"`));
  }
  assert.match(source, /STARFISHING_QTE_ATLAS = Object\.freeze\(\{/);
  for (const action of ["qte-left", "qte-up", "qte-right", "qte-down"]) {
    assert.match(source, new RegExp(`\"${action}\"`));
  }
  assert.doesNotMatch(source, /\/assets\/game-hub\//);
});

test("Starfishing scene maps approved atlas families to live gameplay states", () => {
  assert.match(sceneSource, /getApprovedStarfishingActiveArt\(\)/);
  assert.match(sceneSource, /if \(STARFISHING_ACTIVE_ART\)/);
  assert.match(sceneSource, /registerActiveArtFrames\(\)/);
  assert.match(sceneSource, /renderQtePrompt\(state\.qtePattern\?\.\[state\.qteIndex\]\)/);
  assert.match(sceneSource, /renderCatchFrame\(state\.lastCatch\?\.fishKey\)/);
  assert.match(sceneSource, /STARFISHING_FISHER_ATLAS\.speciesOrder\.indexOf/);
  assert.match(sceneSource, /drawProceduralFamiliar/);
  assert.match(sceneSource, /this\.add\.star/);
  assert.doesNotMatch(sceneSource, /["']\/assets\/game-hub\//);

  for (const slotId of [
    "starfishing.rig",
    "starfishing.fisher",
    "starfishing.fish-family",
    "starfishing.qte",
  ]) {
    assert.match(planeSource, new RegExp(`slotId: \"${slotId.replace(".", "\\.")}\"`));
  }
});
