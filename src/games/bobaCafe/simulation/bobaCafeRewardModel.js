import { BOBA_CAFE_PHASES, createEmptyTray, createInitialBobaCafeState } from "./bobaCafeRules.js";
import { presentClaimAchievements } from "../../shared/rewards/gameRewardReceiptPresentation.js";

export function createRewardedBobaCafeState(context, previousState = null) {
  const baseState = previousState || createInitialBobaCafeState();
  const order = context?.active_order;
  const activeOrder = order?.order_key ? {
    id: `server-${context.action_index}-${context.order_index}-${order.order_key}`,
    orderIndex: context.order_index,
    key: order.order_key,
    label: order.order_label,
    customer: order.customer,
    recipe: order.recipe,
    placedAt: order.placed_at ? Date.parse(order.placed_at) : 0,
    patienceMs: order.patience_ms || 0,
  } : null;

  return {
    ...baseState,
    phase: context?.phase || BOBA_CAFE_PHASES.serving,
    orderIndex: context?.order_index || 0,
    activeOrder,
    tray: context?.tray || createEmptyTray(),
    score: context?.score || 0,
    claimedScore: 0,
    servedCount: context?.served_count || 0,
    perfectCount: context?.perfect_count || 0,
    combo: context?.combo || 0,
    bestCombo: context?.best_combo || 0,
    mistakes: context?.mistakes || 0,
    lastResult: context?.last_result ? {
      score: context.last_result.score,
      matches: context.last_result.matches,
      misses: context.last_result.misses,
      perfect: context.last_result.perfect,
      timedOut: context.last_result.timed_out,
      patiencePercent: context.last_result.patience_percent,
      message: context.last_result.message,
    } : null,
    actionIndex: context?.action_index || 0,
    deadlineAt: order?.deadline_at ? Date.parse(order.deadline_at) : 0,
    completedAt: context?.completed_at || null,
    updatedAt: context?.completed_at || order?.placed_at || baseState.updatedAt,
  };
}

export function getRewardedBobaPatiencePercent(state, now = Date.now()) {
  if (state?.phase !== BOBA_CAFE_PHASES.serving || !state?.activeOrder || !state.deadlineAt) return 0;
  const remaining = Math.max(0, state.deadlineAt - now);
  return Math.max(0, Math.min(100, Math.round((remaining / state.activeOrder.patienceMs) * 100)));
}

export function createBobaCafeReceiptIntent(receipt) {
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

function formatMaterialLabel(key) {
  return String(key || "material")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
