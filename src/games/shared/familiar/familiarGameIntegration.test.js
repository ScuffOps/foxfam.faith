import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = (relativePath) => readFileSync(join(here, relativePath), "utf8");

test("saved familiars flow through Boba Cafe without a hardcoded invalid mascot", () => {
  const page = source("../../../pages/BobaCafe.jsx");
  const counter = source("../../bobaCafe/ui/BobaCounter.jsx");

  assert.match(page, /const \{ familiar \} = useFamiliar\(\)/);
  assert.match(page, /<BobaCounter familiar=\{familiar\}/);
  assert.match(counter, /<FamiliarAvatar[^>]+familiar=\{familiar\}/);
  assert.doesNotMatch(counter, /species: "cat"|markings: "mask"/);
});

test("saved familiars flow through Time Runner HUD and Phaser bridge", () => {
  const page = source("../../../pages/TimeRunner.jsx");
  const hud = source("../../timeRunner/ui/TimeRunnerHud.jsx");
  const scene = source("../../timeRunner/phaser/TimeRunnerScene.js");

  assert.match(page, /getFamiliar: \(\) => familiar/);
  assert.match(page, /<TimeRunnerHud\s+familiar=\{familiar\}/);
  assert.match(hud, /<FamiliarAvatar familiar=\{familiar\}/);
  assert.match(scene, /this\.bridge\?\.getFamiliar\?\.\(\)/);
});

test("saved familiars flow into the Starfishing pier companion", () => {
  const page = source("../../../pages/Starfishing.jsx");
  const scene = source("../../starfishing/phaser/StarfishingScene.js");

  assert.match(page, /getFamiliar: \(\) => familiar/);
  assert.match(scene, /this\.bridge\?\.getFamiliar\?\.\(\)/);
  assert.match(scene, /selection\.species === "moon-rabbit"/);
  assert.match(scene, /FAMILIAR_COATS\[selection\.coat\]/);
});
