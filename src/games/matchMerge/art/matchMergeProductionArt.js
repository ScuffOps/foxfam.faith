import { getApprovedGameArtFamily } from "../../shared/art/gameArtManifest.js";

export const MATCH_MERGE_PRODUCTION_ART_SLOT_IDS = Object.freeze([
  "match-merge.offerings",
  "match-merge.merge-fx",
]);

export const MATCH_MERGE_OFFERING_ATLAS = Object.freeze({
  columns: 3,
  rows: 2,
  cells: Object.freeze({
    "moon-spark": Object.freeze({ column: 0, row: 0 }),
    "candle-seal": Object.freeze({ column: 1, row: 0 }),
    "woven-cord": Object.freeze({ column: 2, row: 0 }),
    "sigil-flake": Object.freeze({ column: 0, row: 1 }),
    "relic-knot": Object.freeze({ column: 1, row: 1 }),
  }),
});

export function getApprovedMatchMergeProductionArt(
  resolveFamily = getApprovedGameArtFamily,
) {
  const family = resolveFamily(MATCH_MERGE_PRODUCTION_ART_SLOT_IDS);
  const offerings = family?.["match-merge.offerings"];
  const mergeFx = family?.["match-merge.merge-fx"];

  if (!isResolvedAsset(offerings) || !isResolvedAsset(mergeFx)) return null;

  return Object.freeze({ offerings, mergeFx });
}

export function getMatchMergeOfferingAtlasTransform(offeringKey) {
  const cell = MATCH_MERGE_OFFERING_ATLAS.cells[offeringKey]
    || MATCH_MERGE_OFFERING_ATLAS.cells["moon-spark"];

  return `translate(${-cell.column * (100 / MATCH_MERGE_OFFERING_ATLAS.columns)}%, ${-cell.row * (100 / MATCH_MERGE_OFFERING_ATLAS.rows)}%)`;
}

function isResolvedAsset(assetPath) {
  return typeof assetPath === "string" && assetPath.trim().length > 0;
}
