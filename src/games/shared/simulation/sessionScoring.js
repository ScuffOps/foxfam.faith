export const SESSION_RANKS = [
  { key: "mythic", label: "Mythic", minScore: 900 },
  { key: "gold", label: "Gold", minScore: 650 },
  { key: "silver", label: "Silver", minScore: 375 },
  { key: "bronze", label: "Bronze", minScore: 125 },
  { key: "soft", label: "Soft Start", minScore: 0 },
];

export function getSessionRank(score = 0) {
  const safeScore = Math.max(0, Number(score) || 0);
  return SESSION_RANKS.find((rank) => safeScore >= rank.minScore) || SESSION_RANKS.at(-1);
}

export function clampRewardPreview(value, max) {
  const safeValue = Math.max(0, Number(value) || 0);
  return Math.min(safeValue, Math.max(0, Number(max) || 0));
}
