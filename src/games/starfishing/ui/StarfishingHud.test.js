import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const hudSource = readFileSync(join(here, "StarfishingHud.jsx"), "utf8");
const pageSource = readFileSync(join(here, "../../../pages/Starfishing.jsx"), "utf8");

test("signed-in duplicate handling is an accessible pre-cast choice", () => {
  assert.match(hudSource, /<fieldset className="reel-policy">/);
  assert.match(hudSource, /<legend>When the catch is a duplicate<\/legend>/);
  assert.match(hudSource, /type="radio"/);
  assert.match(hudSource, /Keep duplicate/);
  assert.match(hudSource, /Release for Favor/);
  assert.match(hudSource, /Convert to forge dust/);
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
