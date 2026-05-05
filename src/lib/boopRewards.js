export const BOOP_REWARDS = [
  { count: 1, points: 1, label: "First boop" },
  { count: 3, points: 1, label: "Triple tap" },
  { count: 5, points: 3, label: "Snoot sparkle" },
  { count: 7, points: 3, label: "Lucky fox" },
  { count: 11, points: 5, label: "Fox frenzy" },
  { count: 15, points: 5, label: "Boop devotion" },
  { count: 21, points: 7, label: "Moonlit mischief" },
  { count: 31, points: 11, label: "Snoot legend" },
];

export function getBoopReward(count) {
  const safeCount = Number(count) || 0;
  if (safeCount % 2 === 0) return null;
  return BOOP_REWARDS.find((reward) => reward.count === safeCount) || null;
}
