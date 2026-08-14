import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaSource = readFileSync(new URL("./CloisterDiorama.jsx", import.meta.url), "utf8");
const clueTraySource = readFileSync(new URL("./ClueTray.jsx", import.meta.url), "utf8");
const dioramaCss = readFileSync(new URL("./find-vezmir.css", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../../../pages/FindVezmir.jsx", import.meta.url), "utf8");

test("Find Vezmir makes the playfield task and controls explicit", () => {
  assert.match(dioramaSource, /Current target/);
  assert.match(dioramaSource, /currentTarget\.region/);
  assert.match(dioramaSource, /onClick=\{\(\) => currentTarget && onSelectLayer\(currentTarget\.layer\)\}/);
  assert.match(dioramaSource, /state\.layers\.map/);
  assert.match(dioramaSource, /aria-pressed=\{layer === activeLayer\}/);
  assert.match(dioramaSource, /WASD \/ arrows pan/);
  assert.match(dioramaSource, /Q \/ E depth/);
  assert.match(dioramaSource, /choose a depth above/);
  assert.doesNotMatch(dioramaSource, /arrows to change depth/);
});

test("Find Vezmir supports focusable keyboard navigation and touch pan controls", () => {
  assert.match(dioramaSource, /tabIndex=\{disabled \? -1 : 0\}/);
  assert.match(dioramaSource, /aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown W A S D Q E"/);
  assert.match(dioramaSource, /aria-label="Pan search scene"/);
  assert.match(dioramaSource, /aria-label="Recenter search scene"/);
  assert.ok((dioramaSource.match(/onPan\(\{ x:/g) || []).length >= 4);
  assert.match(dioramaCss, /\.vezmir-pan-controls button\s*\{[^}]*width:\s*2\.55rem[^}]*height:\s*2\.55rem/s);
  assert.match(dioramaCss, /@media \(max-width: 760px\)[\s\S]*\.vezmir-pan-controls button\s*\{[^}]*width:\s*2\.75rem[^}]*height:\s*2\.75rem/);
  assert.match(dioramaCss, /\.vezmir-diorama__viewport\s*\{[^}]*inset:\s*0 0 4\.65rem/);
  assert.match(dioramaCss, /\.vezmir-diorama__viewport\s*\{[^}]*touch-action:\s*none/s);
  const shellRule = dioramaCss.match(/\.vezmir-diorama\s*\{[^}]+\}/)?.[0] || "";
  assert.doesNotMatch(shellRule, /touch-action:\s*none/);
  assert.match(dioramaCss, /\.vezmir-diorama__control-rail\s*\{[^}]*border-top:\s*3px solid #485365/s);
  assert.match(dioramaCss, /@media \(max-width: 360px\)[\s\S]*\.vezmir-diorama__feedback\s*\{\s*display:\s*none/);
});

test("short desktop viewports keep the cloister control rail above the fold", () => {
  assert.match(
    dioramaCss,
    /@media \(min-width: 761px\) and \(max-height: 800px\)[\s\S]*?\.vezmir-diorama\s*\{[^}]*height:\s*calc\(100svh - 9rem\)[^}]*min-height:\s*32rem/s,
  );
});

test("Find Vezmir depth shortcuts use the activated game-control boundary", () => {
  assert.match(pageSource, /const handleDepthShortcut = useCallback/);
  assert.match(pageSource, /onKeyDown: handleDepthShortcut/);
  assert.doesNotMatch(pageSource, /window\.addEventListener\("keydown", handleDepthShortcut\)/);
});

test("Find Vezmir keeps the journal and reward mode secondary", () => {
  assert.match(clueTraySource, /<details className="vezmir-clue-tray">/);
  assert.match(clueTraySource, /<summary className="vezmir-clue-tray__title">/);
  assert.doesNotMatch(clueTraySource, /<details[^>]*open/);
  assert.match(clueTraySource, /aria-current=\{target\.key === currentTargetKey \? "step" : undefined\}/);
  assert.match(pageSource, /className="vezmir-sidebar__quick-actions"/);
  assert.match(pageSource, /currentTarget=\{currentTarget\}/);
  assert.match(pageSource, /message=\{state\.message\}/);
  assert.match(dioramaCss, /\.game-shell\[data-world="find-vezmir"\] \.game-shell__layout\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("Find Vezmir disables depth and pointer interactions while busy", () => {
  assert.match(dioramaSource, /disabled=\{disabled\}[\s\S]*onClick=\{\(\) => onSelectLayer\(layer\)\}/);
  assert.ok((dioramaSource.match(/type="button" disabled=\{disabled\}/g) || []).length >= 5);
  assert.ok((dioramaSource.match(/if \(disabled\) return;/g) || []).length >= 3);
});

test("Find Vezmir gates its atomic three-plane environment and keeps a flat authored fallback", () => {
  const plateRules = (dioramaCss.match(/(?:[^{}]*\.vezmir-cloister__plate[^{}]*)\{[^}]+\}/g) || []).join("\n");
  const focusRule = dioramaCss.match(/\.vezmir-cloister__focus\s*\{[^}]+\}/)?.[0] || "";

  assert.match(dioramaSource, /getApprovedGameArtAsset\("find-vezmir\.cloister-background"\)/);
  assert.match(dioramaSource, /getApprovedGameArtAsset\("find-vezmir\.cloister-room"\)/);
  assert.match(dioramaSource, /getApprovedGameArtAsset\("find-vezmir\.cloister-foreground"\)/);
  assert.match(dioramaSource, /CLOISTER_ART_ASSETS\.every/);
  assert.match(dioramaSource, /HAS_APPROVED_CLOISTER_ART \? \(/);
  assert.match(dioramaSource, /data-layer=\{layer\}/);
  assert.match(dioramaSource, /<CloisterFallback \/>/);
  assert.doesNotMatch(dioramaSource, /src="\/assets\/game-hub\/environments\//);
  assert.match(plateRules, /object-fit:\s*cover/);
  assert.match(dioramaCss, /\.vezmir-cloister__fallback/);
  assert.match(dioramaCss, /\.vezmir-cloister__focus::before/);
  assert.match(dioramaCss, /\.vezmir-cloister__focus::after/);
  assert.doesNotMatch(`${plateRules}\n${focusRule}`, /opacity|filter|mix-blend-mode/i);
  assert.doesNotMatch(dioramaCss, /#[0-9a-f]{8}\b/i);
});
