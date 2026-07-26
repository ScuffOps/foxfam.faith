import { GAME_WORLD_KEYS } from "../../../lib/gameHubCatalog.js";

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

export const GAME_ART_SLOTS = Object.freeze([
  slot("quarters.room", GAME_WORLD_KEYS.quarters, "environment", "16:9", "isometric", "Quarters room shell with aligned floor, walls, door, and clear walkable center"),
  slot("quarters.forge", GAME_WORLD_KEYS.quarters, "prop", "1:1", "isometric", "Relic Forge workbench and star anvil"),
  slot("quarters.wardrobe", GAME_WORLD_KEYS.quarters, "prop", "1:1", "isometric", "Familiar wardrobe with readable doors and accessory rail"),
  slot("quarters.trophy-shelf", GAME_WORLD_KEYS.quarters, "prop", "3:1", "isometric", "Wall-aligned trophy shelf with fixed collectible sockets"),
  slot("quarters.collections", GAME_WORLD_KEYS.quarters, "prop", "1:1", "isometric", "Fishpedia and collections cabinet"),
  slot("quarters.courtyard", GAME_WORLD_KEYS.quarters, "environment", "16:9", "isometric", "Priory courtyard world-select hub with six unobstructed destinations"),
  slot("quarters.familiar-idle", GAME_WORLD_KEYS.quarters, "sprite", "3:4", "threeQuarter", "Canonical customizable familiar idle seed frame"),

  slot("starfishing.pond", GAME_WORLD_KEYS.starfishing, "environment", "16:9", "isometric", "Constellation pond, dock, and celestial water lanes"),
  slot("starfishing.fisher", GAME_WORLD_KEYS.starfishing, "sprite", "3:4", "threeQuarter", "Familiar fishing pose and rod silhouette"),
  slot("starfishing.fish-family", GAME_WORLD_KEYS.starfishing, "collectible", "1:1", "icon", "Fishpedia constellation catch family with hidden silhouettes"),
  slot("starfishing.qte", GAME_WORLD_KEYS.starfishing, "interaction", "1:1", "ui", "Directional reel prompts for keyboard, pointer, and touch"),

  slot("match-merge.reliquary", GAME_WORLD_KEYS.matchMerge, "environment", "16:9", "isometric", "Reliquary sorting room and altar board"),
  slot("match-merge.offerings", GAME_WORLD_KEYS.matchMerge, "collectible", "1:1", "icon", "Five readable offering tiers with shared evolution silhouette"),
  slot("match-merge.merge-fx", GAME_WORLD_KEYS.matchMerge, "interaction", "1:1", "ui", "Hard-edged merge burst and combo confirmation"),

  slot("boba-cafe.counter", GAME_WORLD_KEYS.bobaCafe, "environment", "16:9", "isometric", "Priory cafe counter with aligned stations and uncluttered serving lane"),
  slot("boba-cafe.customers", GAME_WORLD_KEYS.bobaCafe, "sprite", "3:4", "threeQuarter", "Visitor familiar customer family"),
  slot("boba-cafe.ingredients", GAME_WORLD_KEYS.bobaCafe, "collectible", "1:1", "icon", "Cup, tea, pearl, cream, and topping ingredient family"),
  slot("boba-cafe.drink-states", GAME_WORLD_KEYS.bobaCafe, "interaction", "1:1", "ui", "Five-stage drink assembly sequence"),

  slot("find-vezmir.cloister", GAME_WORLD_KEYS.puzzleCat, "environment", "16:9", "isometric", "Layered cloister diorama with stable shared axes"),
  slot("find-vezmir.clues", GAME_WORLD_KEYS.puzzleCat, "collectible", "1:1", "icon", "Hidden-object clue family with clear small-scale silhouettes"),
  slot("find-vezmir.vezmir", GAME_WORLD_KEYS.puzzleCat, "sprite", "3:4", "threeQuarter", "Vezmir reveal and celebration poses"),
  slot("find-vezmir.depth", GAME_WORLD_KEYS.puzzleCat, "interaction", "1:1", "ui", "Layer depth and hint controls"),

  slot("time-runner.clocktower", GAME_WORLD_KEYS.timeRunner, "environment", "16:9", "side", "Clocktower traversal route built from clock hands and numerals"),
  slot("time-runner.runner", GAME_WORLD_KEYS.timeRunner, "sprite", "4:1", "side", "Anchored familiar run, jump, focus, and fall strip"),
  slot("time-runner.shards", GAME_WORLD_KEYS.timeRunner, "collectible", "1:1", "icon", "Clock-face shard and Clock Brass family"),
  slot("time-runner.actions", GAME_WORLD_KEYS.timeRunner, "interaction", "1:1", "ui", "Jump and focus prompts for keyboard, pointer, and touch"),

  slot("word-garden.conservatory", GAME_WORLD_KEYS.wordGarden, "environment", "16:9", "isometric", "Priory conservatory with a clear central flower bed"),
  slot("word-garden.flower", GAME_WORLD_KEYS.wordGarden, "interaction", "1:1", "ui", "Seven-petal letter flower with fixed readable center"),
  slot("word-garden.bloom-family", GAME_WORLD_KEYS.wordGarden, "collectible", "1:1", "icon", "Sprout, bloom, full-bloom, and Blooming Ink rewards"),

  slot("shared.relic-bases", "shared", "collectible", "1:1", "icon", "Lantern, tome, mask, crystal, and instrument relic bases"),
  slot("shared.charms", "shared", "collectible", "1:1", "icon", "Achievement and game-exclusive charm family readable at 48 pixels"),
  slot("shared.trophies", "shared", "collectible", "1:1", "icon", "Achievement trophy family with provenance-first motifs"),
  slot("shared.profile-frames", "shared", "ui", "1:1", "ui", "Profile frame family with fixed avatar-safe inner bounds"),
]);

function slot(id, worldKey, assetClass, aspect, perspective, brief) {
  return Object.freeze({
    id,
    worldKey,
    assetClass: GAME_ART_CLASSES[assetClass],
    aspect,
    perspective: GAME_ART_PERSPECTIVES[perspective],
    approval: AWAITING,
    brief,
  });
}

export function getGameArtSlots(worldKey) {
  return GAME_ART_SLOTS.filter((asset) => asset.worldKey === worldKey);
}
