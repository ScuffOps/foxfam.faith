import { useEffect, useRef } from "react";
import { getActionForKeyboardEvent } from "./bindings.js";

const GAME_CONTROL_SURFACE_SELECTOR = ".game-shell, [data-game-controls]";

export function useGameControls({
  enabled = true,
  onAction,
  preserveNativeButtonActivation = false,
}) {
  const activeSurfaceRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof onAction !== "function") return undefined;

    const updateActiveSurface = (event) => {
      activeSurfaceRef.current = Boolean(event.target?.closest?.(GAME_CONTROL_SURFACE_SELECTOR));
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      const eventSurface = event.target?.closest?.(GAME_CONTROL_SURFACE_SELECTOR);
      if (!activeSurfaceRef.current && !eventSurface) return;
      if (eventSurface) activeSurfaceRef.current = true;
      const action = getActionForKeyboardEvent(event);
      if (!action) return;
      const isNativeButtonActivation = preserveNativeButtonActivation
        && event.target?.closest?.("button")
        && ["Enter", "Space"].includes(event.code);
      if (isNativeButtonActivation) return;
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
  }, [enabled, onAction, preserveNativeButtonActivation]);
}
