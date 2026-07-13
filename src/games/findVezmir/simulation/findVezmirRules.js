import { buildRewardIntent, DUPLICATE_POLICIES } from "../../../lib/gameRewards.js";
import {
  FIND_VEZMIR_CLUE_KEYS,
  FIND_VEZMIR_OBJECT_BY_KEY,
  FIND_VEZMIR_OBJECTS,
  FIND_VEZMIR_TARGET_KEYS,
  FIND_VEZMIR_VEZMIR_KEY,
} from "../content/hiddenObjects.js";

export const FIND_VEZMIR_PHASES = {
  seeking: "seeking",
  vezmirReady: "vezmir-ready",
  complete: "complete",
};

export const FIND_VEZMIR_REWARD_LOG_KEY = "foxfam_find_vezmir_reward_log_v1";
export const FIND_VEZMIR_SAVE_KEY = "foxfam_find_vezmir_state_v1";

export const FIND_VEZMIR_SCORING = {
  clue: 140,
  vezmir: 420,
  focusBonus: 45,
  completionBonus: 240,
  noMissBonus: 160,
  noHintBonus: 120,
  missPenalty: 28,
  hintPenalty: 42,
};

const MAX_FOCUS = 5;
export const FIND_VEZMIR_DIORAMA_LAYERS = ["foreground", "room", "background"];
export const FIND_VEZMIR_PAN_BOUNDS = { x: 12, y: 9 };

export function createInitialFindVezmirState({ now = Date.now() } = {}) {
  return {
    phase: FIND_VEZMIR_PHASES.seeking,
    foundKeys: [],
    activeHintKey: "",
    activeHintRegion: "",
    layers: [...FIND_VEZMIR_DIORAMA_LAYERS],
    activeLayer: 1,
    pan: { x: 0, y: 0 },
    focus: MAX_FOCUS,
    misses: 0,
    hintsUsed: 0,
    score: 0,
    message: "Find the clue trinkets, then spot Vezmir.",
    startedAt: now,
    completedAt: 0,
    lastRewardIntent: null,
  };
}

export function cycleDioramaLayer(state, delta) {
  if (!state?.layers?.length) return state;
  const count = state.layers.length;
  const activeLayer = (state.activeLayer + Math.sign(delta || 0) + count) % count;
  return { ...state, activeLayer };
}

export function panDiorama(state, delta) {
  if (!state?.pan) return state;
  const x = clamp(state.pan.x + Number(delta?.x || 0), -FIND_VEZMIR_PAN_BOUNDS.x, FIND_VEZMIR_PAN_BOUNDS.x);
  const y = clamp(state.pan.y + Number(delta?.y || 0), -FIND_VEZMIR_PAN_BOUNDS.y, FIND_VEZMIR_PAN_BOUNDS.y);
  return { ...state, pan: { x, y } };
}

export function resolveFindVezmirTap(state, tap, now = Date.now()) {
  if (!state || state.phase === FIND_VEZMIR_PHASES.complete) return state;

  const object = resolveTappedObject(tap);
  if (!object) {
    return applyMiss(state, "Only dust motes live there.");
  }

  if (state.foundKeys.includes(object.key)) {
    return {
      ...state,
      message: `${object.label} is already tucked into the clue tray.`,
      activeHintKey: state.activeHintKey === object.key ? "" : state.activeHintKey,
    };
  }

  if (object.key === FIND_VEZMIR_VEZMIR_KEY && !areFindVezmirCluesComplete(state)) {
    return applyMiss(state, "Vezmir is too shy until the clue tray is full.");
  }

  const foundKeys = [...state.foundKeys, object.key];
  const cluesComplete = FIND_VEZMIR_CLUE_KEYS.every((key) => foundKeys.includes(key));
  const completed = foundKeys.includes(FIND_VEZMIR_VEZMIR_KEY);
  const nextPhase = completed
    ? FIND_VEZMIR_PHASES.complete
    : cluesComplete
      ? FIND_VEZMIR_PHASES.vezmirReady
      : FIND_VEZMIR_PHASES.seeking;

  const nextState = {
    ...state,
    phase: nextPhase,
    foundKeys,
    activeHintKey: state.activeHintKey === object.key ? "" : state.activeHintKey,
    activeHintRegion: state.activeHintKey === object.key ? "" : state.activeHintRegion,
    completedAt: completed ? now : 0,
    message: getFoundMessage(object, cluesComplete, completed),
  };

  return {
    ...nextState,
    score: calculateFindVezmirScore(nextState),
  };
}

export function requestFindVezmirHint(state) {
  if (!state || state.phase === FIND_VEZMIR_PHASES.complete) return state;
  const nextTarget = getNextFindVezmirTarget(state);
  if (!nextTarget) return state;

  const nextState = {
    ...state,
    activeHintKey: nextTarget.key,
    activeHintRegion: nextTarget.region,
    hintsUsed: state.hintsUsed + 1,
    message: `A soft glimmer stirs near the ${nextTarget.region}.`,
  };

  return {
    ...nextState,
    score: calculateFindVezmirScore(nextState),
  };
}

