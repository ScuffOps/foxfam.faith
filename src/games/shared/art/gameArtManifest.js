import { GAME_WORLD_KEYS } from "../../../lib/gameHubCatalog.js";

export const GAME_ART_CONTRACT_ID = "foxfam-asset-art-v1";

export const GAME_ART_CLASSES = Object.freeze({
  environment: "environment",
  prop: "prop",
  sprite: "sprite",
  collectible: "collectible",
  interaction: "interaction",
  ui: "ui",
});

export const GAME_ART_PERSPECTIVES = Object.freeze({
  isometric: "isometric-30deg",
  threeQuarter: "three-quarter-isometric",
  side: "side-profile",
  icon: "icon-front",
  ui: "ui-orthographic",
});

export const GAME_ART_APPROVAL = Object.freeze({
  awaitingRender: "awaiting-render-approval",
  approved: "approved",
});

const AWAITING = GAME_ART_APPROVAL.awaitingRender;
const APPROVED = GAME_ART_APPROVAL.approved;

// Reviewed assets remain inert until an explicit approval record is added here.
// Keeping provenance separate from scene declarations makes staged art promotion
// atomic and prevents a path-only edit from bypassing the approval boundary.
export const GAME_ART_APPROVAL_REGISTRY = Object.freeze({});

export const GAME_ART_SLOTS = Object.freeze([
  slot("quarters.room", GAME_WORLD_KEYS.quarters, "environment", "3:2", "isometric", "Darker cozy-cafe Quarters shell with aligned walls, warm wood floor, moon window, and clear walkable center", approvedAsset("/assets/game-hub/quarters/quarters-room.png", "2026-08-13")),
  slot("quarters.room-legacy", GAME_WORLD_KEYS.quarters, "environment", "30:19", "isometric", "Approved legacy Quarters environment retained as the layered fallback for older scene renderers", approvedAsset("/assets/game-hub/quarters/quarters-room.svg", "2026-08-13")),
  slot("quarters.room-fixtures", GAME_WORLD_KEYS.quarters, "prop", "30:19", "isometric", "Transparent fixture plane with relic forge, wardrobe, trophy shelf, collection cabinet, sofa nook, tea table, and courtyard door on the shared room axes", approvedAsset("/assets/game-hub/quarters/quarters-fixtures.svg", "2026-08-13")),
  slot("quarters.room-foreground", GAME_WORLD_KEYS.quarters, "prop", "30:19", "isometric", "Transparent foreground rug plane that occludes a moving familiar consistently on the shared Quarters plane", approvedAsset("/assets/game-hub/quarters/quarters-foreground.svg", "2026-08-13")),
  slot("quarters.forge", GAME_WORLD_KEYS.quarters, "prop", "1:1", "isometric", "Relic Forge workbench and star anvil"),
  slot("quarters.wardrobe", GAME_WORLD_KEYS.quarters, "prop", "1:1", "isometric", "Familiar wardrobe with readable doors and accessory rail"),
  slot("quarters.trophy-shelf", GAME_WORLD_KEYS.quarters, "prop", "3:1", "isometric", "Wall-aligned trophy shelf with fixed collectible sockets"),
  slot("quarters.collections", GAME_WORLD_KEYS.quarters, "prop", "1:1", "isometric", "Fishpedia and collections cabinet"),
  slot("quarters.courtyard", GAME_WORLD_KEYS.quarters, "environment", "3:2", "isometric", "Priory courtyard world-select hub with six unobstructed destinations", approvedAsset("/assets/game-hub/courtyard/priory-courtyard.png", "2026-08-13")),
  slot("quarters.familiar-idle", GAME_WORLD_KEYS.quarters, "sprite", "3:4", "threeQuarter", "Canonical customizable familiar idle seed frame"),

  slot("starfishing.pond", GAME_WORLD_KEYS.starfishing, "environment", "3:2", "isometric", "Constellation pond, dock, and celestial water lanes", approvedAsset("/assets/game-hub/starfishing/constellation-pond.png", "2026-08-13")),
  slot("starfishing.pond-foreground", GAME_WORLD_KEYS.starfishing, "prop", "3:2", "isometric", "Transparent near-bank, reeds, and dock-edge plane that frames the familiar and catch reveal without obscuring the active water lane"),
  slot("starfishing.rig", GAME_WORLD_KEYS.starfishing, "prop", "3:2", "isometric", "Transparent fishing rig layer with rod, dynamic line, bobber, and hard-edged water ripples on the approved pond plane"),
  slot("starfishing.fisher", GAME_WORLD_KEYS.starfishing, "sprite", "9:8", "threeQuarter", "Three-by-two atlas of 3:4 familiar fishing poses and rod silhouettes"),
  slot("starfishing.fish-family", GAME_WORLD_KEYS.starfishing, "collectible", "3:2", "icon", "Three-by-two atlas of five square Fishpedia constellation catch silhouettes"),
  slot("starfishing.qte", GAME_WORLD_KEYS.starfishing, "interaction", "1:1", "ui", "Directional reel prompts for keyboard, pointer, and touch"),

  slot("match-merge.reliquary", GAME_WORLD_KEYS.matchMerge, "environment", "16:9", "isometric", "Reliquary sorting room and altar board", approvedAsset("/assets/game-hub/match-merge/reliquary-room.png", "2026-08-13")),
  slot("match-merge.offerings", GAME_WORLD_KEYS.matchMerge, "collectible", "3:2", "icon", "Three-by-two atlas of five readable square offering tiers with shared evolution silhouette"),
  slot("match-merge.merge-fx", GAME_WORLD_KEYS.matchMerge, "interaction", "1:1", "ui", "Hard-edged merge burst and combo confirmation"),

  slot("boba-cafe.room-bg", GAME_WORLD_KEYS.bobaCafe, "environment", "16:9", "isometric", "Moonbrew room shell, garden window, wall sign, and aligned isometric floor with an open serving lane", approvedAsset("/assets/game-hub/boba-cafe/moonbrew-room-bg.svg")),
  slot("boba-cafe.workstations", GAME_WORLD_KEYS.bobaCafe, "prop", "16:9", "isometric", "Transparent workstation layer with dispenser, kettle, sealer, pastry case, shelves, and jars on the shared scene plane", approvedAsset("/assets/game-hub/boba-cafe/moonbrew-workstations.svg")),
  slot("boba-cafe.counter-fg", GAME_WORLD_KEYS.bobaCafe, "prop", "16:9", "isometric", "Transparent foreground counter layer that occludes characters consistently without covering the active drink area", approvedAsset("/assets/game-hub/boba-cafe/moonbrew-counter-fg.svg")),
  slot("boba-cafe.customers", GAME_WORLD_KEYS.bobaCafe, "sprite", "9:8", "threeQuarter", "Three-by-two atlas of 3:4 visitor familiar customer portraits"),
  slot("boba-cafe.ingredients", GAME_WORLD_KEYS.bobaCafe, "collectible", "5:4", "icon", "Five-by-four atlas of square tea, milk, topping, charm, and sweetness ingredients"),
  slot("boba-cafe.drink-states", GAME_WORLD_KEYS.bobaCafe, "interaction", "5:1", "ui", "Five-by-one atlas for the square drink assembly sequence"),

  slot("find-vezmir.cloister-background", GAME_WORLD_KEYS.puzzleCat, "environment", "16:9", "isometric", "Far cloister arcade, walls, hanging lanterns, and upper planting on stable shared axes"),
  slot("find-vezmir.cloister-room", GAME_WORLD_KEYS.puzzleCat, "environment", "16:9", "isometric", "Playable courtyard floor, constellation fountain, pedestal, and main garden beds on the shared scene plane"),
  slot("find-vezmir.cloister-foreground", GAME_WORLD_KEYS.puzzleCat, "prop", "16:9", "isometric", "Transparent near-corner foliage and low courtyard details that frame hotspots without covering them"),
  slot("find-vezmir.clues", GAME_WORLD_KEYS.puzzleCat, "collectible", "1:1", "icon", "Hidden-object clue family with clear small-scale silhouettes"),
  slot("find-vezmir.vezmir", GAME_WORLD_KEYS.puzzleCat, "sprite", "3:4", "threeQuarter", "Vezmir reveal and celebration poses"),
  slot("find-vezmir.depth", GAME_WORLD_KEYS.puzzleCat, "interaction", "1:1", "ui", "Layer depth and hint controls"),

  slot("time-runner.clocktower", GAME_WORLD_KEYS.timeRunner, "environment", "16:9", "side", "Clocktower traversal route built from clock hands and numerals", approvedAsset("/assets/game-hub/time-runner/clocktower-route.png", "2026-08-13")),
  slot("time-runner.runner", GAME_WORLD_KEYS.timeRunner, "sprite", "4:1", "side", "Anchored familiar run, jump, focus, and fall strip"),
  slot("time-runner.shards", GAME_WORLD_KEYS.timeRunner, "collectible", "1:1", "icon", "Clock-face shard and Clock Brass family"),
  slot("time-runner.actions", GAME_WORLD_KEYS.timeRunner, "interaction", "1:1", "ui", "Jump and focus prompts for keyboard, pointer, and touch"),

  slot("word-garden.conservatory", GAME_WORLD_KEYS.wordGarden, "environment", "16:9", "isometric", "Priory conservatory with a clear central flower bed", approvedAsset("/assets/game-hub/word-garden/conservatory.png", "2026-08-13")),
  slot("word-garden.flower", GAME_WORLD_KEYS.wordGarden, "interaction", "1:1", "ui", "Seven-petal letter flower with fixed readable center"),
  slot("word-garden.bloom-family", GAME_WORLD_KEYS.wordGarden, "collectible", "4:1", "icon", "Four-by-one atlas of square sprout, bloom, full-bloom, and Blooming Ink rewards"),

]);

