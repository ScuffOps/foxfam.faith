export const USER_COLOR_SWATCHES = [
  { label: "Cobalt", hex: "#1f42ad" },
  { label: "Clam Shell", hex: "#c7a89c" },
  { label: "Solid Pink", hex: "#753243" },
  { label: "Buccaneer", hex: "#612529" },
  { label: "Chambray", hex: "#3c5693" },
  { label: "Kashmir Blue", hex: "#4c6f91" },
  { label: "Voodoo", hex: "#553052" },
  { label: "Oxford Blue", hex: "#3a4b5b" },
  { label: "Falcon", hex: "#755665" },
  { label: "Black Rose", hex: "#6b2035" },
  { label: "Pink Swan", hex: "#c0abb2" },
  { label: "Castro", hex: "#500323" },
  { label: "Wine Berry", hex: "#65273d" },
  { label: "Comet", hex: "#5c5f82" },
  { label: "Charlotte", hex: "#bdebf1" },
  { label: "Strikemaster", hex: "#9b6080" },
];

export function hexToHslString(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    if (max === g) hue = (b - r) / delta + 2;
    if (max === b) hue = (r - g) / delta + 4;
    hue *= 60;
  }

  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}