export function getNextFindVezmirTarget(state) {
  if (!state) return null;
  const clueKey = FIND_VEZMIR_CLUE_KEYS.find((key) => !state.foundKeys.includes(key));
  if (clueKey) return FIND_VEZMIR_OBJECT_BY_KEY[clueKey];
  if (!state.foundKeys.includes(FIND_VEZMIR_VEZMIR_KEY)) return FIND_VEZMIR_OBJECT_BY_KEY[FIND_VEZMIR_VEZMIR_KEY];
  return null;
}

export function getFindVezmirTargetRows(state) {
  const foundKeys = new Set(state?.foundKeys || []);
  const cluesComplete = areFindVezmirCluesComplete(state);

  return FIND_VEZMIR_TARGET_KEYS.map((key) => {
    const object = FIND_VEZMIR_OBJECT_BY_KEY[key];
    return {
      ...object,
      found: foundKeys.has(key),
      locked: key === FIND_VEZMIR_VEZMIR_KEY && !cluesComplete,
      hinted: state?.activeHintKey === key,
    };
  });
}

export function areFindVezmirCluesComplete(state) {
  if (!state) return false;
  return FIND_VEZMIR_CLUE_KEYS.every((key) => state.foundKeys.includes(key));
}

export function hitTestFindVezmirHotspot(point) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return FIND_VEZMIR_OBJECTS.find((object) => {
    const hotspot = object.hotspot;
    return (
      x >= hotspot.x
      && x <= hotspot.x + hotspot.width
      && y >= hotspot.y
      && y <= hotspot.y + hotspot.height
    );
  }) || null;
}

export function calculateFindVezmirScore(state) {
  if (!state) return 0;
  const foundKeys = new Set(state.foundKeys || []);
  const clueCount = FIND_VEZMIR_CLUE_KEYS.filter((key) => foundKeys.has(key)).length;
  const foundVezmir = foundKeys.has(FIND_VEZMIR_VEZMIR_KEY);
  const baseScore = (clueCount * FIND_VEZMIR_SCORING.clue)
    + (foundVezmir ? FIND_VEZMIR_SCORING.vezmir : 0)
    + ((state.focus || 0) * FIND_VEZMIR_SCORING.focusBonus);
  const completionScore = foundVezmir ? FIND_VEZMIR_SCORING.completionBonus : 0;
  const cleanBonus = foundVezmir && (state.misses || 0) === 0 ? FIND_VEZMIR_SCORING.noMissBonus : 0;
  const hintBonus = foundVezmir && (state.hintsUsed || 0) === 0 ? FIND_VEZMIR_SCORING.noHintBonus : 0;
  const penalties = ((state.misses || 0) * FIND_VEZMIR_SCORING.missPenalty)
    + ((state.hintsUsed || 0) * FIND_VEZMIR_SCORING.hintPenalty);

  return Math.max(0, Math.round(baseScore + completionScore + cleanBonus + hintBonus - penalties));
}

export function buildFindVezmirRewardIntent({
  state,
  durationMs = getFindVezmirDurationMs(state),
  eventId,
  createdAt,
} = {}) {
  if (!state || state.phase !== FIND_VEZMIR_PHASES.complete) return null;

  const cleanRun = (state.misses || 0) === 0;
  const noHints = (state.hintsUsed || 0) === 0;
  const favorPreview = Math.max(4, Math.min(32, 10 + (state.focus * 3) - state.hintsUsed - state.misses));
  const items = [
    {
      key: "voidthread",
      label: "Voidthread",
      quantity: 2 + Math.max(0, state.focus),
      type: "material",
    },
    {
      key: "vezmir-field-note",
      label: "Vezmir Field Note",
      quantity: 1,
      type: "collectible",
    },
  ];

  if (cleanRun) {
    items.push({
      key: "silken-clue-thread",
      label: "Silken Clue Thread",
      quantity: 1,
      type: "material",
    });
  }

  const achievementKeys = ["found-vezmir"];
  if (cleanRun) achievementKeys.push("quiet-detective");
  if (noHints) achievementKeys.push("lantern-eyed");

  return buildRewardIntent({
    gameKey: "find-vezmir",
    eventType: "hidden-object-clear",
    eventId,
    createdAt,
    score: calculateFindVezmirScore(state),
    durationMs,
    favorPreview,
    items,
    achievementKeys,
    duplicatePolicy: DUPLICATE_POLICIES.none,
  });
}

export function markFindVezmirRewardClaimed(state, options = {}) {
  const intent = buildFindVezmirRewardIntent({ state, ...options });
  if (!intent) return state;
  return {
    ...state,
    lastRewardIntent: intent,
  };
}

export function getFindVezmirDurationMs(state, now = Date.now()) {
  if (!state?.startedAt) return 0;
  const end = state.completedAt || now;
  return Math.max(0, end - state.startedAt);
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

function resolveTappedObject(tap) {
  if (tap?.objectKey) return FIND_VEZMIR_OBJECT_BY_KEY[tap.objectKey] || null;
  return hitTestFindVezmirHotspot(tap);
}

function applyMiss(state, message) {
  const nextState = {
    ...state,
    focus: Math.max(0, state.focus - 1),
    misses: state.misses + 1,
    message,
  };

  return {
    ...nextState,
    score: calculateFindVezmirScore(nextState),
  };
}

function getFoundMessage(object, cluesComplete, completed) {
  if (completed) return "Found Vezmir. The case file is complete.";
  if (cluesComplete) return `${object.label} found. The curtain trail is ready.`;
  return `${object.label} found. The clue tray is getting warmer.`;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
