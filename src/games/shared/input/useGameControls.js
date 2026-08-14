import { useEffect, useRef } from "react";
import { getActionForKeyboardEvent } from "./bindings.js";

const GAME_CONTROL_SURFACE_SELECTOR = ".game-shell, [data-game-controls]";
const NATIVE_CONTROL_SELECTOR = "button, a[href], summary, input, textarea, select, [contenteditable='true']";

export function useGameControls({
  enabled = true,
  onAction,
  onKeyDown,
  preserveNativeButtonActivation = true,
}) {
  const activeSurfaceRef = useRef(false);

  useEffect(() => {
    if (!enabled || (typeof onAction !== "function" && typeof onKeyDown !== "function")) return undefined;

    const updateActiveSurface = (event) => {
      activeSurfaceRef.current = Boolean(event.target?.closest?.(GAME_CONTROL_SURFACE_SELECTOR));
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      const eventSurface = event.target?.closest?.(GAME_CONTROL_SURFACE_SELECTOR);
      if (!activeSurfaceRef.current && !eventSurface) return;
      if (eventSurface) activeSurfaceRef.current = true;
      const nativeControl = event.target?.closest?.(NATIVE_CONTROL_SELECTOR);
      if (!nativeControl && onKeyDown?.(event) === true) return;
      const action = getActionForKeyboardEvent(event);
      if (!action) return;
      const nativeActivationControl = preserveNativeButtonActivation ? nativeControl : null;
      const isNativeControlActivation = nativeActivationControl
        && (event.code === "Enter"
          || (["BUTTON", "SUMMARY"].includes(nativeActivationControl.tagName) && event.code === "Space"));
      if (isNativeControlActivation) return;
      event.preventDefault();
      onAction(action, event);
    };

    document.addEventListener("pointerdown", updateActiveSurface);
    document.addEventListener("focusin", updateActiveSurface);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      activeSurfaceRef.current = false;
      document.removeEventListener("pointerdown", updateActiveSurface);
      document.removeEventListener("focusin", updateActiveSurface);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onAction, onKeyDown, preserveNativeButtonActivation]);
}
