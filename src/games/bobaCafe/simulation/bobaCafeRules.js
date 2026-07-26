import { buildRewardIntent, DUPLICATE_POLICIES } from "../../../lib/gameRewards.js";
import {
  BOBA_CAFE_INGREDIENT_GROUPS,
  BOBA_CUSTOMERS,
  BOBA_ORDER_TEMPLATES,
  BOBA_INGREDIENTS_BY_KEY,
  SWEETNESS_LEVELS,
  SWEETNESS_BY_KEY,
} from "../content/bobaCatalog.js";

export const BOBA_CAFE_STORAGE_KEY = "foxfam_boba_cafe_state_v1";
export const BOBA_CAFE_REWARD_LOG_KEY = "foxfam_boba_cafe_reward_log_v1";

export const BOBA_CAFE_PHASES = {
  serving: "serving",
  result: "result",
  shiftComplete: "shiftComplete",
};

export const BOBA_CAFE_GROUPS = ["tea", "milk", "topping", "charm"];
export const BOBA_ORDER_LIMIT = 8;
export const ORDER_PATIENCE_MS = 32000;
export const MIN_PATIENCE_MULTIPLIER = 0.35;

export const BOBA_OPTIONS_BY_STATION = Object.freeze({
  ...Object.fromEntries(BOBA_CAFE_INGREDIENT_GROUPS.map((group) => [group.key, group.options])),
  sweetness: SWEETNESS_LEVELS,
});

