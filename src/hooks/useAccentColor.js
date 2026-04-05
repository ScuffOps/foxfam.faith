import { useState, useEffect } from "react";

const KEY = "commhub_accent_color";

export const ACCENT_COLORS = [
  { label: "Sky",      value: "200 85% 55%" },
  { label: "Purple",   value: "258 75% 60%" },
  { label: "Pink",     value: "330 70% 60%" },
  { label: "Emerald",  value: "160 65% 50%" },
  { label: "Amber",    value: "40 85% 60%"  },
  { label: "Rose",     value: "0 72% 60%"   },
  { label: "Indigo",   value: "230 85% 65%" },
  { label: "Teal",     value: "180 70% 50%" },
];

function applyAccent(hsl) {
  document.documentElement.style.setProperty("--accent", hsl);
  document.documentElement.style.setProperty("--ring", hsl);
  document.documentElement.style.setProperty("--primary", hsl);
}

export function useAccentColor() {
  const [accent, setAccentState] = useState(() => {
    return localStorage.getItem(KEY) || "200 85% 55%";
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