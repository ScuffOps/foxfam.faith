import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const FOXFAM_GAME_ART_PALETTE = Object.freeze([
  "#263b5a", // dark navy lineart
  "#53606d", // charcoal cel shadow
  "#707989", // cool stone
  "#fff6e8", // warm cream
  "#f8ecd9", // parchment
  "#d6c7b5", // warm stone shadow
  "#eedde0", // pale blush
  "#d9a3aa", // dusty rose
  "#a4c8d5", // sky blue
  "#80adbc", // celestial teal
  "#6f9eac", // teal shadow
  "#afc6a4", // sage
  "#789a76", // leaf shadow
  "#b78667", // warm wood
  "#8f6455", // wood shadow
  "#dfc982", // muted gold
  "#b4b3cc", // lilac
  "#e8a15f", // forge flame
]);

const FORBIDDEN_SVG = /<(?:linearGradient|radialGradient|filter|pattern|image)\b|\b(?:filter|mix-blend-mode)\s*[:=]/i;
const COLOR_ATTRIBUTE = /\b(fill|stroke)=(['"])(#[0-9a-f]{3,6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))\2/gi;

function parseHex(value) {
  const digits = value.slice(1);
  const expanded = digits.length === 3
    ? digits.split("").map((digit) => `${digit}${digit}`).join("")
    : digits;
  if (expanded.length !== 6) throw new Error(`Unsupported SVG color: ${value}`);
  return [0, 2, 4].map((index) => Number.parseInt(expanded.slice(index, index + 2), 16));
}

function parseColor(value) {
  if (value.startsWith("#")) return parseHex(value);
  const channels = value.match(/\d+/g)?.map(Number);
  if (!channels || channels.length !== 3 || channels.some((channel) => channel > 255)) {
    throw new Error(`Unsupported SVG color: ${value}`);
  }
  return channels;
}

function colorDistance(left, right) {
  const [lr, lg, lb] = left;
  const [rr, rg, rb] = right;
  return ((lr - rr) ** 2 * 0.3) + ((lg - rg) ** 2 * 0.59) + ((lb - rb) ** 2 * 0.11);
}

export function nearestPaletteColor(value, palette = FOXFAM_GAME_ART_PALETTE) {
  const source = parseColor(value.toLowerCase());
  return palette.reduce((nearest, candidate) => (
    colorDistance(source, parseColor(candidate)) < colorDistance(source, parseColor(nearest))
      ? candidate
      : nearest
  ), palette[0]);
}

export function quantizeSvgPalette(source, palette = FOXFAM_GAME_ART_PALETTE) {
  if (FORBIDDEN_SVG.test(source)) {
    throw new Error("Flatten gradients, filters, patterns, and embedded images before palette quantization");
  }
  if (!Array.isArray(palette) || palette.length < 2 || palette.some((color) => !/^#[0-9a-f]{6}$/i.test(color))) {
    throw new Error("Palette must contain at least two six-digit hex colors");
  }

  return source.replace(COLOR_ATTRIBUTE, (_match, attribute, quote, value) => (
    `${attribute}=${quote}${nearestPaletteColor(value, palette)}${quote}`
  ));
}

function parseArguments(argv) {
  const inputIndex = argv.indexOf("--input");
  const outputIndex = argv.indexOf("--output");
  const input = inputIndex >= 0 ? argv[inputIndex + 1] : null;
  const output = outputIndex >= 0 ? argv[outputIndex + 1] : null;
  if (!input || !output) throw new Error("Usage: --input <flat.svg> --output <quantized.svg>");
  return { input, output };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { input, output } = parseArguments(process.argv.slice(2));
  writeFileSync(output, quantizeSvgPalette(readFileSync(input, "utf8")));
  console.log(`Quantized Foxfam SVG written to ${output}`);
}
