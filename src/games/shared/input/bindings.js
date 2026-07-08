import { GAME_ACTIONS } from "./actions";

export const DEFAULT_KEYBOARD_BINDINGS = {
  Space: GAME_ACTIONS.cast,
  Enter: GAME_ACTIONS.confirm,
  Escape: GAME_ACTIONS.cancel,
  KeyA: GAME_ACTIONS.qteLeft,
  ArrowLeft: GAME_ACTIONS.qteLeft,
  KeyW: GAME_ACTIONS.qteUp,
  ArrowUp: GAME_ACTIONS.qteUp,
  KeyD: GAME_ACTIONS.qteRight,
  ArrowRight: GAME_ACTIONS.qteRight,
  KeyS: GAME_ACTIONS.qteDown,
  ArrowDown: GAME_ACTIONS.qteDown,
};

export function getActionForKeyboardEvent(event) {
  return DEFAULT_KEYBOARD_BINDINGS[event?.code] || null;
}
