import { STARFISHING_FISH } from "../../games/starfishing/content/fishCatalog.js";

const ACHIEVEMENT_TITLES = {
  "first-light": "First Light",
  "gentle-return": "Gentle Return",
  "pocket-constellation": "Pocket Constellation",
  "myth-in-moonwater": "Myth in Moonwater",
  "celestial-archivist": "Celestial Archivist",
  "hundred-lights": "Hundred Lights",
};

const BONUS_LABELS = {
  favor_multiplier_bps: "Favor",
  material_multiplier_bps: "forge materials",
  rare_bite_bonus_bps: "rare bite chance",
  size_floor_bps: "minimum catch size",
};

function humanizeKey(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() || ""}${word.slice(1)}`)
    .join(" ");
}

function getTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function formatBasisPointBonus(value, label) {
  const basisPoints = Number(value);
  if (!Number.isFinite(basisPoints) || basisPoints <= 0) return "";
  const percent = basisPoints / 100;
  return `+${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}% ${label}`;
}

function getFishingBonuses(charms) {
  return charms.flatMap((charm) => {
    if (!charm?.equipped || charm.slot !== "fishing") return [];
    const effect = Object.entries(charm.effects || {})
      .find(([key, value]) => BONUS_LABELS[key] && Number(value) > 0);
    if (!effect) return [];
    const [key, value] = effect;
    return [{
      charmId: charm.id || charm.instance_id || charm.charm_key,
      charmName: charm.name || humanizeKey(charm.charm_key),
      effectKey: key,
      value,
      label: formatBasisPointBonus(value, BONUS_LABELS[key]),
    }];
  });
}

export function getStarfishingProgressModel({
  progression = {},
  charms = [],
  catalogTotal = STARFISHING_FISH.length,
} = {}) {
  const fishpedia = Array.isArray(progression.fishpedia) ? progression.fishpedia : [];
  const achievements = Array.isArray(progression.achievements) ? progression.achievements : [];
  const trophies = Array.isArray(progression.trophies) ? progression.trophies : [];
  const safeCatalogTotal = Math.max(0, Number(catalogTotal) || 0);
  const discoveredKeys = new Set(
    fishpedia
      .filter((row) => Number(row?.caughtCount) > 0 && row?.fishKey)
      .map((row) => row.fishKey),
  );
  const discoveredCount = Math.min(discoveredKeys.size, safeCatalogTotal);
  const profileFrame = charms.find((charm) => (
    charm?.equipped
    && charm.slot === "profile-frame"
    && typeof charm.effects?.profile_frame === "string"
  )) || null;
  const selectedTrophyRow = [...trophies]
    .sort((left, right) => getTimestamp(right?.acquiredAt) - getTimestamp(left?.acquiredAt))[0] || null;

  return {
    discoveredCount,
    totalCount: safeCatalogTotal,
    completionPercent: safeCatalogTotal
      ? Math.round((discoveredCount / safeCatalogTotal) * 100)
      : 0,
    recentAchievements: [...achievements]
      .sort((left, right) => getTimestamp(right?.unlockedAt) - getTimestamp(left?.unlockedAt))
      .slice(0, 3)
      .map((achievement) => ({
        ...achievement,
        title: ACHIEVEMENT_TITLES[achievement.achievementKey] || humanizeKey(achievement.achievementKey),
      })),
    fishingBonuses: getFishingBonuses(Array.isArray(charms) ? charms : []),
    profileFrame,
    selectedTrophy: selectedTrophyRow ? {
      ...selectedTrophyRow,
      title: selectedTrophyRow.data?.label
        || selectedTrophyRow.data?.title
        || ACHIEVEMENT_TITLES[selectedTrophyRow.sourceAchievementKey]
        || humanizeKey(selectedTrophyRow.trophyKey),
    } : null,
    isEmpty: discoveredCount === 0 && achievements.length === 0 && trophies.length === 0,
  };
}
