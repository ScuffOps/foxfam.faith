import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const counterSource = readFileSync(new URL("./BobaCounter.jsx", import.meta.url), "utf8");
const stationSource = readFileSync(new URL("./BobaStationTray.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./boba-cafe.css", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../../../pages/BobaCafe.jsx", import.meta.url), "utf8");

test("Moonbrew uses a fixed widescreen scene plane with independent art layers", () => {
  assert.match(counterSource, /data-scene-coordinate-space="1920x1080"/);
  assert.equal((counterSource.match(/viewBox="0 0 1920 1080"/g) || []).length, 2);
  assert.match(counterSource, /data-scene-layer="environment"/);
  assert.match(counterSource, /data-scene-layer="workstations"/);
  assert.match(counterSource, /data-scene-layer="characters"/);
  assert.match(counterSource, /data-scene-layer="counter-foreground"/);
  assert.match(counterSource, /data-scene-layer="interface"/);
  assert.match(styles, /aspect-ratio:\s*16\s*\/\s*9/);
});

test("Moonbrew swaps approved art only as one coherent three-layer family", () => {
  for (const slotId of ["boba-cafe.room-bg", "boba-cafe.workstations", "boba-cafe.counter-fg"]) {
    assert.match(counterSource, new RegExp(`\\"${slotId.replace(".", "\\.")}\\"`));
  }
  assert.match(counterSource, /getApprovedGameArtFamily\(\[/);
  assert.match(counterSource, /const BOBA_APPROVED_ART_READY = Boolean\(BOBA_APPROVED_ART\)/);
  assert.equal((counterSource.match(/BOBA_APPROVED_ART_READY \? \(/g) || []).length, 3);
  assert.match(styles, /boba-counter__layer--environment \{ z-index: 1; \}/);
  assert.match(styles, /boba-counter__layer--workstations \{ z-index: 2; \}/);
  assert.match(styles, /boba-counter__characters \{ z-index: 3;/);
  assert.match(styles, /boba-counter__layer--counter-foreground \{ z-index: 4; \}/);
  assert.match(styles, /boba-counter__interface \{ z-index: 5;/);
});

test("Moonbrew swaps pending customer, ingredient, and drink art only as one complete family", () => {
  for (const slotId of ["boba-cafe.customers", "boba-cafe.ingredients", "boba-cafe.drink-states"]) {
    assert.match(readFileSync(new URL("../art/bobaCafeAuthoredArt.js", import.meta.url), "utf8"), new RegExp(`\\"${slotId.replace(".", "\\.")}\\"`));
  }
  assert.match(counterSource, /BOBA_AUTHORED_ART \? \(/);
  assert.match(stationSource, /BOBA_AUTHORED_ART \? \(/);
  assert.match(counterSource, /<FamiliarAvatar familiar=\{familiar\}/);
  assert.match(counterSource, /<span className="boba-cup__straw"/);
  assert.match(stationSource, /className="boba-stations__ingredient"/);
  assert.match(styles, /\.boba-art-atlas > img\s*\{[^}]*pointer-events:\s*none/s);
  assert.doesNotMatch(counterSource, /["']\/assets\//);
  assert.doesNotMatch(stationSource, /["']\/assets\//);
});

test("Moonbrew authored art does not replace native accessible station controls", () => {
  assert.match(stationSource, /role="tablist"/);
  assert.match(stationSource, /role="tab"/);
  assert.match(stationSource, /aria-selected=\{item\.key === station\.key\}/);
  assert.match(stationSource, /aria-pressed=\{selected\}/);
  assert.match(stationSource, /aria-label=\{`\$\{option\.label\}/);
  assert.match(stationSource, /onClick=\{\(\) => onStationChange\(item\.key\)\}/);
  assert.match(stationSource, /onKeyDown=\{\(event\) => handleTabKeyDown\(event, index\)\}/);
  assert.match(stationSource, /onClick=\{\(\) => onOptionSelect\(station\.key, index \+ 1\)\}/);
  assert.match(counterSource, /aria-live="polite"/);
});

test("Moonbrew responsive layout does not enlarge and crop the art plane", () => {
  assert.doesNotMatch(styles, /\.boba-counter__diorama/);
  assert.doesNotMatch(styles, /width:\s*112%/);
  assert.doesNotMatch(styles, /left:\s*-6%/);
  assert.doesNotMatch(styles, /boba-counter__customer[^}]*transform:\s*scale/);
  assert.doesNotMatch(styles, /boba-counter__familiar[^}]*transform:\s*scale/);
});

test("Moonbrew keeps the live order and every station control in one task-first workbench", () => {
  assert.match(pageSource, /className="boba-cafe__stage-row"/);
  assert.match(pageSource, /className="boba-cafe__live-ticket"/);
  assert.match(pageSource, /className="boba-cafe__workbench"/);
  assert.match(pageSource, /<details className="boba-cafe__ledger">/);
  assert.doesNotMatch(pageSource, /sidebar=\{sidebar\}/);
  assert.match(styles, /\.boba-cafe__stage-row\s*\{[^}]*grid-template-columns:/s);
  assert.match(styles, /\.boba-stations__tabs\s*\{[^}]*grid-template-columns:\s*repeat\(5,/s);
});

test("Moonbrew reserves short desktop height for the ingredient controls and Serve action", () => {
  assert.match(styles, /@media \(min-width:\s*761px\)/);
  assert.match(styles, /\.boba-cafe__workbench\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto/s);
  assert.match(styles, /\.boba-cafe__workbench\s*\{[^}]*height:\s*clamp\(36rem,\s*calc\(100dvh - 9rem\),\s*52rem\)/s);
  assert.match(styles, /\.boba-cafe__live-ticket\s*\{[^}]*overflow-y:\s*auto/s);
  assert.doesNotMatch(styles, /\.boba-cafe__workbench\s*\{[^}]*overflow-y:\s*auto/s);
});

test("Moonbrew number shortcuts use the activated game-control boundary", () => {
  assert.match(pageSource, /const handleNumberShortcut = useCallback/);
  assert.match(pageSource, /onKeyDown: handleNumberShortcut/);
  assert.doesNotMatch(pageSource, /window\.addEventListener\("keydown", handleNumberShortcut\)/);
});
