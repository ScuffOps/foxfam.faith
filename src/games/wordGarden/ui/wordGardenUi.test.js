import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cssSource = readFileSync(join(here, "word-garden.css"), "utf8");
const pageSource = readFileSync(join(here, "../../../pages/WordGarden.jsx"), "utf8");
const shellCssSource = readFileSync(join(here, "../../shared/ui/game-shell.css"), "utf8");
const flowerSource = readFileSync(join(here, "WordFlower.jsx"), "utf8");
const hudSource = readFileSync(join(here, "WordGardenHud.jsx"), "utf8");

test("the conservatory uses authored solid-fill art without texture effects", () => {
  assert.match(pageSource, /word-garden-art__glass/);
  assert.match(pageSource, /word-garden-art__planters/);
  assert.doesNotMatch(cssSource, /(?:linear|radial|conic)-gradient|filter\s*:|backdrop-filter|background-image/);
});

test("approved conservatory art stays decorative and preserves the playable fallback", () => {
  assert.match(pageSource, /getApprovedGameArtAsset\("word-garden\.conservatory"\)/);
  assert.match(pageSource, /className="word-garden-scene__illustration"/);
  assert.match(pageSource, /data-scene-layer="environment-fallback"/);
  assert.match(pageSource, /aria-hidden="true"/);
  assert.match(pageSource, /draggable="false"/);
  assert.match(cssSource, /\.word-garden-scene__illustration\s*\{[^}]*pointer-events:\s*none;/s);
});

test("the active word-building task leads the playfield", () => {
  assert.match(pageSource, /className="word-garden-scene__progress"/);
  assert.match(pageSource, /<WordFlower[\s\S]*?onPetal=\{addLetter\}[\s\S]*?onSubmit=\{submit\}/);
  assert.doesNotMatch(pageSource, /className="word-garden-scene__controls"/);
  assert.match(cssSource, /\.word-flower\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(16rem, 1fr\) auto auto;/s);
});

test("the flower exposes task rules and complete pointer and keyboard actions", () => {
  assert.match(flowerSource, /Build a word around/);
  assert.match(flowerSource, /4\+ letters/);
  assert.match(flowerSource, /Include heart letter/);
  assert.match(flowerSource, /aria-label=\{`Add \$\{letter\}`\}/);
  assert.match(flowerSource, /aria-label=\{`Add required center letter \$\{center\}`\}/);
  assert.match(flowerSource, /<kbd>Enter<\/kbd> bloom/);
  assert.match(flowerSource, /<kbd>Backspace<\/kbd> prune/);
  assert.match(flowerSource, /<kbd>Space<\/kbd> shuffle/);
  assert.match(pageSource, /event\.key === "Backspace"/);
  assert.match(pageSource, /\/\^\[a-zA-Z\]\$\/\.test\(event\.key\)/);
  assert.match(pageSource, /onKeyDown: handleLetterKey/);
  assert.match(pageSource, /className="word-garden-scene"[\s\S]*?tabIndex=\{0\}[\s\S]*?aria-label="Blooming Ink keyboard playfield"/);
  assert.match(cssSource, /\.word-garden-scene:focus-visible\s*\{/);
  assert.doesNotMatch(pageSource, /window\.addEventListener\("keydown", handleLetterKey\)/);
});

test("the authored flower and bloom family swap together while both fallbacks remain intact", () => {
  assert.match(pageSource, /resolveApprovedWordGardenArtFamily\(\)/);
  assert.match(pageSource, /<WordFlower[\s\S]*?artFamily=\{WORD_GARDEN_ART_FAMILY\}/);
  assert.match(pageSource, /<WordGardenHud[\s\S]*?artFamily=\{WORD_GARDEN_ART_FAMILY\}/);

  assert.match(flowerSource, /artFamily \? \([\s\S]*?src=\{artFamily\.flower\}[\s\S]*?: \([\s\S]*?className="word-flower__fallback-art"/);
  assert.match(flowerSource, /className="word-flower__soil"/);
  assert.match(flowerSource, /className="word-flower__stem"/);
  assert.match(flowerSource, /className="word-flower__leaves"/);

  assert.match(hudSource, /resolveWordGardenBloomStage\(state\)/);
  assert.match(hudSource, /artFamily \? <BloomFamilyArt src=\{artFamily\.bloomFamily\} stage=\{bloomStage\} \/> : <Sprout/);
  assert.match(hudSource, /artFamily \? <BloomFamilyArt src=\{artFamily\.bloomFamily\} stage=\{bloomStage\} \/> : <Flower2/);
  assert.match(cssSource, /\.word-garden-hud__bloom-art img\s*\{[^}]*width:\s*400%;/s);
  assert.match(cssSource, /data-bloom-stage="3"[^}]*translateX\(-75%\)/);
  assert.doesNotMatch(flowerSource, /["']\/assets\//);
  assert.doesNotMatch(hudSource, /["']\/assets\//);
});

test("secondary garden information is collapsed until requested", () => {
  assert.match(hudSource, /<details className="word-garden-hud__archive">/);
  assert.match(hudSource, /<details className="word-garden-hud__community">/);
  assert.doesNotMatch(hudSource, /<details[^>]*\sopen(?:=|\s|>)/);
  assert.match(hudSource, /Latest bloom/);
  assert.match(hudSource, /Rest the garden/);
});

test("the daily theme and featured bloom journal provide a visible difficulty ramp", () => {
  assert.match(flowerSource, /Today&apos;s theme/);
  assert.match(flowerSource, /themePrompt/);
  assert.match(hudSource, /Featured bloom journal/);
  assert.match(hudSource, /Other valid words still count as bonus blooms/);
  assert.match(hudSource, /Reveal a letter/);
  assert.match(hudSource, /aria-label="Featured words for today"/);
});

test("the mobile flower keeps the task and actions visible while hiding only key hints", () => {
  const mobileRules = cssSource.match(/@media \(max-width: 520px\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(mobileRules, /\.word-flower\s*\{[^}]*grid-template-rows:\s*auto auto 16rem auto auto;/s);
  assert.match(mobileRules, /\.word-flower__tools\s*\{[^}]*width:/s);
  assert.match(mobileRules, /\.word-flower__key-hint\s*\{\s*display:\s*none;/);
  assert.doesNotMatch(mobileRules, /\.word-flower__task\s*\{[^}]*display:\s*none;/s);
});

test("the shared mobile shell keeps the playfield before its sidebar", () => {
  assert.match(shellCssSource, /\.game-shell__playfield\s*\{\s*order:\s*1/);
  assert.match(shellCssSource, /\.game-shell__sidebar\s*\{\s*order:\s*2/);
});

test("short desktop viewports keep the flower tools above the fold", () => {
  assert.match(
    cssSource,
    /@media \(min-width: 761px\) and \(max-height: 800px\)[\s\S]*?\.word-garden-scene\s*\{[^}]*height:\s*calc\(100svh - 9rem\)[^}]*min-height:\s*0/s,
  );
  assert.match(
    cssSource,
    /@media \(min-width: 761px\) and \(max-height: 800px\)[\s\S]*?\.word-flower__bed\s*\{[^}]*transform:\s*scale\(0\.72\)[^}]*margin-bottom:\s*-5\.2rem/s,
  );
});
