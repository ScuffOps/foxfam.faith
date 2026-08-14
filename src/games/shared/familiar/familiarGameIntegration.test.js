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
  const styles = source("../../bobaCafe/ui/boba-cafe.css");

  assert.match(page, /const \{ familiar \} = useFamiliar\(\)/);
  assert.match(page, /<BobaCounter familiar=\{familiar\}/);
  assert.match(counter, /<FamiliarAvatar[^>]+familiar=\{familiar\}/);
  assert.match(counter, /<FamiliarAvatar[^>]+size="clamp\(104px, 12vw, 156px\)"[^>]+familiar=\{familiar\}/);
  for (const species of ["cloud-poodle", "moon-rabbit", "fox-cat", "moss-turtle", "shrine-cat"]) {
    assert.match(counter, new RegExp(`species: "${species}"`));
  }
  assert.doesNotMatch(counter, /boba-art__customer|boba-art__head|boba-art__face/);
  assert.doesNotMatch(counter, /species: "cat"|markings: "mask"/);
  assert.match(styles, /\.boba-counter__customer \{ position: absolute; left: 3%; bottom: 3%;/);
  assert.doesNotMatch(styles, /\.boba-counter__(?:customer|familiar)[^}]*transform: scale/);
});

test("wardrobe choices grow with wrapped familiar names", () => {
  const customizer = source("./FamiliarCustomizer.jsx");
  assert.match(customizer, /className="h-auto min-h-14[^\"]+whitespace-normal[^\"]+leading-tight"/);
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
  assert.match(scene, /FAMILIAR_SPECIES\[selection\.species\]/);
  assert.match(scene, /this\.load\.image\(this\.familiarAssetKey, species\.asset\)/);
  assert.match(scene, /this\.add\.image\(x, y, this\.familiarAssetKey\)/);
});

test("the selected familiar accompanies every remaining game without entering the playfield", () => {
  const companion = source("./GameFamiliarCompanion.jsx");
  const shellStyles = source("../ui/game-shell.css");

  assert.match(companion, /const \{ familiar \} = useFamiliar\(\)/);
  assert.match(companion, /<FamiliarAvatar familiar=\{familiar\} size="clamp\(64px, 7vw, 82px\)"/);
  for (const [pagePath, label] of [
    ["../../../pages/MatchMerge.jsx", "Reliquary helper"],
    ["../../../pages/FindVezmir.jsx", "Clue keeper"],
    ["../../../pages/WordGarden.jsx", "Garden companion"],
  ]) {
    const page = source(pagePath);
    assert.match(page, new RegExp(`<GameFamiliarCompanion label="${label}"`));
  }
  assert.match(shellStyles, /\.game-familiar-companion \{/);
  assert.match(shellStyles, /overflow: hidden/);
});
