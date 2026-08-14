import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const page = readFileSync(new URL("../../../pages/TimeRunner.jsx", import.meta.url), "utf8");
const hud = readFileSync(new URL("./TimeRunnerHud.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./time-runner.css", import.meta.url), "utf8");

describe("Time Runner task-first UI", () => {
  it("keeps live state, canvas, and direct controls together in that order", () => {
    const stageStart = page.indexOf('<div className="time-runner-stage">');
    const liveStatus = page.indexOf("runStatus", stageStart);
    const canvas = page.indexOf("<GameCanvasHost", stageStart);
    const controls = page.indexOf('<div className="time-runner-stage__controls">', stageStart);

    assert.ok(stageStart >= 0);
    assert.ok(liveStatus > stageStart);
    assert.ok(canvas > liveStatus);
    assert.ok(controls > canvas);
    assert.match(css, /\.time-runner-stage__controls\s*\{[^}]*display:\s*block/s);
  });

  it("places secondary mode, companion, reward, and field notes after the playfield", () => {
    assert.match(page, /sidebar=\{secondaryPanel\}/);
    assert.match(page, /<RouteGuide\s*\/>/);
    assert.match(css, /\.game-shell\[data-world="time-runner"\] \.game-shell__layout\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
    assert.match(css, /\.game-shell\[data-world="time-runner"\] \.game-shell__sidebar\s*\{[^}]*order:\s*2/s);
  });

  it("exposes equivalent keyboard and pointer-sized action buttons", () => {
    assert.match(hud, /label="Leap" keys="W \/ Up"/);
    assert.match(hud, /label="Duck" keys="S \/ Down"/);
    assert.match(hud, /label="Tempo skip" keys=\{`D \/ Right/);
    assert.match(css, /\.time-runner-mobile-dock button\s*\{[\s\S]*min-height:\s*48px/);
    assert.match(hud, /Resume traverse/);
  });

  it("keeps both numbered landing choices in the direct control dock only", () => {
    const compactControls = hud.slice(
      hud.indexOf("if (compactControls)"),
      hud.indexOf("if (runStatus)"),
    );
    const secondaryHud = hud.slice(hud.indexOf("if (runStatus)"));

    assert.match(compactControls, /<LandingChoices disabled=\{isBusy\} landings=\{state\.availableLandings\}/);
    assert.doesNotMatch(secondaryHud, /<LandingChoices disabled=\{isBusy\} landings=\{state\.availableLandings\}/);
    assert.match(hud, /index === 0 \? "choice-one" : "choice-two"/);
    assert.match(css, /\.time-runner-landing-choices\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  });

  it("disables compact controls while a rewarded action is pending", () => {
    assert.match(hud, /disabled=\{isBusy\} onClick=\{onStart\}/);
    assert.match(hud, /function LandingChoices\(\{ disabled = false/);
    assert.match(hud, /disabled=\{disabled\} onClick=\{\(\) => onAction/);
    assert.match(hud, /disabled=\{isBusy \|\| state\.focus < 30\}/);
  });

  it("uses a stable widescreen canvas without forcing secondary scrolling first", () => {
    assert.match(page, /width=\{960\}[\s\S]*height=\{540\}[\s\S]*scaleMode="fit"/);
    assert.match(css, /\.time-runner-canvas\s*\{[^}]*aspect-ratio:\s*16 \/ 9/s);
    assert.match(css, /\.time-runner-canvas\s*\{[^}]*max-height:\s*calc\(100dvh - 23rem\)/s);
  });
});
