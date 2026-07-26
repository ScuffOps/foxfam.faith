import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const boardSource = readFileSync(fileURLToPath(new URL("./MatchMergeBoard.jsx", import.meta.url)), "utf8");
const hudSource = readFileSync(fileURLToPath(new URL("./MatchMergeHud.jsx", import.meta.url)), "utf8");
const artCss = readFileSync(fileURLToPath(new URL("./match-merge.css", import.meta.url)), "utf8");

test("each merge tier uses distinct authored offering art", () => {
  const offeringKeys = ["moon-spark", "candle-seal", "woven-cord", "sigil-flake", "relic-knot"];
  const componentNames = offeringKeys.map((key) => {
    const match = boardSource.match(new RegExp(`"${key}": ([A-Za-z]+)`));
    assert.ok(match, `${key} should have an explicit offering illustration`);
    return match[1];
  });

  assert.equal(new Set(componentNames).size, offeringKeys.length);
});

test("forge bench art avoids generated texture and effect treatments", () => {
  const combined = `${boardSource}\n${artCss}`;
  assert.doesNotMatch(combined, /(?:linear|radial)-gradient|<filter|feGaussianBlur|feDropShadow|backdrop-filter|mix-blend-mode|background-image/i);
});

test("offering art and board retain accessible labels", () => {
  assert.match(boardSource, /role="group"/);
  assert.match(boardSource, /aria-pressed=\{selected\}/);
  assert.match(boardSource, /role="img"/);
  assert.match(boardSource, /aria-label=\{label\}/);
  assert.match(artCss, /max-width: 390px/);
});

test("native tile activation is not duplicated by global game controls", () => {
  assert.match(boardSource, /event\.key !== "Enter" && event\.key !== " "/);
  assert.match(boardSource, /event\.preventDefault\(\)/);
  assert.match(boardSource, /event\.stopPropagation\(\)/);
  assert.match(boardSource, /if \(!isBusy\) onSelectCell\(index\)/);
});

test("board does not steal initial page focus", () => {
  assert.match(boardSource, /const didMountRef = useRef\(false\)/);
  assert.match(boardSource, /if \(!didMountRef\.current\)/);
  assert.match(boardSource, /didMountRef\.current = true/);
  assert.match(boardSource, /focus\(\{ preventScroll: true \}\)/);
});

test("busy and rewarded board modes lock unsafe controls", () => {
  assert.match(boardSource, /isBusy = false/);
  assert.match(boardSource, /allowPracticeTools = true/);
  assert.match(boardSource, /aria-busy=\{isBusy\}/);
  assert.match(boardSource, /disabled=\{isBusy\}/);
  assert.match(boardSource, /disabled=\{isBusy \|\| !canUndo\}/);
  assert.match(boardSource, /\{allowPracticeTools \? \(/);
  assert.match(boardSource, /draggable=\{!isBusy && Boolean\(tile\)\}/);
});

test("HUD separates local practice from authoritative rewarded claims", () => {
  assert.match(hudSource, /mode = "practice"/);
  assert.match(hudSource, /Practice progress is local and grants no portal rewards\./);
  assert.match(hudSource, /Sign in to earn/);
  assert.match(hudSource, /Claim rewards/);
  assert.match(hudSource, /Retrying\.\.\./);
  assert.doesNotMatch(hudSource, /Claim preview|Local preview ledger|Server validation remains reserved/);
});

test("HUD renders only authoritative receipt reward fields", () => {
  assert.match(hudSource, /rewardReceipt\.favor\?\.delta/);
  assert.match(hudSource, /rewardReceipt\.favor\?\.balance/);
  assert.match(hudSource, /rewardReceipt\?\.materials/);
  assert.match(hudSource, /rewardReceipt\?\.achievements/);
  assert.match(hudSource, /Priory receipt/);
  assert.match(hudSource, /Achievement unlocked/);
  assert.doesNotMatch(hudSource, /rewardIntent|rewardLog|favorPreview/);
});
