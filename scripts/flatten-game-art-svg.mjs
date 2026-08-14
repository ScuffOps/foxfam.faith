import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const GRADIENT_BLOCK = /<(linearGradient|radialGradient)\b([^>]*)>([\s\S]*?)<\/\1>/gi;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readStopColor(body, id) {
  const stop = body.match(/<stop\b[^>]*>/i)?.[0];
  const color = stop?.match(/\bstop-color=["']([^"']+)["']/i)?.[1]
    || stop?.match(/\bstop-color\s*:\s*([^;"']+)/i)?.[1];
  if (!color?.trim()) throw new Error(`Gradient ${id} has no solid stop color`);
  return color.trim();
}

export function flattenSvgGradients(source) {
  const replacements = new Map();
  const withoutDefinitions = source.replace(GRADIENT_BLOCK, (_block, _kind, attributes, body) => {
    const id = attributes.match(/\bid=["']([^"']+)["']/i)?.[1];
    if (!id) throw new Error("Gradient definition is missing an id");
    replacements.set(id, readStopColor(body, id));
    return "";
  });

  let flattened = withoutDefinitions;
  for (const [id, color] of replacements) {
    flattened = flattened.replace(new RegExp(`url\\(#${escapeRegExp(id)}\\)`, "g"), color);
  }

  if (/<(?:linearGradient|radialGradient)\b|url\(#/i.test(flattened)) {
    throw new Error("SVG still contains unresolved gradients or paint servers");
  }
  if (/<(?:filter|pattern|image)\b|\b(?:filter|mix-blend-mode)\s*[:=]/i.test(flattened)) {
    throw new Error("SVG contains a forbidden filter, pattern, blend mode, or embedded image");
  }
  return flattened;
}

function parseArguments(argv) {
  const inputIndex = argv.indexOf("--input");
  const outputIndex = argv.indexOf("--output");
  const input = inputIndex >= 0 ? argv[inputIndex + 1] : null;
  const output = outputIndex >= 0 ? argv[outputIndex + 1] : null;
  if (!input || !output) throw new Error("Usage: --input <source.svg> --output <flat.svg>");
  return { input, output };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { input, output } = parseArguments(process.argv.slice(2));
  writeFileSync(output, flattenSvgGradients(readFileSync(input, "utf8")));
  console.log(`Flattened Foxfam SVG written to ${output}`);
}
