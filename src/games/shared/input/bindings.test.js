import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GAME_ACTIONS } from "./actions.js";
import { getActionForKeyboardEvent } from "./bindings.js";

const controlsSource = readFileSync(new URL("./useGameControls.js", import.meta.url), "utf8");

test("maps shared movement and interaction keys", () => {
  assert.equal(getActionForKeyboardEvent({ code: "KeyW" }), GAME_ACTIONS.moveUp);
  assert.equal(getActionForKeyboardEvent({ code: "ArrowLeft" }), GAME_ACTIONS.moveLeft);
  assert.equal(getActionForKeyboardEvent({ code: "KeyE" }), GAME_ACTIONS.interact);
  assert.equal(getActionForKeyboardEvent({ code: "Enter" }), GAME_ACTIONS.confirm);
  assert.equal(getActionForKeyboardEvent({ code: "Space" }), GAME_ACTIONS.primary);
  assert.equal(getActionForKeyboardEvent({ code: "Escape" }), GAME_ACTIONS.cancel);
  assert.equal(getActionForKeyboardEvent({ code: "Digit1" }), GAME_ACTIONS.choiceOne);
  assert.equal(getActionForKeyboardEvent({ code: "Numpad2" }), GAME_ACTIONS.choiceTwo);
});

test("ignores modified shortcuts and editable fields", () => {
  assert.equal(getActionForKeyboardEvent({ code: "KeyW", metaKey: true }), null);
  assert.equal(getActionForKeyboardEvent({ code: "KeyW", target: { tagName: "INPUT" } }), null);
});

test("shared keyboard controls require activation within a game surface", () => {
  assert.match(controlsSource, /GAME_CONTROL_SURFACE_SELECTOR/);
  assert.match(controlsSource, /pointerdown/);
  assert.match(controlsSource, /focusin/);
  assert.match(controlsSource, /activeSurfaceRef\.current/);
  assert.match(controlsSource, /closest\?\.\(GAME_CONTROL_SURFACE_SELECTOR\)/);
  assert.match(controlsSource, /if \(event\.defaultPrevented\) return/);
  assert.match(controlsSource, /NATIVE_CONTROL_SELECTOR/);
  assert.match(controlsSource, /if \(!nativeControl && onKeyDown\?\.\(event\) === true\) return/);
});

test("shared keyboard controls preserve native button, link, and disclosure activation", () => {
  assert.match(controlsSource, /preserveNativeButtonActivation/);
  assert.match(controlsSource, /button, a\[href\], summary, input, textarea, select/);
  assert.match(controlsSource, /event\.code === "Enter"/);
  assert.match(controlsSource, /\["BUTTON", "SUMMARY"\]\.includes\(nativeActivationControl\.tagName\)/);
  assert.match(controlsSource, /if \(isNativeControlActivation\) return/);
});
