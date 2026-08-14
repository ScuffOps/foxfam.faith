import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const boardSource = readFileSync(fileURLToPath(new URL("./MatchMergeBoard.jsx", import.meta.url)), "utf8");
const hudSource = readFileSync(fileURLToPath(new URL("./MatchMergeHud.jsx", import.meta.url)), "utf8");
const artCss = readFileSync(fileURLToPath(new URL("./match-merge.css", import.meta.url)), "utf8");
const productionArtSource = readFileSync(fileURLToPath(new URL("../art/matchMergeProductionArt.js", import.meta.url)), "utf8");
const pageSource = readFileSync(fileURLToPath(new URL("../../../pages/MatchMerge.jsx", import.meta.url)), "utf8");

test("each merge tier uses distinct authored offering art", () => {
  const offeringKeys = ["moon-spark", "candle-seal", "woven-cord", "sigil-flake", "relic-knot"];
  const componentNames = offeringKeys.map((key) => {
    const match = boardSource.match(new RegExp(`"${key}": ([A-Za-z]+)`));
    assert.ok(match, `${key} should have an explicit offering illustration`);
    return match[1];
  });

  assert.equal(new Set(componentNames).size, offeringKeys.length);
});

test("approved offering and merge art are consumed only through one fail-closed family", () => {
  assert.match(productionArtSource, /import \{ getApprovedGameArtFamily \}/);
  assert.match(productionArtSource, /resolveFamily = getApprovedGameArtFamily/);
  assert.match(productionArtSource, /resolveFamily\(MATCH_MERGE_PRODUCTION_ART_SLOT_IDS\)/);
  assert.match(productionArtSource, /match-merge\.offerings/);
  assert.match(productionArtSource, /match-merge\.merge-fx/);
  assert.match(productionArtSource, /if \(!isResolvedAsset\(offerings\) \|\| !isResolvedAsset\(mergeFx\)\) return null/);
  assert.match(boardSource, /const MATCH_MERGE_PRODUCTION_ART = getApprovedMatchMergeProductionArt\(\)/);
  assert.match(boardSource, /data-active-art-family=\{MATCH_MERGE_PRODUCTION_ART \? "approved" : "fallback"\}/);
  assert.match(boardSource, /MATCH_MERGE_PRODUCTION_ART\.offerings/);
  assert.match(boardSource, /MATCH_MERGE_PRODUCTION_ART\.mergeFx/);
  assert.match(boardSource, /getMatchMergeOfferingAtlasTransform\(tile\.key\)/);
  assert.match(artCss, /reliquary-tile__icon\[data-approved-atlas="true"\]/);
  assert.doesNotMatch(`${productionArtSource}\n${boardSource}`, /\/assets\//);
});

test("both functional art fallbacks remain behind the atomic family branch", () => {
  assert.match(boardSource, /MATCH_MERGE_PRODUCTION_ART \? \([\s\S]*MATCH_MERGE_PRODUCTION_ART\.offerings[\s\S]*\) : \([\s\S]*<OfferingArt \/>/);
  assert.match(boardSource, /MATCH_MERGE_PRODUCTION_ART \? \([\s\S]*MATCH_MERGE_PRODUCTION_ART\.mergeFx[\s\S]*\) : \([\s\S]*<Sparkles \/>/);
});

test("forge bench art avoids generated texture and effect treatments", () => {
  const combined = `${boardSource}\n${artCss}`;
  assert.doesNotMatch(combined, /(?:linear|radial)-gradient|<filter|feGaussianBlur|feDropShadow|backdrop-filter|mix-blend-mode|background-image/i);
});

test("approved reliquary art is decorative and preserves the playable fallback", () => {
  assert.match(boardSource, /getApprovedGameArtAsset\("match-merge\.reliquary"\)/);
  assert.match(boardSource, /data-has-approved-environment=\{RELIQUARY_ENVIRONMENT_ASSET \? "true" : undefined\}/);
  assert.match(boardSource, /className="reliquary-scene__illustration"/);
  assert.match(boardSource, /aria-hidden="true"/);
  assert.match(boardSource, /draggable="false"/);
  assert.match(boardSource, /data-scene-layer="environment-fallback"/);
  assert.match(artCss, /reliquary-scene\[data-has-approved-environment="true"\]::before \{ display: none; \}/);
});

test("offering art and board retain accessible labels", () => {
  assert.match(boardSource, /role="group"/);
  assert.match(boardSource, /aria-pressed=\{selected\}/);
  assert.match(boardSource, /role="img"/);
  assert.match(boardSource, /aria-label=\{label\}/);
  assert.match(artCss, /max-width: 390px/);
});

test("every offering reserves a separate caption band and non-overlapping tier chip", () => {
  assert.match(boardSource, /className="reliquary-tile__label"/);
  assert.match(boardSource, /className="reliquary-tile__tier" aria-hidden="true">T\{tile\.tier\}/);
  assert.match(artCss, /\.reliquary-tile__offering \{[\s\S]*grid-template-rows: minmax\(0, 1fr\) minmax\(1\.45rem, auto\)/);
  assert.match(artCss, /\.reliquary-tile__label \{[\s\S]*border-top:[\s\S]*background: #f6f0df/);
  assert.match(artCss, /\.reliquary-tile__tier \{[\s\S]*position: absolute;[\s\S]*top: 0\.14rem;[\s\S]*left: 0\.14rem/);
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

test("board guidance covers drag and selection input", () => {
  assert.match(boardSource, /Drag or select matching neighbors/);
  assert.match(boardSource, /getMatchMergeGuidance\(state\.grid, state\.selectedIndex\)/);
  assert.match(boardSource, /id="match-merge-next-move"/);
  assert.match(boardSource, /aria-describedby="match-merge-next-move"/);
  assert.match(boardSource, /data-action-source=\{suggestedSource \|\| undefined\}/);
  assert.match(boardSource, /data-action-target=\{suggestedTarget \|\| undefined\}/);
});

test("mobile keeps the current reward action beside the protected board", () => {
  assert.match(boardSource, /className="reliquary-compact-action"/);
  assert.match(pageSource, /const compactAction = getCompactAction/);
  assert.match(pageSource, /Sign in to earn/);
  assert.match(pageSource, /Claim rewards/);
  assert.match(pageSource, /New rewarded run/);
  assert.match(artCss, /@media \(max-width: 760px\)[\s\S]*\.reliquary-compact-action \{/);
  assert.match(artCss, /min-height: 44px/);
});

test("short desktop viewports keep the complete four by four bench visible", () => {
  assert.match(artCss, /@media \(min-width: 761px\) and \(max-height: 800px\)/);
  assert.match(artCss, /@media \(min-width: 761px\) and \(max-height: 800px\)[\s\S]*\.reliquary-scene \{[\s\S]*min-height: 0/);
  assert.match(artCss, /@media \(min-width: 761px\) and \(max-height: 800px\)[\s\S]*\.reliquary-table \{[\s\S]*width: min\(100%, 20rem\)/);
  assert.match(artCss, /@media \(min-width: 761px\) and \(max-height: 800px\)[\s\S]*\.reliquary-table__back \{ display: none; \}/);
  assert.match(artCss, /@media \(min-width: 761px\) and \(max-height: 800px\)[\s\S]*\.reliquary-scene__footer \.game-interaction-prompt \{ display: none; \}/);
});

test("HUD separates local practice from authoritative rewarded claims", () => {
  assert.match(hudSource, /mode = "practice"/);
  assert.match(hudSource, /Practice progress is local and grants no portal rewards\./);
  assert.match(hudSource, /Sign in to earn/);
  assert.match(hudSource, /Claim rewards/);
  assert.match(hudSource, /Retrying\.\.\./);
  assert.doesNotMatch(hudSource, /Claim preview|Local preview ledger|Server validation remains reserved/);
});

test("secondary bench goals are collapsed behind native disclosure", () => {
  assert.match(hudSource, /<details className="reliquary-request__goals">/);
  assert.match(hudSource, /<summary><Trophy aria-hidden="true" \/> Bench notes<\/summary>/);
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
