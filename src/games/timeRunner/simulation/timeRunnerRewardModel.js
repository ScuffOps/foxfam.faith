import {
  createInitialTimeRunnerState,
  TIME_RUNNER_PHASES,
  TIME_RUNNER_POSTURES,
  TIME_RUNNER_RUN_MS,
} from "./timeRunnerRules.js";
import { presentClaimAchievements } from "../../shared/rewards/gameRewardReceiptPresentation.js";

const HAZARD_APPROACH_PER_SECOND = 20;
const HAZARD_VISIBLE_BEHIND_MS = 1200;
const HAZARD_VISIBLE_AHEAD_MS = 4200;
const ACTION_WINDOW_MS = 800;

export function createRewardedTimeRunnerState(context, {
  now = Date.now(),
  previousState = null,
} = {}) {
  const baseState = previousState || createInitialTimeRunnerState({ now });
  const startedAt = context?.started_at ? Date.parse(context.started_at) : now;
  const elapsedMs = context?.phase === "running"
    ? Math.min(TIME_RUNNER_RUN_MS, Math.max(context?.elapsed_ms || 0, now - startedAt))
    : (context?.elapsed_ms || 0);
  const phase = context?.phase === "running"
    ? TIME_RUNNER_PHASES.running
    : TIME_RUNNER_PHASES.finished;

  return {
    ...baseState,
    phase,
    seed: baseState.seed,
    runStartedAt: startedAt,
    elapsedMs,
    hazards: projectHazards(context?.layout || [], elapsedMs),
    health: Math.max(0, 3 - (context?.falls || 0)),
    clockShards: context?.clock_shards || 0,
    combo: context?.combo || 0,
    bestCombo: context?.best_combo || 0,
    focus: context?.focus || 0,
    routeStep: context?.route_step || 0,
    availableLandings: (context?.available_landings || []).map((landing) => ({
      id: landing.id,
      kind: landing.kind,
      label: landing.label,
    })),
    score: context?.score || 0,
    completed: context?.phase === "complete",
    finishReason: context?.phase === "complete" ? "tower-cleared" : context?.phase === "failed" ? "clock-fractured" : "",
    actionIndex: context?.action_index || 0,
    completedAt: context?.completed_at ? Date.parse(context.completed_at) : 0,
  };
}

export function findTimeRunnerHazardAction(context, op, now = Date.now()) {
  if (!["jump", "duck"].includes(op) || context?.phase !== "running") return null;
  const startedAt = context?.started_at ? Date.parse(context.started_at) : now;
  const elapsedMs = Math.min(TIME_RUNNER_RUN_MS, Math.max(0, now - startedAt));
  const requiredOp = op;
  const candidates = (context?.layout || [])
    .filter((hazard) => !hazard.resolved && hazard.required_op === requiredOp)
    .map((hazard) => ({ hazard, distance: Math.abs(hazard.at_ms - elapsedMs) }))
    .filter(({ distance }) => distance <= ACTION_WINDOW_MS)
    .sort((left, right) => left.distance - right.distance);
  if (!candidates.length) return null;
  return { op, hazard_id: candidates[0].hazard.id };
}

export function createTimeRunnerReceiptIntent(receipt) {
  if (!receipt) return null;
  return {
    favorPreview: receipt.favor?.delta || 0,
    items: (receipt.materials || []).map((material) => ({
      key: material.key,
      label: formatMaterialLabel(material.key),
      quantity: material.delta,
      type: "material",
    })),
    achievements: presentClaimAchievements(receipt),
  };
}

export function applyRewardedPosture(state, op, now = Date.now()) {
  const postureByOp = {
    jump: TIME_RUNNER_POSTURES.jump,
    duck: TIME_RUNNER_POSTURES.duck,
    focus: TIME_RUNNER_POSTURES.focus,
    land: TIME_RUNNER_POSTURES.jump,
  };
  const posture = postureByOp[op];
  if (!posture) return state;
  return {
    ...state,
    posture,
    postureUntil: now + (op === "duck" ? 560 : op === "focus" ? 420 : 680),
  };
}

function projectHazards(layout, elapsedMs) {
  return layout
    .filter((hazard) => !hazard.resolved)
    .filter((hazard) => hazard.at_ms >= elapsedMs - HAZARD_VISIBLE_BEHIND_MS)
    .filter((hazard) => hazard.at_ms <= elapsedMs + HAZARD_VISIBLE_AHEAD_MS)
    .map((hazard) => ({
      id: hazard.id,
      kind: hazard.kind,
      requiredPosture: hazard.required_op,
      resolved: hazard.resolved,
      x: 18 + ((hazard.at_ms - elapsedMs) / 1000) * HAZARD_APPROACH_PER_SECOND,
    }));
}

function formatMaterialLabel(key) {
  return String(key || "material")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
