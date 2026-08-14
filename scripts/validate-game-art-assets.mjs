import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import {
  GAME_ART_APPROVAL,
  GAME_ART_SLOTS,
} from "../src/games/shared/art/gameArtManifest.js";
import {
  COLLECTIBLE_ART_SLOTS,
  isCanonicalCollectibleAssetPath,
  isApprovedCollectibleArtSlot,
} from "../src/components/relics/collectibleArtManifest.js";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_PUBLIC_DIR = resolve(SCRIPT_DIR, "../public");
const ALLOWED_EXTENSIONS = new Set([".png", ".svg"]);
const FORBIDDEN_SVG_FEATURES = [
  [/<(?:linearGradient|radialGradient|filter|pattern|image)\b/i, "gradients, filters, patterns, and embedded raster images are forbidden"],
  [/<(?:mask|style)\b/i, "masks and embedded style blocks are forbidden; use explicit flat fills"],
  [/\b(?:filter|backdrop-filter|mix-blend-mode)\s*[:=]/i, "CSS filters and blend modes are forbidden"],
  [/\b(?:opacity|fill-opacity|stroke-opacity)\s*[:=]/i, "opacity layers are forbidden; use solid cel-shaded shapes"],
  [/<(?:feGaussianBlur|feTurbulence|feDisplacementMap|feBlend)\b/i, "SVG effect primitives are forbidden"],
];
const MAX_FLAT_FILL_COLORS_BY_CLASS = Object.freeze({
  environment: 18,
  collectible: 12,
  prop: 24,
  sprite: 18,
  interaction: 12,
  ui: 12,
});
const DEFAULT_MAX_FLAT_FILL_COLORS = 18;

function parseAspect(aspect) {
  const [width, height] = aspect.split(":").map(Number);
  if (!width || !height) throw new Error(`Invalid manifest aspect: ${aspect}`);
  return width / height;
}

function readPngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("PNG does not contain a valid IHDR header");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function paethPredictor(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function unfilterPngScanlines(raw, width, height, channels) {
  const stride = width * channels;
  if (raw.length !== height * (stride + 1)) {
    throw new Error("PNG decompressed pixel data has an unexpected size");
  }

  const rows = [];
  let previous = Buffer.alloc(stride);
  let cursor = 0;
  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filterType = raw[cursor];
    cursor += 1;
    const decoded = Buffer.alloc(stride);
    for (let index = 0; index < stride; index += 1) {
      const value = raw[cursor + index];
      const left = index >= channels ? decoded[index - channels] : 0;
      const up = previous[index];
      const upperLeft = index >= channels ? previous[index - channels] : 0;
      let predictor;
      if (filterType === 0) predictor = 0;
      else if (filterType === 1) predictor = left;
      else if (filterType === 2) predictor = up;
      else if (filterType === 3) predictor = Math.floor((left + up) / 2);
      else if (filterType === 4) predictor = paethPredictor(left, up, upperLeft);
      else throw new Error(`PNG uses unsupported scanline filter ${filterType}`);
      decoded[index] = (value + predictor) & 0xff;
    }
    cursor += stride;
    rows.push(decoded);
    previous = decoded;
  }
  return rows;
}

function decodePngPixels(slot, buffer) {
  const { width, height } = readPngDimensions(buffer);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  const interlace = buffer[28];
  if (bitDepth !== 8 || ![4, 6].includes(colorType) || interlace !== 0) {
    throw new Error(`${slot.id} must be a non-interlaced 8-bit grayscale-alpha or RGBA PNG`);
  }

  const compressedChunks = [];
  let cursor = 8;
  while (cursor + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(cursor);
    const chunkType = buffer.subarray(cursor + 4, cursor + 8).toString("ascii");
    const dataStart = cursor + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error(`${slot.id} contains a truncated PNG chunk`);
    if (chunkType === "IDAT") compressedChunks.push(buffer.subarray(dataStart, dataEnd));
    cursor = dataEnd + 4;
    if (chunkType === "IEND") break;
  }
  if (!compressedChunks.length) throw new Error(`${slot.id} PNG is missing pixel data`);

  const channels = colorType === 4 ? 2 : 4;
  const rows = unfilterPngScanlines(
    inflateSync(Buffer.concat(compressedChunks)),
    width,
    height,
    channels,
  );
  return { width, height, colorType, channels, rows };
}

