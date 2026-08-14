import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const roomSource = readFileSync(new URL("./IsometricRoom.jsx", import.meta.url), "utf8");
const courtyardSource = readFileSync(new URL("./PrioryCourtyard.jsx", import.meta.url), "utf8");
const roomCss = readFileSync(new URL("./quarters-scene.css", import.meta.url), "utf8");
const hudSource = readFileSync(new URL("./QuartersHud.jsx", import.meta.url), "utf8");

test("Quarters art uses explicit flat fills without rendering filters", () => {
  const combined = `${roomSource}\n${roomCss}`;
  assert.doesNotMatch(
    combined,
    /(?:linear|radial)-gradient|<filter|feGaussianBlur|feDropShadow|mix-blend-mode|backdrop-filter/i,
  );
  const roomArtworkCss = roomCss.slice(0, roomCss.indexOf(".quarters-hotspot"));
  assert.doesNotMatch(roomArtworkCss, /opacity:/i);
  assert.match(roomSource, /scene-wall-shadow--left/);
  assert.match(roomSource, /scene-wall-shadow--right/);
  assert.match(roomSource, /scene-floor-shadow/);
});

test("Quarters palette keeps distinct wall, floor, wood, forge, and wardrobe families", () => {
  const requiredSelectors = [
    ".scene-wall--blue",
    ".scene-wall--rose",
    ".scene-floor",
    ".wood",
    ".forge-front",
    ".wardrobe-front",
  ];
  requiredSelectors.forEach((selector) => assert.match(roomCss, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
});

test("Quarters keeps shared isometric structure and authored prop details", () => {
  assert.match(roomSource, /viewBox="0 0 1200 760"/);
  assert.match(roomSource, /getApprovedGameArtAsset\("quarters\.room"\)/);
  assert.match(roomSource, /getApprovedGameArtAsset\("quarters\.room-fixtures"\)/);
  assert.match(roomSource, /getApprovedGameArtAsset\("quarters\.room-foreground"\)/);
  assert.match(roomSource, /QUARTERS_APPROVED_ART_READY/);
  assert.match(roomSource, /data-scene-coordinate-space/);
  assert.match(roomSource, /data-scene-layer="environment"/);
  assert.match(roomSource, /data-scene-layer="fixtures"/);
  assert.match(roomSource, /data-scene-layer="foreground"/);
  assert.doesNotMatch(roomSource, /src="\/assets\/game-hub\/environments\//);
  assert.match(roomSource, /className="forge-bricks"/);
  assert.match(roomSource, /className="plant-blooms"/);
  assert.match(roomSource, /className="wardrobe-panel"/);
});

test("Quarters keeps one registered coordinate plane across art, hotspots, and mobile zoom", () => {
  assert.match(roomSource, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(roomSource, /scenePercentToPoint\(station\)/);
  assert.match(roomSource, /data-scene-x=\{point\.x\}/);
  assert.match(roomSource, /data-scene-y=\{point\.y\}/);
  assert.match(roomCss, /\.quarters-scene \{[^}]*aspect-ratio: 3 \/ 2;/s);
  assert.match(roomCss, /\.quarters-scene__world,\s*\.courtyard-scene__world \{ aspect-ratio: 3 \/ 2; \}/);
  assert.match(roomCss, /@media \(max-width: 640px\) \{[\s\S]*\.quarters-scene,\s*\.courtyard-scene \{ aspect-ratio: 3 \/ 2; \}/);
  assert.match(roomCss, /@media \(max-width: 640px\) \{[\s\S]*\.quarters-scene__world,\s*\.courtyard-scene__world \{[\s\S]*width: 100%;[\s\S]*transform: none;/);
  assert.doesNotMatch(roomCss, /\.quarters-scene__illustration[^}]*object-fit: cover/s);
});

test("the approved Quarters composite is primary while legacy planes remain registered fallbacks", () => {
  const manifestSource = readFileSync(new URL("../../games/shared/art/gameArtManifest.js", import.meta.url), "utf8");
  assert.match(manifestSource, /quarters-room\.png/);
  assert.match(manifestSource, /quarters-fixtures\.svg/);
  assert.match(manifestSource, /quarters-foreground\.svg/);
  assert.match(manifestSource, /approvedAsset\("\/assets\/game-hub\/quarters\/quarters-room\.png", "2026-08-13"\)/);
  assert.match(roomSource, /QUARTERS_COMPOSITE_ART_READY/);
});

test("Courtyard environment art is approval-gated and uses opaque cel shadows", () => {
  assert.match(courtyardSource, /getApprovedGameArtAsset\("quarters\.courtyard"\)/);
  assert.doesNotMatch(courtyardSource, /src="\/assets\/game-hub\/environments\//);
  assert.match(roomCss, /\.courtyard-landmarks \.landmark-shadow \{ fill: #[0-9a-f]{6}; stroke: none; \}/i);
  assert.doesNotMatch(roomCss, /\.courtyard-landmarks \.landmark-shadow \{[^}]*rgb\(/i);
});

test("Find Vezmir uses its real puzzle-cat key at desktop and mobile breakpoints", () => {
  assert.match(courtyardSource, /courtyard-gate--\$\{station\.key\}/);
  assert.match(roomCss, /\.courtyard-gate--puzzle-cat \.courtyard-gate__arch/);
  assert.doesNotMatch(roomCss, /\.courtyard-gate--word-garden,\s*\.courtyard-gate--puzzle-cat \{ left:/);
  assert.doesNotMatch(roomCss, /courtyard-gate--find-vezmir/);
});

test("the fallback Courtyard exposes a distinct landmark for every playable world", () => {
  for (const worldKey of ["word-garden", "match-merge", "boba-cafe", "puzzle-cat", "starfishing", "time-runner"]) {
    assert.match(courtyardSource, new RegExp(`data-world-key=\\"${worldKey}\\"`));
  }
});

test("Courtyard world entrances are not covered by the Quarters shortcut dock", () => {
  assert.match(hudSource, /scene === "quarters"[\s\S]*quarters-hud__dock/);
});
