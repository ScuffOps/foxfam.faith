import { createInitialMatchMergeState, createMatchMergeTile } from "./matchMergeRules.js";
import { presentClaimAchievements } from "../../shared/rewards/gameRewardReceiptPresentation.js";

export function createRewardedMatchMergeState(context, previousState = null) {
  const baseState = previousState || createInitialMatchMergeState();
  const actionIndex = context?.action_index || 0;
  const grid = (context?.grid || []).map((tier, index) => (
    tier > 0 ? createMatchMergeTile(tier, `server-${actionIndex}-${index}-${tier}`) : null
  ));

  return {
    ...baseState,
    grid,
    selectedIndex: null,
    score: context?.score || 0,
    claimedScore: 0,
    moves: context?.moves || 0,
    highestTier: context?.highest_tier || 1,
    mergeStreak: context?.merge_streak || 0,
    bestChain: context?.best_chain || 0,
    lastMergeAt: context?.last_merge_at ? Date.parse(context.last_merge_at) : 0,
    actionIndex,
    updatedAt: context?.last_merge_at || baseState.updatedAt,
  };
}

export function canRequestMatchMerge(grid, fromIndex, toIndex) {
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return false;
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= 16 || toIndex >= 16) return false;

  const fromTile = grid?.[fromIndex];
  const toTile = grid?.[toIndex];
  if (!fromTile || !toTile || fromTile.tier !== toTile.tier || fromTile.tier >= 5) return false;

  const sameRow = Math.floor(fromIndex / 4) === Math.floor(toIndex / 4);
  return (sameRow && Math.abs(fromIndex - toIndex) === 1) || Math.abs(fromIndex - toIndex) === 4;
}

export function createMatchMergeReceiptIntent(receipt) {
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
