import { GAME_ACTIONS } from "./actions.js";

export const DEFAULT_KEYBOARD_BINDINGS = {
  Space: GAME_ACTIONS.primary,
  Enter: GAME_ACTIONS.confirm,
  Escape: GAME_ACTIONS.cancel,
  KeyE: GAME_ACTIONS.interact,
  KeyA: GAME_ACTIONS.moveLeft,
  ArrowLeft: GAME_ACTIONS.moveLeft,
  KeyW: GAME_ACTIONS.moveUp,
  ArrowUp: GAME_ACTIONS.moveUp,
  KeyD: GAME_ACTIONS.moveRight,
  ArrowRight: GAME_ACTIONS.moveRight,
  KeyS: GAME_ACTIONS.moveDown,
  ArrowDown: GAME_ACTIONS.moveDown,
};

export function getActionForKeyboardEvent(event) {
  if (event?.metaKey || event?.ctrlKey || event?.altKey) return null;

  const target = event?.target;
  const tagName = target?.tagName?.toUpperCase();
  if (target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return null;

  return DEFAULT_KEYBOARD_BINDINGS[event?.code] || null;
}
