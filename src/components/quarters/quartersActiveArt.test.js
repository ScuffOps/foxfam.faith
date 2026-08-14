import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  QUARTERS_OPTIONAL_ART_LAYER_SPECS,
  resolveApprovedQuartersArtLayers,
} from "./quartersActiveArt.js";

const resolverSource = readFileSync(new URL("./quartersActiveArt.js", import.meta.url), "utf8");
const roomSource = readFileSync(new URL("./IsometricRoom.jsx", import.meta.url), "utf8");

const EXPECTED_LAYERS = [
  {
    slotId: "quarters.forge",
    layerId: "quarters-layer-forge",
    kind: "prop",
    anchor: { x: 64, y: 18, width: 28, height: 42, originX: 0, originY: 0 },
    zIndex: 5,
  },
  {
    slotId: "quarters.wardrobe",
    layerId: "quarters-layer-wardrobe",
    kind: "prop",
    anchor: { x: 76, y: 48, width: 19, height: 32, originX: 0, originY: 0 },
    zIndex: 6,
  },
  {
    slotId: "quarters.trophy-shelf",
    layerId: "quarters-layer-trophy-shelf",
    kind: "prop",
    anchor: { x: 28, y: 25, width: 20, height: 13, originX: 0, originY: 0 },
    zIndex: 4,
  },
  {
    slotId: "quarters.collections",
    layerId: "quarters-layer-collections",
    kind: "prop",
    anchor: { x: 17.5, y: 33, width: 18, height: 32, originX: 0, originY: 0 },
    zIndex: 4,
  },
  {
    slotId: "quarters.familiar-idle",
    layerId: "quarters-layer-familiar-idle",
    kind: "familiar",
    anchor: { x: 50, y: 100, width: 100, height: 100, originX: 50, originY: 100 },
    zIndex: 8,
  },
];

test("Quarters optional art has deterministic slot ids, DOM ids, anchors, and depth", () => {
  assert.deepEqual(QUARTERS_OPTIONAL_ART_LAYER_SPECS, EXPECTED_LAYERS);
  assert.equal(new Set(QUARTERS_OPTIONAL_ART_LAYER_SPECS.map((layer) => layer.layerId)).size, EXPECTED_LAYERS.length);
});

test("Quarters optional art remains absent while every slot is awaiting approval", () => {
  assert.deepEqual(resolveApprovedQuartersArtLayers(), []);
});

test("Quarters resolves approved optional layers independently through the manifest boundary", () => {
  const requestedSlotIds = [];
  const resolved = resolveApprovedQuartersArtLayers((slotId) => {
    requestedSlotIds.push(slotId);
    return slotId === "quarters.forge" || slotId === "quarters.familiar-idle"
      ? `/approved-by-test/${slotId}.png`
      : null;
  });

  assert.deepEqual(requestedSlotIds, EXPECTED_LAYERS.map((layer) => layer.slotId));
  assert.deepEqual(resolved.map(({ slotId, layerId, assetPath, anchor }) => ({ slotId, layerId, assetPath, anchor })), [
    {
      slotId: "quarters.forge",
      layerId: "quarters-layer-forge",
      assetPath: "/approved-by-test/quarters.forge.png",
      anchor: EXPECTED_LAYERS[0].anchor,
    },
    {
      slotId: "quarters.familiar-idle",
      layerId: "quarters-layer-familiar-idle",
      assetPath: "/approved-by-test/quarters.familiar-idle.png",
      anchor: EXPECTED_LAYERS[4].anchor,
    },
  ]);
});

test("Quarters runtime contains no direct optional asset paths outside the manifest", () => {
  assert.match(resolverSource, /resolveApprovedQuartersArtLayers\(resolveAsset = getApprovedGameArtAsset\)/);
  assert.match(resolverSource, /resolveAsset\(layer\.slotId\)/);
  assert.match(roomSource, /getQuartersOptionalArt\(\)/);
  assert.match(roomSource, /data-art-slot=\{layer\.slotId\}/);
  assert.match(roomSource, /data-art-slot=\{QUARTERS_FAMILIAR_IDLE_ART\.slotId\}/);
  assert.match(roomSource, /useApprovedFamiliarFallback = !familiar && QUARTERS_FAMILIAR_IDLE_ART/);
  assert.match(roomSource, /<FamiliarAvatar familiar=\{familiar\}/);
  assert.doesNotMatch(`${resolverSource}\n${roomSource}`, /["'`]\/assets\/game-hub\//);
});
