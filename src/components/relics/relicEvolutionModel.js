const STAGE_BY_TIER = Object.freeze({
  dormant: 0,
  awakened: 1,
  exalted: 2,
  ascendant: 3,
});

const STAGE_LABELS = Object.freeze(["Dormant", "Awakened", "Exalted", "Ascendant"]);

function getCharmStage(charm = {}) {
  const tierStage = STAGE_BY_TIER[String(charm.tier || "").toLowerCase()];
  if (Number.isInteger(tierStage)) return tierStage;
  return Number.isInteger(charm.star) && charm.star >= 0 && charm.star <= 3 ? charm.star : 0;
}

export function getRelicEvolutionStage(charms = []) {
  return charms
    .filter((charm) => charm?.equipped)
    .reduce((highest, charm) => Math.max(highest, getCharmStage(charm)), 0);
}

export function getRelicEvolutionLabel(stage) {
  return STAGE_LABELS[stage] || STAGE_LABELS[0];
}