function slot(id, worldKey, assetClass, aspect, perspective, brief, evidence = {}) {
  const approvalEvidence = GAME_ART_APPROVAL_REGISTRY[id] || evidence;
  return Object.freeze({
    id,
    worldKey,
    assetClass: GAME_ART_CLASSES[assetClass],
    aspect,
    perspective: GAME_ART_PERSPECTIVES[perspective],
    artContract: GAME_ART_CONTRACT_ID,
    approval: approvalEvidence.approval || AWAITING,
    assetPath: approvalEvidence.assetPath || null,
    approvedBy: approvalEvidence.approvedBy || null,
    approvedAt: approvalEvidence.approvedAt || null,
    brief,
  });
}

function approvedAsset(assetPath, approvedAt = "2026-08-11") {
  return Object.freeze({
    approval: APPROVED,
    assetPath,
    approvedBy: "scuffox",
    approvedAt,
  });
}

export function getGameArtSlots(worldKey) {
  return GAME_ART_SLOTS.filter((asset) => asset.worldKey === worldKey);
}

export function getApprovedGameArtAsset(id) {
  const slot = GAME_ART_SLOTS.find((asset) => asset.id === id);
  return slot?.approval === APPROVED
    && slot.artContract === GAME_ART_CONTRACT_ID
    && slot.assetPath
    && slot.approvedBy
    && slot.approvedAt
    ? slot.assetPath
    : null;
}

export function getApprovedGameArtFamily(ids = []) {
  const entries = ids.map((id) => [id, getApprovedGameArtAsset(id)]);
  if (!entries.length || entries.some(([, assetPath]) => !assetPath)) return null;
  return Object.freeze(Object.fromEntries(entries));
}
