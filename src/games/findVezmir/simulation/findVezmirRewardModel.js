import { FIND_VEZMIR_OBJECT_BY_KEY } from "../content/hiddenObjects.js";
import { createInitialFindVezmirState, FIND_VEZMIR_PHASES } from "./findVezmirRules.js";

export function createRewardedFindVezmirState(context, previousState = null) {
  const baseState = { ...createInitialFindVezmirState(), ...(previousState || {}) };

  return {
    ...baseState,
    phase: context?.phase || FIND_VEZMIR_PHASES.seeking,
    foundKeys: context?.found_keys || [],
    activeHintKey: context?.active_hint_key || "",
    activeHintRegion: FIND_VEZMIR_OBJECT_BY_KEY[context?.active_hint_key]?.region || "",
    focus: context?.focus ?? 5,
    misses: context?.misses || 0,
    hintsUsed: context?.hints_used || 0,
    score: context?.score || 0,
    message: getAuthoritativeMessage(context, baseState.message),
    actionIndex: context?.action_index || 0,
    startedAt: context?.started_at ? Date.parse(context.started_at) : baseState.startedAt,
    completedAt: context?.completed_at ? Date.parse(context.completed_at) : 0,
    lastRewardIntent: null,
  };
}

export function createFindVezmirSearchAction(tap, activeLayer) {
  if (tap?.objectKey) {
    const object = FIND_VEZMIR_OBJECT_BY_KEY[tap.objectKey];
    if (!object || (tap.layer && tap.layer !== object.layer)) return null;
    return {
      op: "search",
      x: toServerCoordinate(object.hotspot.x + (object.hotspot.width / 2)),
      y: toServerCoordinate(object.hotspot.y + (object.hotspot.height / 2)),
      layer: object.layer,
    };
  }

  const x = Number(tap?.x);
  const y = Number(tap?.y);
  const layer = tap?.layer || activeLayer;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !layer) return null;
  if (x < 0 || x > 100 || y < 0 || y > 100) return null;

  return { op: "search", x: toServerCoordinate(x), y: toServerCoordinate(y), layer };
}

export function createFindVezmirReceiptIntent(receipt) {
  if (!receipt) return null;
  return {
    favorPreview: receipt.favor?.delta || 0,
    items: (receipt.materials || []).map((material) => ({
      key: material.key,
      label: formatMaterialLabel(material.key),
      quantity: material.delta,
      type: "material",
    })),
    achievements: (receipt.achievements || []).map((achievement) => ({
      key: achievement.key,
      title: achievement.title,
    })),
  };
}

function toServerCoordinate(value) {
  return Math.round(value * 10);
}

function getAuthoritativeMessage(context, fallback) {
  if (context?.phase === FIND_VEZMIR_PHASES.complete) return "Found Vezmir. The case file is complete.";
  if (context?.active_hint_key) {
    const region = FIND_VEZMIR_OBJECT_BY_KEY[context.active_hint_key]?.region || "cloister";
    return `A soft glimmer stirs near the ${region}.`;
  }
  if ((context?.found_keys || []).length === 5) return "The clue tray is full. Vezmir is ready to be found.";
  if ((context?.found_keys || []).length) return "Clue found. The tray is getting warmer.";
  return fallback;
}

function formatMaterialLabel(key) {
  return String(key || "material")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
