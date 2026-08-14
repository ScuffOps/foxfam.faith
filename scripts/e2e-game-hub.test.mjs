import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const runnerSource = readFileSync(new URL("./e2e-game-hub.mjs", import.meta.url), "utf8");

test("game hub playtest runs WCAG Axe checks across every route and viewport", () => {
  assert.match(runnerSource, /import AxeBuilder from "@axe-core\/playwright"/);
  assert.match(runnerSource, /\.withTags\(\["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"\]\)/);
  assert.match(runnerSource, /impact === "critical" \|\| impact === "serious"/);
  assert.match(runnerSource, /accessibility,/);
});

test("game hub playtest separates desktop keyboard, pointer, and mobile touch interactions", () => {
  assert.match(runnerSource, /async function activateControl\(page, locator, viewport\)/);
  assert.match(runnerSource, /inputMode: "keyboard"/);
  assert.match(runnerSource, /inputMode: "pointer"/);
  assert.match(runnerSource, /inputMode: "touch"/);
  assert.match(runnerSource, /page\.keyboard\.press\("Space"\)/);
  assert.match(runnerSource, /page\.touchscreen\.tap\(/);
  assert.match(runnerSource, /page\.keyboard\.press\(key\)/);
  assert.match(runnerSource, /page\.keyboard\.press\(String\(ordinal\)\)/);
  assert.match(runnerSource, /name: `Search \$\{object\.region\} for \$\{object\.label\}`/);
  assert.match(runnerSource, /page\.keyboard\.press\("Digit2"\)/);
  assert.match(runnerSource, /choose the alternate clock landing by keyboard only/);
  assert.match(runnerSource, /name: `Search \$\{object\.region\} for \$\{object\.label\}`/);
  assert.match(runnerSource, /name: depthLabels\[nextLayer\], exact: true/);
  assert.match(runnerSource, /bloom a valid word by/);
  assert.doesNotMatch(runnerSource, /locator\("\.starfishing-world"\)\.click/);
  assert.doesNotMatch(runnerSource, /locator\(`#boba-tab-\$\{station\}`\)\.click/);
  assert.doesNotMatch(runnerSource, /locator\("\.time-runner-stage"\)\.click/);
  assert.doesNotMatch(runnerSource, /locator\("\.word-garden-scene"\)\.click/);
});

test("game hub playtest includes profile integration for relic and charm presentation", () => {
  assert.match(runnerSource, /slug: "profile", path: "\/profile"/);
  assert.match(runnerSource, /slug: "collections", path: "\/collections"/);
  assert.match(runnerSource, /slug: "familiar-wardrobe", path: "\/profile\/familiar"/);
});

test("game hub playtest exercises the hub, Forge preview, and familiar customization", () => {
  assert.match(runnerSource, /visit all six Courtyard worlds and return/);
  assert.match(runnerSource, /COURTYARD_JOURNEY/);
  assert.match(runnerSource, /name: "Return to Quarters"/);
  assert.match(runnerSource, /change a guest relic theme/);
  assert.match(runnerSource, /customize and save a guest familiar/);
  assert.match(runnerSource, /Guest preview saved on this device/);
});

test("game hub playtest raster-checks relics and charms at inventory icon sizes", () => {
  assert.match(runnerSource, /async function sampleSvgAtSizes/);
  assert.match(runnerSource, /const sizes = \[48, 64, 128\]/);
  assert.match(runnerSource, /const declaredFills = new Set/);
  assert.match(runnerSource, /assertCollectibleReadability\(relicSamples/);
  assert.match(runnerSource, /assertCollectibleReadability\(charmSamples/);
});

test("game hub playtest rejects familiar art clipped inside the Boba playfield", () => {
  assert.match(runnerSource, /container: "\.boba-counter"/);
  assert.match(runnerSource, /subjects: \["\.boba-counter__customer", "\.boba-counter__familiar"\]/);
  assert.match(runnerSource, /visual subjects clipped by playfield/);
  assert.match(runnerSource, /visualBounds,/);
});

test("Moonbrew task controls fit the compact desktop viewport without page scrolling", () => {
  assert.match(runnerSource, /key: "compact-desktop", width: 1200, height: 817/);
  assert.match(runnerSource, /desktopTaskControls: \["\.boba-cafe__stage-row", "\.boba-stations__actions"\]/);
  assert.match(runnerSource, /task controls require page scrolling/);
  assert.match(runnerSource, /taskFit,/);
});

test("every minigame keeps its primary play surface visible on short desktops", () => {
  assert.match(runnerSource, /key: "short-desktop", width: 1280, height: 720/);
  assert.match(runnerSource, /desktopTaskControls: \["\.starfishing-world", "\.starfishing-control-deck"\]/);
  assert.match(runnerSource, /desktopTaskControls: \["\.reliquary-board"\]/);
  assert.match(runnerSource, /desktopTaskControls: \["\.boba-cafe__stage-row", "\.boba-stations__actions"\]/);
  assert.match(runnerSource, /desktopTaskControls: \["\.vezmir-diorama__viewport", "\.vezmir-diorama__control-rail"\]/);
  assert.match(runnerSource, /desktopTaskControls: \["\.time-runner-stage__canvas-wrap", "\.time-runner-stage__controls"\]/);
  assert.match(runnerSource, /desktopTaskControls: \["\.word-flower__bed", "\.word-flower__tools"\]/);
});

test("Sanctuary routes keep the compact rail even when an old expanded preference exists", () => {
  assert.match(runnerSource, /localStorage\.setItem\("foxfam_sanctuary_nav_mode", "expanded"\)/);
  assert.match(runnerSource, /SANCTUARY_ROUTE_PATHS/);
  assert.match(runnerSource, /metrics\.sanctuaryRail\.width > 73/);
  assert.match(runnerSource, /compact Sanctuary navigation rail is not visible/);
  assert.match(runnerSource, /Open full portal navigation/);
  assert.match(runnerSource, /opening the full portal menu resized or shifted the game canvas/);
  assert.match(runnerSource, /page\.keyboard\.press\("Escape"\)/);
});
