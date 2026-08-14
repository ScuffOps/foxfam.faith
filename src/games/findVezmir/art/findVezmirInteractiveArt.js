import { getApprovedGameArtFamily } from "../../shared/art/gameArtManifest.js";

export const FIND_VEZMIR_INTERACTIVE_ART_SLOT_IDS = Object.freeze([
  "find-vezmir.clues",
  "find-vezmir.vezmir",
  "find-vezmir.depth",
]);

export const FIND_VEZMIR_CLUE_ATLAS = Object.freeze({
  columns: 3,
  rows: 3,
  cells: Object.freeze({
    "moon-mug": Object.freeze({ column: 0, row: 0 }),
    "ribbon-bell": Object.freeze({ column: 1, row: 0 }),
    "fox-pin": Object.freeze({ column: 2, row: 0 }),
    "star-note": Object.freeze({ column: 0, row: 1 }),
    "seed-pouch": Object.freeze({ column: 1, row: 1 }),
  }),
});

export const FIND_VEZMIR_DEPTH_ATLAS = Object.freeze({
  columns: 2,
  rows: 2,
  cells: Object.freeze({
    background: Object.freeze({ column: 0, row: 0 }),
    room: Object.freeze({ column: 1, row: 0 }),
    foreground: Object.freeze({ column: 0, row: 1 }),
  }),
});

export function getApprovedFindVezmirInteractiveArt(
  resolveFamily = getApprovedGameArtFamily,
) {
  const family = resolveFamily(FIND_VEZMIR_INTERACTIVE_ART_SLOT_IDS);
  const clues = family?.["find-vezmir.clues"];
  const vezmir = family?.["find-vezmir.vezmir"];
  const depth = family?.["find-vezmir.depth"];

  if (![clues, vezmir, depth].every(isResolvedAsset)) return null;

  return Object.freeze({ clues, vezmir, depth });
}

export function getFindVezmirAtlasStyle(atlas, cellKey) {
  const cell = atlas.cells[cellKey];
  if (!cell) return null;

  return Object.freeze({
    width: `${atlas.columns * 100}%`,
    height: `${atlas.rows * 100}%`,
    transform: `translate(${-cell.column * (100 / atlas.columns)}%, ${-cell.row * (100 / atlas.rows)}%)`,
  });
}

export const FIND_VEZMIR_INTERACTIVE_ART = getApprovedFindVezmirInteractiveArt();

function isResolvedAsset(assetPath) {
  return typeof assetPath === "string" && assetPath.trim().length > 0;
}
