import { getApprovedGameArtFamily } from "../../shared/art/gameArtManifest.js";

export const WORD_GARDEN_ART_FAMILY_IDS = Object.freeze([
  "word-garden.flower",
  "word-garden.bloom-family",
]);

export function resolveApprovedWordGardenArtFamily(resolveFamily = getApprovedGameArtFamily) {
  const family = resolveFamily(WORD_GARDEN_ART_FAMILY_IDS);
  const flower = family?.["word-garden.flower"];
  const bloomFamily = family?.["word-garden.bloom-family"];

  if (!isAssetPath(flower) || !isAssetPath(bloomFamily)) return null;

  return Object.freeze({ flower, bloomFamily });
}

function isAssetPath(value) {
  return typeof value === "string" && value.trim().length > 0;
}
