import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./starfishingActiveArt.js", import.meta.url), "utf8");

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
  assert.match(source, /STARFISHING_FISH_ATLAS = Object\.freeze\(\{ columns: 3, rows: 2 \}\)/);
  assert.match(source, /STARFISHING_QTE_ATLAS = Object\.freeze\(\{ columns: 2, rows: 2 \}\)/);
  assert.doesNotMatch(source, /\/assets\/game-hub\//);
});