export function assertCollectiblePngTransparency(slot, buffer) {
  const { width, height, channels, rows } = decodePngPixels(slot, buffer);
  const alphaOffset = channels - 1;
  let transparentPixels = 0;
  let visiblePixels = 0;
  let visibleBorderPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = rows[y][x * channels + alphaOffset];
      if (alpha === 0) transparentPixels += 1;
      else visiblePixels += 1;
      if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && alpha > 0) {
        visibleBorderPixels += 1;
      }
    }
  }
  if (!transparentPixels) throw new Error(`${slot.id} alpha channel contains no transparent pixels`);
  if (!visiblePixels) throw new Error(`${slot.id} is fully transparent`);
  if (visibleBorderPixels) {
    throw new Error(`${slot.id} outer border contains ${visibleBorderPixels} non-transparent pixels`);
  }
}

export function assertCollectiblePngFlatPalette(slot, buffer) {
  const { width, height, colorType, channels, rows } = decodePngPixels(slot, buffer);
  const alphaOffset = channels - 1;
  const colorBins = new Map();
  let opaquePixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = x * channels;
      if (rows[y][offset + alphaOffset] !== 255) continue;
      const red = rows[y][offset];
      const green = colorType === 4 ? red : rows[y][offset + 1];
      const blue = colorType === 4 ? red : rows[y][offset + 2];
      const key = `${red >> 3}:${green >> 3}:${blue >> 3}`;
      colorBins.set(key, (colorBins.get(key) || 0) + 1);
      opaquePixels += 1;
    }
  }

  if (!opaquePixels) return;
  const minimumSignificantPixels = Math.max(2, Math.ceil(opaquePixels * 0.005));
  const significantColorBands = [...colorBins.values()]
    .filter((count) => count >= minimumSignificantPixels)
    .length;
  if (significantColorBands > 18) {
    throw new Error(
      `${slot.id} contains ${significantColorBands} significant opaque color bands; soft or gradient rendering is forbidden`,
    );
  }
}

