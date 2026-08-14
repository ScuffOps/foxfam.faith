const GAME_BY_ACHIEVEMENT_PREFIX = Object.freeze([
  ["boba-cafe-", "Boba Cafe"],
  ["find-vezmir-", "Find Vezmir"],
  ["word-garden-", "Word Garden"],
]);

const GAME_BY_ACHIEVEMENT_KEY = Object.freeze({
  "first-merge": "Match & Merge",
  "quiet-chain": "Match & Merge",
  "sigil-shaper": "Match & Merge",
  "clocktower-clear": "Time Runner",
  "shard-sprinter": "Time Runner",
  "unfractured-loop": "Time Runner",
  "quarters-first-temper": "Relic Forge",
  "quarters-first-transmutation": "Relic Forge",
  "quarters-ascendant-charm": "Relic Forge",
});

export const TROPHY_CATALOG = Object.freeze([
  "first-light",
  "pocket-constellation",
  "celestial-archivist",
  "first-refinement",
  "quiet-chain",
  "sigil-shaper",
  "first-service",
  "perfect-pour",
  "rush-hour-ribbon",
  "spotless-shift",
  "vezmir-found",
  "quiet-detective",
  "lantern-eyed",
  "clocktower-clear",
  "shard-sprinter",
  "unfractured-loop",
  "first-sprout",
  "full-bloom",
  "first-temper",
  "kindly-transmuted",
  "ascendant-hand",
]);

function titleFromKey(value) {
  return String(value || "Unknown keepsake")
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getGameLabel(achievementKey) {
  if (!achievementKey) return "Priory";
  if (GAME_BY_ACHIEVEMENT_KEY[achievementKey]) return GAME_BY_ACHIEVEMENT_KEY[achievementKey];
  return GAME_BY_ACHIEVEMENT_PREFIX.find(([prefix]) => achievementKey.startsWith(prefix))?.[1] || "Starfishing";
}

function formatAcquiredDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function getAchievementPresentation(achievement = {}) {
  const achievementKey = achievement.achievementKey || achievement.achievement_key || null;
  const sourceRewardEventId = achievement.sourceRewardEventId || achievement.source_reward_event_id;
  const sourceCatchId = achievement.sourceCatchId || achievement.source_catch_id;
  return {
    title: titleFromKey(achievementKey),
    gameLabel: getGameLabel(achievementKey),
    unlockedLabel: formatAcquiredDate(achievement.unlockedAt || achievement.unlocked_at),
    provenanceLabel: sourceRewardEventId
      ? "Validated game reward"
      : sourceCatchId
        ? "Starfishing catch"
        : "Priory milestone",
  };
}

export function getTrophyPresentation(trophy = {}) {
  const achievementKey = trophy.sourceAchievementKey || null;
  return {
    title: trophy.title || trophy.data?.title || trophy.data?.label || titleFromKey(trophy.trophyKey),
    gameLabel: getGameLabel(achievementKey),
    achievementLabel: achievementKey ? titleFromKey(achievementKey) : "Priory milestone",
    acquiredLabel: formatAcquiredDate(trophy.acquiredAt),
  };
}
