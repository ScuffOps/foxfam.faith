import assert from "node:assert/strict";
import test from "node:test";
import { GAME_ACTIONS } from "./actions.js";
import { getActionForKeyboardEvent } from "./bindings.js";

test("maps shared movement and interaction keys", () => {
  assert.equal(getActionForKeyboardEvent({ code: "KeyW" }), GAME_ACTIONS.moveUp);
  assert.equal(getActionForKeyboardEvent({ code: "ArrowLeft" }), GAME_ACTIONS.moveLeft);
  assert.equal(getActionForKeyboardEvent({ code: "KeyE" }), GAME_ACTIONS.interact);
  assert.equal(getActionForKeyboardEvent({ code: "Enter" }), GAME_ACTIONS.confirm);
  assert.equal(getActionForKeyboardEvent({ code: "Space" }), GAME_ACTIONS.primary);
  assert.equal(getActionForKeyboardEvent({ code: "Escape" }), GAME_ACTIONS.cancel);
});

test("ignores modified shortcuts and editable fields", () => {
  assert.equal(getActionForKeyboardEvent({ code: "KeyW", metaKey: true }), null);
  assert.equal(getActionForKeyboardEvent({ code: "KeyW", target: { tagName: "INPUT" } }), null);
});