function readSvgDimensions(source) {
  const svgTag = source.match(/<svg\b[^>]*>/i)?.[0];
  if (!svgTag) throw new Error("SVG root element is missing");
  const viewBox = svgTag.match(/\bviewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  const width = Number(svgTag.match(/\bwidth=["']([\d.]+)/i)?.[1]);
  const height = Number(svgTag.match(/\bheight=["']([\d.]+)/i)?.[1]);
  if (!width || !height) throw new Error("SVG requires a numeric viewBox or width and height");
  return { width, height };
}

function assertAspect(slot, dimensions) {
  const expected = parseAspect(slot.aspect);
  const actual = dimensions.width / dimensions.height;
  const drift = Math.abs(actual - expected) / expected;
  if (drift > 0.025) {
    throw new Error(`${slot.id} has ${dimensions.width}:${dimensions.height}, expected ${slot.aspect}`);
  }
}

function assertFlatFillPalette(slot, source) {
  const fills = [...source.matchAll(/\bfill=["']([^"']+)["']/gi)]
    .map((match) => match[1].trim().toLowerCase())
    .filter((fill) => fill !== "none" && fill !== "currentcolor" && fill !== "transparent");
  const uniqueFills = new Set(fills);
  const maxColors = MAX_FLAT_FILL_COLORS_BY_CLASS[slot.assetClass]
    || DEFAULT_MAX_FLAT_FILL_COLORS;
  if (uniqueFills.size > maxColors) {
    throw new Error(`${slot.id} uses ${uniqueFills.size} fill colors; Foxfam ${slot.assetClass || "asset"} art allows at most ${maxColors}`);
  }
}

function assertRenderableSvgMarkup(slot, source) {
  if (/<[^>]*\/\s+[a-z][\w:-]*\s*=/i.test(source)) {
    throw new Error(`${slot.id}: SVG attributes cannot appear after a self-closing slash`);
  }
  if (!/(?:<svg\b[^>]*>[\s\S]*<\/svg>|<svg\b[^>]*\/>)\s*$/i.test(source)) {
    throw new Error(`${slot.id}: SVG requires a complete root element`);
  }
}

export function validateApprovedArtSlot(slot, publicDir = DEFAULT_PUBLIC_DIR) {
  const isWorldApproval = slot.approval === GAME_ART_APPROVAL.approved;
  const isCollectibleApproval = isApprovedCollectibleArtSlot(slot);
  if (!isWorldApproval && !isCollectibleApproval) return { skipped: true };
  if (isCollectibleApproval && !isCanonicalCollectibleAssetPath(slot.assetPath, slot.kind, slot.key)) {
    throw new Error(`${slot.id} must use its canonical key-specific collectible path`);
  }
  if (!slot.assetPath?.startsWith("/assets/game-hub/")) {
    throw new Error(`${slot.id} must use an asset under /assets/game-hub/`);
  }
  if (/[\\?#]/.test(slot.assetPath)
    || /%(?:2e|2f|5c)/i.test(slot.assetPath)
    || slot.assetPath.split("/").includes("..")) {
    throw new Error(`${slot.id} contains an unsafe asset path`);
  }

  const filePath = resolve(publicDir, slot.assetPath.slice(1));
  const gameHubRoot = resolve(publicDir, "assets/game-hub");
  const gameHubPrefix = `${gameHubRoot}${sep}`;
  if (!filePath.startsWith(gameHubPrefix) || !existsSync(filePath)) {
    throw new Error(`${slot.id} asset does not exist: ${slot.assetPath}`);
  }
  const realGameHubRoot = realpathSync(gameHubRoot);
  const realGameHubPrefix = `${realGameHubRoot}${sep}`;
  if (!realpathSync(filePath).startsWith(realGameHubPrefix)) {
    throw new Error(`${slot.id} contains an unsafe asset path`);
  }

  const extension = extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`${slot.id} must be a crisp PNG or authored SVG`);
  }

  if (extension === ".png") {
    const buffer = readFileSync(filePath);
    assertAspect(slot, readPngDimensions(buffer));
    if (isCollectibleApproval) {
      assertCollectiblePngTransparency(slot, buffer);
      assertCollectiblePngFlatPalette(slot, buffer);
    }
  } else {
    const source = readFileSync(filePath, "utf8");
    assertRenderableSvgMarkup(slot, source);
    for (const [pattern, message] of FORBIDDEN_SVG_FEATURES) {
      if (pattern.test(source)) throw new Error(`${slot.id}: ${message}`);
    }
    assertFlatFillPalette(slot, source);
    assertAspect(slot, readSvgDimensions(source));
  }

  if (isCollectibleApproval) {
    const actualSha256 = createHash("sha256").update(readFileSync(filePath)).digest("hex");
    if (actualSha256 !== slot.sha256.toLowerCase()) {
      throw new Error(`${slot.id} checksum does not match its approved render`);
    }
  }

  return { skipped: false, filePath };
}

export function validateApprovedGameArt(
  slots = GAME_ART_SLOTS,
  publicDir = DEFAULT_PUBLIC_DIR,
  collectibleSlots = slots === GAME_ART_SLOTS ? COLLECTIBLE_ART_SLOTS : [],
) {
  const approved = [
    ...slots.filter((slot) => slot.approval === GAME_ART_APPROVAL.approved),
    ...collectibleSlots.filter(isApprovedCollectibleArtSlot),
  ];
  for (const slot of approved) validateApprovedArtSlot(slot, publicDir);
  const approvedPaths = new Set(approved.map((slot) => slot.assetPath));
  for (const assetPath of listDeployableGameArt(publicDir)) {
    if (!approvedPaths.has(assetPath)) {
      throw new Error(`Unapproved game art is deployable under public/: ${assetPath}`);
    }
  }
  return approved.length;
}

function listDeployableGameArt(publicDir) {
  const root = resolve(publicDir, "assets/game-hub");
  if (!existsSync(root)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filePath = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(filePath);
      if (entry.isFile() && ALLOWED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push(`/${relative(publicDir, filePath).split(sep).join("/")}`);
      }
    }
  };
  visit(root);
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const approvedCount = validateApprovedGameArt();
  console.log(`Foxfam art preflight passed (${approvedCount} approved assets checked).`);
}
