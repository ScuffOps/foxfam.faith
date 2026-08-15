import { RELIC_BASES, RELIC_CHARM_CATALOG, RELIC_EFFECTS } from "../../lib/relicCharms.js";
import { PROFILE_FRAME_CATALOG, PROFILE_PARTICLE_CATALOG } from "./profileCosmeticPresentation.js";
import { TROPHY_CATALOG } from "./trophyPresentation.js";

export const COLLECTIBLE_ART_CONTRACT_ID = "foxfam-asset-art-v1";

export const COLLECTIBLE_ART_KINDS = Object.freeze({
  relicBase: "relic-base",
  relicEffect: "relic-effect",
  charm: "charm",
  trophy: "trophy",
  profileFrame: "profile-frame",
  profileParticle: "profile-particle",
  catchEffect: "catch-effect",
});

export const COLLECTIBLE_APPROVAL_STATE = Object.freeze({
  pending: "pending",
  approved: "approved",
});

export const COLLECTIBLE_ART_RENDER_RULES = Object.freeze({
  transparentBackground: true,
  maximumMeaningfulFills: 12,
  maximumCelShadowTones: 2,
  lightSource: "top-left",
  shadowEdge: "bottom-right",
  maximumVisibleEffectLayers: 2,
  allowWhiteStickerHalo: false,
});

const KIND_DIRECTORY = Object.freeze({
  [COLLECTIBLE_ART_KINDS.relicBase]: "relic-bases",
  [COLLECTIBLE_ART_KINDS.relicEffect]: "relic-effects",
  [COLLECTIBLE_ART_KINDS.charm]: "charms",
  [COLLECTIBLE_ART_KINDS.trophy]: "trophies",
  [COLLECTIBLE_ART_KINDS.profileFrame]: "profile-frames",
  [COLLECTIBLE_ART_KINDS.profileParticle]: "profile-particles",
  [COLLECTIBLE_ART_KINDS.catchEffect]: "catch-effects",
});

const CATCH_EFFECT_KEYS = Object.freeze([
  ...new Set(RELIC_CHARM_CATALOG.flatMap((charm) => (
    typeof charm.effects?.catch_effect === "string" ? [charm.effects.catch_effect] : []
  ))),
]);

// Candidate exports stay fail-closed until all three approval checkpoints are
// recorded here with their checksum and canonical runtime path.
export const COLLECTIBLE_ART_APPROVAL_REGISTRY = Object.freeze({});

export const COLLECTIBLE_ART_SLOTS = Object.freeze([
  ...RELIC_BASES.map((base) => createSlot(COLLECTIBLE_ART_KINDS.relicBase, base.id, `${base.label} relic base with one dominant silhouette and focal symbol`)),
  ...RELIC_EFFECTS.map((effect) => createSlot(COLLECTIBLE_ART_KINDS.relicEffect, effect.id, `${effect.label} as one restrained hard-edged cosmetic layer`)),
  ...RELIC_CHARM_CATALOG.map((charm) => createSlot(COLLECTIBLE_ART_KINDS.charm, charm.key, `${charm.name}, ${charm.rarity} ${charm.kind} charm readable at 48 pixels`, { rarity: charm.rarity, provenance: charm.kind })),
  ...TROPHY_CATALOG.map((key) => createSlot(COLLECTIBLE_ART_KINDS.trophy, key, `${humanizeKey(key)} trophy with achievement provenance as its focal motif`)),
  ...Object.keys(PROFILE_FRAME_CATALOG).map((key) => createSlot(COLLECTIBLE_ART_KINDS.profileFrame, key, `${PROFILE_FRAME_CATALOG[key].label} with a fixed avatar-safe center`, { minimumClearCenterPercent: 72 })),
  ...Object.keys(PROFILE_PARTICLE_CATALOG).map((key) => createSlot(COLLECTIBLE_ART_KINDS.profileParticle, key, `${PROFILE_PARTICLE_CATALOG[key].label} as sparse flat cosmetic accent shapes`)),
  ...CATCH_EFFECT_KEYS.map((key) => createSlot(COLLECTIBLE_ART_KINDS.catchEffect, key, `${humanizeKey(key)} fishing catch effect using hard-edged flat shapes only`)),
]);

export function getCollectibleArtSlot(kind, key, slots = COLLECTIBLE_ART_SLOTS) {
  return slots.find((slot) => slot.kind === kind && slot.key === key) || null;
}

export function getApprovedCollectibleArtAsset(kind, key, slots = COLLECTIBLE_ART_SLOTS) {
  const slot = getCollectibleArtSlot(kind, key, slots);
  if (!isApprovedCollectibleArtSlot(slot)) return null;
  if (!isCanonicalCollectibleAssetPath(slot.assetPath, kind, key)) return null;
  return slot.assetPath;
}

export function isApprovedCollectibleArtSlot(slot) {
  return Boolean(slot)
    && slot.artContract === COLLECTIBLE_ART_CONTRACT_ID
    && isCompleteApproval(slot.approval?.concept)
    && isCompleteApproval(slot.approval?.render)
    && isCompleteApproval(slot.approval?.system)
    && /^[a-f0-9]{64}$/i.test(slot.sha256 || "");
}

export function isCanonicalCollectibleAssetPath(assetPath, kind, key) {
  if (typeof assetPath !== "string" || typeof key !== "string") return false;
  const directory = KIND_DIRECTORY[kind];
  if (!directory || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) return false;
  if (/[\\?#]/.test(assetPath) || /%(?:2e|2f|5c)/i.test(assetPath)) return false;
  return new RegExp(`^/assets/game-hub/collectibles/${directory}/${escapeRegExp(key)}\\.(?:svg|png)$`).test(assetPath);
}

function createSlot(kind, key, brief, metadata = {}) {
  const id = `shared.${kind}.${key}`;
  const evidence = COLLECTIBLE_ART_APPROVAL_REGISTRY[id] || {};
  return Object.freeze({
    id,
    kind,
    key,
    assetClass: kind === COLLECTIBLE_ART_KINDS.profileFrame ? "ui" : "collectible",
    aspect: "1:1",
    artContract: COLLECTIBLE_ART_CONTRACT_ID,
    checkpoints: Object.freeze([48, 64, 128]),
    renderRules: COLLECTIBLE_ART_RENDER_RULES,
    brief,
    metadata: Object.freeze({ ...metadata }),
    assetPath: evidence.assetPath || null,
    sha256: evidence.sha256 || null,
    approval: evidence.approval || pendingApproval(),
  });
}

function pendingApproval() {
  return Object.freeze({
    concept: pendingCheckpoint(),
    render: pendingCheckpoint(),
    system: pendingCheckpoint(),
  });
}

function pendingCheckpoint() {
  return Object.freeze({ state: COLLECTIBLE_APPROVAL_STATE.pending, by: null, at: null, evidence: null });
}

function isCompleteApproval(checkpoint) {
  return checkpoint?.state === COLLECTIBLE_APPROVAL_STATE.approved
    && typeof checkpoint.by === "string" && checkpoint.by.length > 0
    && typeof checkpoint.at === "string" && checkpoint.at.length > 0
    && typeof checkpoint.evidence === "string" && checkpoint.evidence.length > 0;
}

function humanizeKey(key) {
  return key.split("-").map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
