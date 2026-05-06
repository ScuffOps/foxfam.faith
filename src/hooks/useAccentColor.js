import { useState, useEffect } from "react";
import { USER_COLOR_SWATCHES, hexToHslString } from "@/lib/userColorSwatches";

const KEY = "commhub_accent_color";

export const ACCENT_COLORS = USER_COLOR_SWATCHES.map((swatch) => ({
  ...swatch,
  value: hexToHslString(swatch.hex),
}));

function applyAccent(hsl) {
  document.documentElement.style.setProperty("--accent", hsl);
  document.documentElement.style.setProperty("--ring", hsl);
  document.documentElement.style.setProperty("--primary", hsl);
}

export function useAccentColor() {
  const [accent, setAccentState] = useState(() => {
    return localStorage.getItem(KEY) || ACCENT_COLORS[0].value;
  });

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  const setAccent = (hsl) => {
    setAccentState(hsl);
    localStorage.setItem(KEY, hsl);
    applyAccent(hsl);
  };

  return { accent, setAccent };
}
