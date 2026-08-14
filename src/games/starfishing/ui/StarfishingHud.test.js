import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const hudSource = readFileSync(join(here, "StarfishingHud.jsx"), "utf8");
const fishpediaSource = readFileSync(join(here, "FishpediaPanel.jsx"), "utf8");
const cssSource = readFileSync(join(here, "starfishing.css"), "utf8");
const sceneSource = readFileSync(join(here, "../phaser/StarfishingScene.js"), "utf8");
const pageSource = readFileSync(join(here, "../../../pages/Starfishing.jsx"), "utf8");

test("signed-in duplicate handling is an accessible pre-cast choice", () => {
  assert.match(hudSource, /<fieldset className="reel-policy">/);
  assert.match(hudSource, /<legend>When the catch is a duplicate<\/legend>/);
  assert.match(hudSource, /type="radio"/);
  assert.match(hudSource, /Keep duplicate/);
  assert.match(hudSource, /Release for Favor/);
  assert.match(hudSource, /Distill to Star Glass/);
  assert.match(hudSource, /New discoveries are always kept/);
});

test("the selected policy is frozen into the authoritative claim without preclaim disclosure", () => {
  const signedInPreclaim = pageSource.match(
    /\{isCatchReveal && authMode === AUTH_MODES\.signedIn \? \(([\s\S]*?)\) : isCatchReveal \? \(/,
  )?.[1];

  assert.ok(signedInPreclaim);
  assert.match(pageSource, /stateRef\.current\.selectedDuplicatePolicy/);
  assert.match(pageSource, /duplicatePolicy: pendingClaim\.duplicatePolicy/);
  assert.match(signedInPreclaim, /Size, duplicate status, and rewards remain unverified/);
  assert.doesNotMatch(signedInPreclaim, /lastCatch\.duplicate|lastCatch\.size|favor|material/i);
});

test("Starfishing auth outages block local play and expose an explicit retry", () => {
  assert.match(hudSource, /authMode === "unavailable"/);
  assert.match(hudSource, /Retry session check/);
  assert.match(pageSource, /AUTH_MODES\.unavailable/);
  assert.match(pageSource, /applyUnavailableSession\(authError\)/);
  assert.match(pageSource, /onRetryAuth=\{retrySessionCheck\}/);
});

test("the authoritative catch receipt presents normalized server achievements", () => {
  assert.match(hudSource, /claim\.achievements\.map\(\(achievement\) =>/);
  assert.match(hudSource, /key=\{achievement\.achievementKey\}/);
  assert.match(hudSource, /\{achievement\.title\}/);
  assert.doesNotMatch(hudSource, /achievement\.achievementKey\.replace|format.*achievement/i);
});

test("the production-art pass uses authored silhouettes without texture effects", () => {
  for (const fishKey of [
    "ember-mote",
    "lunar-guppy",
    "aurora-minnow",
    "comet-koi",
    "eclipse-ray",
    "veri-starwhale",
  ]) {
    assert.match(fishpediaSource, new RegExp(fishKey));
  }
  assert.match(sceneSource, /starfishing-environment/);
  assert.match(sceneSource, /getApprovedGameArtAsset\(\s*STARFISHING_ART_ASSETS\.environment\.slotId/);
  assert.match(sceneSource, /FAMILIAR_SPECIES/);
  assert.match(sceneSource, /species\.asset/);
  assert.doesNotMatch(`${sceneSource}\n${fishpediaSource}\n${cssSource}`, /filter:|drop-shadow|linear-gradient|radial-gradient|feTurbulence|noise/i);
});

test("Starfishing keeps the pond, current line state, and reel controls in one task-first stage", () => {
  assert.match(pageSource, /className="starfishing-stage"/);
  assert.match(pageSource, /className="starfishing-control-deck"/);
  assert.match(pageSource, /Current catch/);
  assert.match(pageSource, /Line tension/);
  assert.match(cssSource, /\.starfishing-stage \{ display: grid;/);
  assert.match(cssSource, /\.starfishing-control-deck \{[^}]*border-left: 3px solid/);
});

test("mobile Starfishing presents controls before the playfield with large QTE targets", () => {
  assert.match(cssSource, /\.starfishing-control-deck \{ order: 1/);
  assert.match(cssSource, /\.starfishing-world \{ order: 2/);
  assert.match(cssSource, /\.reel-qte__buttons button \{ min-height: 58px/);
  assert.match(cssSource, /\.reel-qte__buttons \{ grid-template-columns: repeat\(2/);
});

test("Fishpedia is secondary to the active fishing task", () => {
  assert.match(pageSource, /<details className="starfishing-journal">/);
  assert.match(pageSource, /<summary>[\s\S]*Review catches and constellation silhouettes/);
  assert.match(cssSource, /\.starfishing-journal > summary/);
});

test("Fishpedia tabs provide roving focus, keyboard navigation, and an associated panel", () => {
  assert.match(fishpediaSource, /useRef/);
  assert.match(fishpediaSource, /role="tablist"/);
  assert.match(fishpediaSource, /id=\{`fishpedia-tab-/);
  assert.match(fishpediaSource, /aria-controls="fishpedia-panel"/);
  assert.match(fishpediaSource, /tabIndex=\{tab === item\.key \? 0 : -1\}/);
  assert.match(fishpediaSource, /ArrowLeft/);
  assert.match(fishpediaSource, /ArrowRight/);
  assert.match(fishpediaSource, /role="tabpanel"/);
  assert.match(fishpediaSource, /aria-labelledby=\{`fishpedia-tab-/);
});