export function createInitialBobaCafeState({ now = Date.now(), seed = "foxfam-cafe" } = {}) {
  return {
    phase: BOBA_CAFE_PHASES.serving,
    daySeed: seed,
    orderIndex: 0,
    activeOrder: createBobaOrder({ orderIndex: 0, seed, now }),
    tray: createEmptyTray(),
    score: 0,
    claimedScore: 0,
    servedCount: 0,
    perfectCount: 0,
    combo: 0,
    bestCombo: 0,
    mistakes: 0,
    lastResult: null,
    startedAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
}

export function createBobaOrder({ orderIndex, seed = "foxfam-cafe", now = Date.now() }) {
  const order = pickDeterministic(BOBA_ORDER_TEMPLATES, `${seed}:order:${orderIndex}`);
  const customer = pickDeterministic(BOBA_CUSTOMERS, `${seed}:customer:${orderIndex}`);

  return {
    id: `boba-${orderIndex}-${stableHash(`${seed}:${order.key}:${customer.key}`)}`,
    orderIndex,
    label: order.label,
    customer,
    recipe: order.recipe,
    placedAt: now,
    patienceMs: Math.max(18000, ORDER_PATIENCE_MS - orderIndex * 1200),
  };
}

export function selectBobaIngredient(state, ingredientKey, now = Date.now()) {
  if (state.phase !== BOBA_CAFE_PHASES.serving) return state;
  const ingredient = BOBA_INGREDIENTS_BY_KEY[ingredientKey];
  if (!ingredient) return state;

  return {
    ...state,
    tray: {
      ...state.tray,
      [ingredient.groupKey]: ingredient.key,
    },
    updatedAt: new Date(now).toISOString(),
  };
}

export function selectBobaSweetness(state, sweetnessKey, now = Date.now()) {
  if (state.phase !== BOBA_CAFE_PHASES.serving || !SWEETNESS_BY_KEY[sweetnessKey]) return state;

  return {
    ...state,
    tray: {
      ...state.tray,
      sweetness: sweetnessKey,
    },
    updatedAt: new Date(now).toISOString(),
  };
}

export function selectCafeOptionByShortcut(state, stationKey, ordinal, now = Date.now()) {
  const options = BOBA_OPTIONS_BY_STATION[stationKey] || [];
  const option = options[ordinal - 1];
  if (!option) return state;

  return stationKey === "sweetness"
    ? selectBobaSweetness(state, option.key, now)
    : selectBobaIngredient(state, option.key, now);
}

export function clearBobaTray(state, now = Date.now()) {
  if (state.phase !== BOBA_CAFE_PHASES.serving) return state;
  return {
    ...state,
    tray: createEmptyTray(),
    updatedAt: new Date(now).toISOString(),
  };
}

export function tickBobaCafe(state, now = Date.now()) {
  if (state.phase !== BOBA_CAFE_PHASES.serving || !state.activeOrder) return state;
  if (getPatiencePercent(state.activeOrder, now) > 0) return state;

  return completeBobaOrder(state, now, true);
}

export function submitBobaDrink(state, now = Date.now()) {
  if (state.phase !== BOBA_CAFE_PHASES.serving || !state.activeOrder) return state;
  return completeBobaOrder(state, now, false);
}

export function startNextBobaOrder(state, now = Date.now()) {
  if (state.phase !== BOBA_CAFE_PHASES.result) return state;
  const nextIndex = state.orderIndex + 1;

  if (nextIndex >= BOBA_ORDER_LIMIT) {
    return {
      ...state,
      phase: BOBA_CAFE_PHASES.shiftComplete,
      orderIndex: nextIndex,
      activeOrder: null,
      tray: createEmptyTray(),
      updatedAt: new Date(now).toISOString(),
    };
  }

  return {
    ...state,
    phase: BOBA_CAFE_PHASES.serving,
    orderIndex: nextIndex,
    activeOrder: createBobaOrder({ orderIndex: nextIndex, seed: state.daySeed, now }),
    tray: createEmptyTray(),
    lastResult: null,
    updatedAt: new Date(now).toISOString(),
  };
}

export function buildBobaCafeRewardIntent({ state, durationMs = 0 }) {
  const unclaimedScore = Math.max(0, (state?.score || 0) - (state?.claimedScore || 0));
  if (unclaimedScore <= 0) return null;

  const items = [
    {
      key: "sugar-pearls",
      label: "Sugar Pearls",
      quantity: Math.max(1, Math.floor(unclaimedScore / 80)),
      type: "material",
    },
  ];

  if ((state?.perfectCount || 0) >= 3) {
    items.push({
      key: "cream-cloud",
      label: "Cream Cloud",
      quantity: Math.max(1, Math.floor((state?.perfectCount || 0) / 3)),
      type: "material",
    });
  }

  if ((state?.bestCombo || 0) >= 4) {
    items.push({
      key: "cafe-ribbon",
      label: "Cafe Ribbon",
      quantity: 1,
      type: "collectible",
    });
  }

  const achievementKeys = [];
  if ((state?.servedCount || 0) > 0) achievementKeys.push("first-boba-service");
  if ((state?.perfectCount || 0) >= 3) achievementKeys.push("perfect-pour");
  if ((state?.bestCombo || 0) >= 4) achievementKeys.push("rush-hour-combo");
  if ((state?.servedCount || 0) >= BOBA_ORDER_LIMIT && (state?.mistakes || 0) === 0) {
    achievementKeys.push("spotless-shift");
  }

  return buildRewardIntent({
    gameKey: "boba-cafe",
    eventType: "cafe-shift-claim",
    score: unclaimedScore,
    durationMs,
    favorPreview: Math.floor(unclaimedScore / 140),
    items,
    achievementKeys,
    duplicatePolicy: DUPLICATE_POLICIES.none,
  });
}

export function markBobaCafeClaimed(state, now = Date.now()) {
  return {
    ...state,
    claimedScore: state.score,
    updatedAt: new Date(now).toISOString(),
  };
}

export function getPatiencePercent(order, now = Date.now()) {
  if (!order) return 0;
  const elapsed = Math.max(0, now - order.placedAt);
  return Math.max(0, Math.round(100 - (elapsed / order.patienceMs) * 100));
}

export function getTrayCompletion(tray = {}) {
  const filledGroups = BOBA_CAFE_GROUPS.filter((groupKey) => Boolean(tray[groupKey])).length;
  return Math.round(((filledGroups + (tray.sweetness ? 1 : 0)) / 5) * 100);
}

export function isTrayComplete(tray = {}) {
  return getTrayCompletion(tray) === 100;
}

export function createEmptyTray() {
  return {
    tea: null,
    milk: null,
    topping: null,
    charm: null,
    sweetness: null,
  };
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

export function restoreBobaCafePracticeState(value, options = {}) {
  if (!isStoredPracticeState(value)) return createInitialBobaCafeState(options);
  return value;
}

function isStoredPracticeState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (!Object.values(BOBA_CAFE_PHASES).includes(value.phase)) return false;
  if (typeof value.daySeed !== "string" || !value.daySeed) return false;
  if (!Number.isInteger(value.orderIndex) || value.orderIndex < 0 || value.orderIndex > BOBA_ORDER_LIMIT) return false;
  for (const key of ["score", "claimedScore", "servedCount", "perfectCount", "combo", "bestCombo", "mistakes"]) {
    if (!Number.isInteger(value[key]) || value[key] < 0) return false;
  }
  if (!value.tray || typeof value.tray !== "object") return false;
  for (const key of BOBA_CAFE_GROUPS.concat("sweetness")) {
    if (value.tray[key] !== null && typeof value.tray[key] !== "string") return false;
  }
  if (value.phase === BOBA_CAFE_PHASES.shiftComplete) return value.activeOrder === null;
  return Boolean(
    value.activeOrder
    && typeof value.activeOrder === "object"
    && typeof value.activeOrder.label === "string"
    && value.activeOrder.recipe
    && typeof value.activeOrder.recipe === "object"
    && Number.isFinite(value.activeOrder.placedAt)
    && Number.isFinite(value.activeOrder.patienceMs),
  );
}

function completeBobaOrder(state, now, timedOut) {
  const result = scoreBobaTray({
    order: state.activeOrder,
    tray: timedOut ? createEmptyTray() : state.tray,
    now,
    timedOut,
  });
  const nextCombo = result.perfect ? state.combo + 1 : 0;
  const nextScore = state.score + result.score;
  const nextServedCount = state.servedCount + 1;

  return {
    ...state,
    phase: BOBA_CAFE_PHASES.result,
    score: nextScore,
    servedCount: nextServedCount,
    perfectCount: state.perfectCount + (result.perfect ? 1 : 0),
    combo: nextCombo,
    bestCombo: Math.max(state.bestCombo, nextCombo),
    mistakes: state.mistakes + (result.perfect ? 0 : 1),
    lastResult: result,
    updatedAt: new Date(now).toISOString(),
  };
}

export function scoreBobaTray({ order, tray, now = Date.now(), timedOut = false }) {
  if (!order) {
    return {
      score: 0,
      matches: [],
      misses: BOBA_CAFE_GROUPS.concat("sweetness"),
      perfect: false,
      timedOut,
      patiencePercent: 0,
      message: "No order was active.",
    };
  }

  const recipeKeys = BOBA_CAFE_GROUPS.concat("sweetness");
  const matches = recipeKeys.filter((key) => tray[key] === order.recipe[key]);
  const misses = recipeKeys.filter((key) => tray[key] !== order.recipe[key]);
  const patiencePercent = timedOut ? 0 : getPatiencePercent(order, now);
  const accuracyScore = matches.length * 80;
  const patienceBonus = Math.round(120 * Math.max(MIN_PATIENCE_MULTIPLIER, patiencePercent / 100));
  const perfect = misses.length === 0 && !timedOut;
  const score = timedOut ? 0 : accuracyScore + patienceBonus + (perfect ? 90 : 0);

  return {
    score,
    matches,
    misses,
    perfect,
    timedOut,
    patiencePercent,
    message: getResultMessage({ perfect, timedOut, matches: matches.length }),
  };
}

function getResultMessage({ perfect, timedOut, matches }) {
  if (timedOut) return "The cup got too quiet on the counter.";
  if (perfect) return "Perfect pour. The whole cafe noticed.";
  if (matches >= 3) return "Close enough to keep the line smiling.";
  return "A brave little remix, but not the ticket.";
}

function pickDeterministic(items, seed) {
  return items[stableHash(seed) % items.length];
}

function stableHash(value) {
  return String(value).split("").reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 2166136261);
}
