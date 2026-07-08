import { parseGameRewardIntent } from "../games/shared/rewards/gameRewardSchemas.js";
import { clampRewardPreview } from "../games/shared/simulation/sessionScoring.js";

export const DUPLICATE_POLICIES = {
  none: "none",
  keep: "keep",
  release: "release",
  convert: "convert",
};

export const LOCAL_DAILY_REWARD_CAPS = {
  starfishingFavor: 120,
  duplicateFavor: 40,
};

const DUPLICATE_RELEASE_VALUE = {
  common: 2,
  uncommon: 4,
  rare: 7,
  epic: 12,
  mythic: 20,
};

const DUPLICATE_DUST_VALUE = {
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 7,
  mythic: 12,
};

export function createRewardEventId(prefix = "game") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function convertDuplicateCatch({ policy, fish }) {
  const rarity = fish?.rarity || "common";

  if (policy === DUPLICATE_POLICIES.keep) {
    return {
      policy,
      favorPreview: 0,
      items: [],
      message: "Kept for collection records.",
    };
  }

  if (policy === DUPLICATE_POLICIES.release) {
    return {
      policy,
      favorPreview: DUPLICATE_RELEASE_VALUE[rarity] || DUPLICATE_RELEASE_VALUE.common,
      items: [],
      message: "Released as Favor preview.",
    };
  }

  if (policy === DUPLICATE_POLICIES.convert) {
    return {
      policy,
      favorPreview: 0,
      items: [
        {
          key: "star-dust",
          label: "Star Dust",
          quantity: DUPLICATE_DUST_VALUE[rarity] || DUPLICATE_DUST_VALUE.common,
          type: "material",
        },
      ],
      message: "Converted into forge dust preview.",
    };
  }

  return {
    policy: DUPLICATE_POLICIES.none,
    favorPreview: 0,
    items: [],
    message: "No duplicate conversion selected.",
  };
}

export function buildRewardIntent({
  gameKey,
  eventType,
  score = 0,
  durationMs = 0,
  favorPreview = 0,
  items = [],
  achievementKeys = [],
  duplicatePolicy = DUPLICATE_POLICIES.none,
  eventId = createRewardEventId(gameKey),
  createdAt = new Date().toISOString(),
}) {
  return parseGameRewardIntent({
    gameKey,
    eventId,
    eventType,
    score: Math.max(0, Math.round(Number(score) || 0)),
    durationMs: Math.max(0, Math.round(Number(durationMs) || 0)),
    favorPreview: Math.max(0, Math.round(Number(favorPreview) || 0)),
    items,
    achievementKeys,
    duplicatePolicy,
    createdAt,
  });
}

export function applyLocalRewardCap(intent, cap = LOCAL_DAILY_REWARD_CAPS.starfishingFavor) {
  return {
    ...intent,
    favorPreview: clampRewardPreview(intent?.favorPreview || 0, cap),
  };
}
