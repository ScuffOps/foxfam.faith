import { buildRewardIntent, convertDuplicateCatch, DUPLICATE_POLICIES } from "../../../lib/gameRewards.js";
import { FISH_BY_KEY, pickFish, rollFishSize, STARFISHING_FISH } from "../content/fishCatalog.js";

export const STARFISHING_PHASES = {
  idle: "idle",
  casting: "casting",
  waiting: "waiting",
  bite: "bite",
  qte: "qte",
  caught: "caught",
  escaped: "escaped",
};

export const FISHPEDIA_STORAGE_KEY = "foxfam_starfishing_fishpedia_v1";
export const REWARD_LOG_STORAGE_KEY = "foxfam_starfishing_reward_log_v1";

const DEFAULT_WAIT_MS = 1200;
const QTE_WINDOW_MS = {
  common: 2200,
  uncommon: 1900,
  rare: 1550,
  epic: 1250,
  mythic: 950,
};

export function createInitialStarfishingState() {
  return {
    phase: STARFISHING_PHASES.idle,
    castStartedAt: 0,
    biteAt: 0,
    activeFish: null,
    qtePattern: [],
    qteIndex: 0,
    qteStartedAt: 0,
    lastCatch: null,
    lastRewardIntent: null,
    escapedReason: "",
    sessionStartedAt: Date.now(),
    catchCount: 0,
    streak: 0,
  };
}

export function beginCast(state, now = Date.now(), randomValue = Math.random()) {
  if (![STARFISHING_PHASES.idle, STARFISHING_PHASES.escaped].includes(state.phase)) {
    return state;
  }

  const fish = pickFish(randomValue);
  return {
    ...state,
    phase: STARFISHING_PHASES.waiting,
    castStartedAt: now,
    biteAt: now + DEFAULT_WAIT_MS + Math.round(randomValue * 1400),
    activeFish: fish,
    qtePattern: fish.qtePattern,
    qteIndex: 0,
    qteStartedAt: 0,
    lastCatch: null,
    lastRewardIntent: null,
    escapedReason: "",
  };
}

export function tickStarfishing(state, now = Date.now()) {
  if (state.phase === STARFISHING_PHASES.waiting && now >= state.biteAt) {
    return {
      ...state,
      phase: STARFISHING_PHASES.qte,
      qteStartedAt: now,
    };
  }

  if (state.phase === STARFISHING_PHASES.qte && state.activeFish) {
    const windowMs = QTE_WINDOW_MS[state.activeFish.rarity] || QTE_WINDOW_MS.common;
    if (now - state.qteStartedAt > windowMs) {
      return {
        ...state,
        phase: STARFISHING_PHASES.escaped,
        escapedReason: "The timing window slipped away.",
        streak: 0,
      };
    }
  }

  return state;
}

export function applyQteAction(state, action, fishpedia = {}, now = Date.now(), randomValue = Math.random()) {
  if (state.phase !== STARFISHING_PHASES.qte || !state.activeFish) return state;

  const expectedAction = state.qtePattern[state.qteIndex];
  if (action !== expectedAction) {
    return {
      ...state,
      phase: STARFISHING_PHASES.escaped,
      escapedReason: "The constellation tugged the line loose.",
      streak: 0,
    };
  }

  const nextIndex = state.qteIndex + 1;
  if (nextIndex < state.qtePattern.length) {
    return {
      ...state,
      qteIndex: nextIndex,
      qteStartedAt: now,
    };
  }

  const size = rollFishSize(state.activeFish, randomValue);
  const previousRecord = fishpedia[state.activeFish.key];
  const catchRecord = {
    fishKey: state.activeFish.key,
    label: state.activeFish.label,
    rarity: state.activeFish.rarity,
    size,
    caughtAt: new Date(now).toISOString(),
    duplicate: Boolean(previousRecord?.caught),
  };

  return {
    ...state,
    phase: STARFISHING_PHASES.caught,
    lastCatch: catchRecord,
    catchCount: state.catchCount + 1,
    streak: state.streak + 1,
    qteIndex: nextIndex,
  };
}

export function updateFishpedia(fishpedia = {}, catchRecord) {
  if (!catchRecord?.fishKey) return fishpedia;
  const current = fishpedia[catchRecord.fishKey] || {};

  return {
    ...fishpedia,
    [catchRecord.fishKey]: {
      fishKey: catchRecord.fishKey,
      caught: true,
      count: (current.count || 0) + 1,
      biggestSize: Math.max(Number(current.biggestSize || 0), catchRecord.size),
      smallestSize: current.smallestSize ? Math.min(current.smallestSize, catchRecord.size) : catchRecord.size,
      firstCaughtAt: current.firstCaughtAt || catchRecord.caughtAt,
      lastCaughtAt: catchRecord.caughtAt,
    },
  };
}

export function buildCatchRewardIntent({ catchRecord, duplicatePolicy = DUPLICATE_POLICIES.none, durationMs = 0 }) {
  const fish = FISH_BY_KEY[catchRecord?.fishKey];
  if (!fish) return null;

  const duplicateResult = catchRecord.duplicate
    ? convertDuplicateCatch({ policy: duplicatePolicy, fish })
    : { favorPreview: fish.favorPreview, items: fish.materialDrops, policy: DUPLICATE_POLICIES.none };

  const achievementKeys = [];
  if (!catchRecord.duplicate) achievementKeys.push(`first-${fish.key}`);
  if (fish.rarity === "mythic") achievementKeys.push("mythic-starfish");

  return buildRewardIntent({
    gameKey: "starfishing",
    eventType: catchRecord.duplicate ? "duplicate-catch" : "new-catch",
    score: Math.round((fish.favorPreview * 30) + catchRecord.size),
    durationMs,
    favorPreview: duplicateResult.favorPreview,
    items: duplicateResult.items,
    achievementKeys,
    duplicatePolicy: duplicateResult.policy,
  });
}

export function getFishpediaRows(fishpedia = {}) {
  return STARFISHING_FISH.map((fish) => {
    const record = fishpedia[fish.key];
    return {
      ...fish,
      discovered: Boolean(record?.caught),
      caughtCount: record?.count || 0,
      biggestSize: record?.biggestSize || 0,
    };
  });
}

export function readLocalJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
