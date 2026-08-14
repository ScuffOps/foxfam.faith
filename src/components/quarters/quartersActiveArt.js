import { getApprovedGameArtAsset } from "../../games/shared/art/gameArtManifest.js";

function freezeAnchor(x, y, width, height, originX = 0, originY = 0) {
  return Object.freeze({ x, y, width, height, originX, originY });
}

function freezeLayer(slotId, layerId, kind, anchor, zIndex) {
  return Object.freeze({ slotId, layerId, kind, anchor, zIndex });
}

export const QUARTERS_OPTIONAL_ART_LAYER_SPECS = Object.freeze([
  freezeLayer(
    "quarters.forge",
    "quarters-layer-forge",
    "prop",
    freezeAnchor(64, 18, 28, 42),
    5,
  ),
  freezeLayer(
    "quarters.wardrobe",
    "quarters-layer-wardrobe",
    "prop",
    freezeAnchor(76, 48, 19, 32),
    6,
  ),
  freezeLayer(
    "quarters.trophy-shelf",
    "quarters-layer-trophy-shelf",
    "prop",
    freezeAnchor(28, 25, 20, 13),
    4,
  ),
  freezeLayer(
    "quarters.collections",
    "quarters-layer-collections",
    "prop",
    freezeAnchor(17.5, 33, 18, 32),
    4,
  ),
  freezeLayer(
    "quarters.familiar-idle",
    "quarters-layer-familiar-idle",
    "familiar",
    freezeAnchor(50, 100, 100, 100, 50, 100),
    8,
  ),
]);

export function resolveApprovedQuartersArtLayers(resolveAsset = getApprovedGameArtAsset) {
  return Object.freeze(QUARTERS_OPTIONAL_ART_LAYER_SPECS.flatMap((layer) => {
    const assetPath = resolveAsset(layer.slotId);
    return assetPath ? [Object.freeze({ ...layer, assetPath })] : [];
  }));
}

export function getQuartersOptionalArt() {
  const layers = resolveApprovedQuartersArtLayers();
  return Object.freeze({
    props: Object.freeze(layers.filter((layer) => layer.kind === "prop")),
    familiarIdle: layers.find((layer) => layer.kind === "familiar") || null,
  });
}
