import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const railSource = readFileSync(new URL("./SanctuaryRail.jsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("./Layout.jsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../index.css", import.meta.url), "utf8");

function cssRule(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cssSource.match(new RegExp(`${escapedSelector}\\s*\\{[^}]+\\}`, "m"))?.[0] || "";
}

test("Sanctuary Mode protects desktop play space with an always-compact icon rail", () => {
  assert.match(cssRule(".sanctuary-rail-slot"), /width:\s*4\.5rem/);
  assert.match(cssRule(".sanctuary-rail"), /position:\s*absolute/);
  assert.match(cssRule(".sanctuary-rail"), /width:\s*4\.5rem/);
  assert.doesNotMatch(cssSource, /\.sanctuary-rail:hover,\s*\.sanctuary-rail:focus-within/);
  assert.match(cssRule(".sanctuary-rail__label"), /clip-path:\s*inset\(50%\)/);
  assert.match(layoutSource, /usesSanctuaryNavigation \?/);
  assert.match(layoutSource, /onOpenPortalNav=\{\(\) => setSidebarOpen\(true\)\}/);
  assert.doesNotMatch(layoutSource, /sanctuaryNavPinned|readSanctuaryNavPinned/);
});

test("the icon rail remains named, keyboard-readable, and motion-safe", () => {
  assert.match(railSource, /aria-label="Sanctuary navigation"/);
  assert.match(railSource, /aria-label="Game hub destinations"/);
  assert.match(railSource, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(railSource, /aria-label=\{item\.label\}/);
  assert.match(railSource, /aria-label="Open full portal navigation"/);
  assert.match(cssSource, /\.sanctuary-rail__link:focus-visible/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
});

test("the full portal menu is a dismissible overlay while the rail stays desktop-only", () => {
  assert.match(layoutSource, /className="relative z-10 hidden shrink-0 md:block"/);
  assert.match(layoutSource, /<MobileNav onMenuClick=\{\(\) => setSidebarOpen\(true\)\} \/>/);
  assert.match(layoutSource, /<Sidebar onClose=\{\(\) => setSidebarOpen\(false\)\} \/>/);
  assert.match(layoutSource, /role="dialog" aria-modal="true" aria-label="Portal navigation"/);
  assert.match(layoutSource, /aria-label="Dismiss portal navigation overlay"/);
  assert.match(layoutSource, /event\.key === "Escape"/);
});
