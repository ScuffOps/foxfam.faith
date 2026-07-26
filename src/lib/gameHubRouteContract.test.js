import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const appSource = readFileSync(new URL("../App.jsx", import.meta.url), "utf8");
const quartersSource = readFileSync(new URL("../pages/QuartersHub.jsx", import.meta.url), "utf8");

test("the game hub exposes privacy-safe visitor Quarters", () => {
  assert.match(appSource, /path="\/quarters\/:profileUserId"/);
  assert.match(quartersSource, /loadPublicGameProgression\(profileUserId\)/);
  assert.match(quartersSource, /VISITOR_PRIVATE_STATIONS/);
  assert.match(quartersSource, /favor=\{isVisitorMode \? null : favor\}/);
  assert.match(quartersSource, /isVisitorMode \? DEFAULT_FAMILIAR : familiar/);
  assert.match(quartersSource, /This member's public collection is displayed below/);
});

test("legacy Community Wordle links redirect to Blooming Ink", () => {
  assert.match(
    appSource,
    /path="\/community-wordle"\s+element=\{<Navigate replace to="\/word-garden"\s*\/>\}/,
  );
  assert.doesNotMatch(appSource, /import\s+CommunityWordle\b/);
});

test("the Quarters Trophy Shelf opens the real Collections trophy surface", () => {
  assert.match(appSource, /path="\/collections"/);
  assert.match(quartersSource, /trophies:\s*"\/collections"/);
  assert.doesNotMatch(quartersSource, /trophies:\s*"\/profile"/);
});
