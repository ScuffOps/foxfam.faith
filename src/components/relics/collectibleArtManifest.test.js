import assert from "node:assert/strict";
import test from "node:test";
import { RELIC_BASES, RELIC_CHARM_CATALOG, RELIC_EFFECTS } from "../../lib/relicCharms.js";
import { PROFILE_FRAME_CATALOG, PROFILE_PARTICLE_CATALOG } from "./profileCosmeticPresentation.js";
import { TROPHY_CATALOG } from "./trophyPresentation.js";
import {
  COLLECTIBLE_APPROVAL_STATE,
  COLLECTIBLE_ART_CONTRACT_ID,
  COLLECTIBLE_ART_KINDS,
  COLLECTIBLE_ART_RENDER_RULES,
  COLLECTIBLE_ART_SLOTS,
  getApprovedCollectibleArtAsset,
  isApprovedCollectibleArtSlot,
  isCanonicalCollectibleAssetPath,
} from "./collectibleArtManifest.js";

const EXPECTED_KEYS = new Map([
  [COLLECTIBLE_ART_KINDS.relicBase, RELIC_BASES.map(({ id }) => id)],
  [COLLECTIBLE_ART_KINDS.relicEffect, RELIC_EFFECTS.map(({ id }) => id)],
  [COLLECTIBLE_ART_KINDS.charm, RELIC_CHARM_CATALOG.map(({ key }) => key)],
  [COLLECTIBLE_ART_KINDS.trophy, TROPHY_CATALOG],
  [COLLECTIBLE_ART_KINDS.profileFrame, Object.keys(PROFILE_FRAME_CATALOG)],
  [COLLECTIBLE_ART_KINDS.profileParticle, Object.keys(PROFILE_PARTICLE_CATALOG)],
  [COLLECTIBLE_ART_KINDS.catchEffect, ["merciful-tide"]],
]);

test("every authoritative collectible key has exactly one namespaced art slot", () => {
  const expectedIds = [];
  for (const [kind, keys] of EXPECTED_KEYS) {
    for (const key of keys) expectedIds.push(`shared.${kind}.${key}`);
  }

  assert.equal(expectedIds.length, 81);
  assert.deepEqual(COLLECTIBLE_ART_SLOTS.map(({ id }) => id).sort(), expectedIds.sort());
  assert.equal(new Set(COLLECTIBLE_ART_SLOTS.map(({ id }) => id)).size, COLLECTIBLE_ART_SLOTS.length);
});

test("collectible slots are fail-closed until concept, render, and system approval are complete", () => {
  for (const slot of COLLECTIBLE_ART_SLOTS) {
    assert.equal(slot.artContract, COLLECTIBLE_ART_CONTRACT_ID);
    assert.equal(slot.aspect, "1:1");
    assert.deepEqual(slot.checkpoints, [48, 64, 128]);
    assert.deepEqual(slot.renderRules, COLLECTIBLE_ART_RENDER_RULES);
    assert.equal(slot.assetPath, null);
    assert.equal(getApprovedCollectibleArtAsset(slot.kind, slot.key), null);
  }
});

test("every collectible slot carries the strict flat-cel rendering contract", () => {
  assert.deepEqual(COLLECTIBLE_ART_RENDER_RULES, {
    transparentBackground: true,
    maximumMeaningfulFills: 12,
    maximumCelShadowTones: 2,
    lightSource: "top-left",
    shadowEdge: "bottom-right",
    maximumVisibleEffectLayers: 2,
    allowWhiteStickerHalo: false,
  });
});

test("approved collectible art requires complete provenance and a canonical key-specific path", () => {
  const kind = COLLECTIBLE_ART_KINDS.charm;
  const key = "hearthforged-seal";
  const checkpoint = { state: COLLECTIBLE_APPROVAL_STATE.approved, by: "scuffox", at: "2026-08-13", evidence: "render-board-v1" };
  const approved = [{
    ...COLLECTIBLE_ART_SLOTS.find((slot) => slot.kind === kind && slot.key === key),
    assetPath: "/assets/game-hub/collectibles/charms/hearthforged-seal.svg",
    sha256: "a".repeat(64),
    approval: { concept: checkpoint, render: checkpoint, system: checkpoint },
  }];

  assert.equal(getApprovedCollectibleArtAsset(kind, key, approved), approved[0].assetPath);
  assert.equal(isApprovedCollectibleArtSlot(approved[0]), true);
  assert.equal(isApprovedCollectibleArtSlot({ ...approved[0], sha256: null }), false);
  assert.equal(getApprovedCollectibleArtAsset(kind, key, [{ ...approved[0], approval: { ...approved[0].approval, system: { ...checkpoint, evidence: null } } }]), null);
  assert.equal(getApprovedCollectibleArtAsset(kind, key, [{ ...approved[0], assetPath: "/assets/game-hub/collectibles/charms/ascendant-anvil.svg" }]), null);
});

test("collectible paths reject traversal, external URLs, encoded separators, and query fragments", () => {
  const kind = COLLECTIBLE_ART_KINDS.charm;
  const key = "starlit-bobber";
  assert.equal(isCanonicalCollectibleAssetPath("/assets/game-hub/collectibles/charms/starlit-bobber.svg", kind, key), true);
  for (const assetPath of [
    "https://example.com/starlit-bobber.svg",
    "//example.com/starlit-bobber.svg",
    "/assets/game-hub/collectibles/charms/../starlit-bobber.svg",
    "/assets/game-hub/collectibles/charms/%2e%2e/starlit-bobber.svg",
    "/assets/game-hub/collectibles/charms%2fstarlit-bobber.svg",
    "/assets/game-hub/collectibles/charms\\starlit-bobber.svg",
    "/assets/game-hub/collectibles/charms/starlit-bobber.svg?raw=1",
    "/assets/game-hub/collectibles/charms/starlit-bobber.svg#icon",
    "/assets/game-hub/collectibles/trophies/starlit-bobber.svg",
  ]) assert.equal(isCanonicalCollectibleAssetPath(assetPath, kind, key), false, assetPath);
});
