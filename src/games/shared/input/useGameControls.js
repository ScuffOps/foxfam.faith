import { useEffect } from "react";
import { getActionForKeyboardEvent } from "./bindings.js";

export function useGameControls({ enabled = true, onAction }) {
  useEffect(() => {
    if (!enabled || typeof onAction !== "function") return undefined;

    const handleKeyDown = (event) => {
      const action = getActionForKeyboardEvent(event);
      if (!action) return;
      event.preventDefault();
      onAction(action, event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onAction]);
}
