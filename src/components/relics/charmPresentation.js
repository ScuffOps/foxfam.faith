const TIER_LABELS = Object.freeze({
  dormant: "Dormant",
  awakened: "Awakened",
  exalted: "Exalted",
  ascendant: "Ascendant",
});

const GAME_LABEL_BY_CHARM = Object.freeze({
  "starlit-bobber": "Starfishing",
  "merciful-tide": "Starfishing",
  "pocket-star": "Starfishing",
  "glassfin-comet": "Starfishing",
  "fishpedia-frame": "Starfishing",
  "century-chain": "Starfishing",
  "refinement-seal": "Match & Merge",
  "shapers-knot": "Match & Merge",
  "first-service-ribbon": "Boba Cafe",
  "spotless-tea-bell": "Boba Cafe",
  "vezmir-trail-pin": "Find Vezmir",
  "lantern-eyed-lens": "Find Vezmir",
  "clockface-shard": "Time Runner",
  "unfractured-loop": "Time Runner",
  "blooming-ink-sprout": "Word Garden",
  "full-bloom-quill": "Word Garden",
  "hearthforged-seal": "Relic Forge",
  "ascendant-anvil": "Relic Forge",
});

function formatBasisPoints(value) {
  const percentage = Number(value) / 100;
  if (!Number.isFinite(percentage)) return null;
  return Number.isInteger(percentage) ? `${percentage}%` : `${percentage.toFixed(1)}%`;
}

export function getCharmPresentation(charm = {}) {
  const star = Number.isInteger(charm.star) && charm.star >= 0 && charm.star <= 3 ? charm.star : 0;
  const tier = TIER_LABELS[charm.tier] || TIER_LABELS.dormant;
  const sourceType = typeof charm.source === "string" ? charm.source : charm.source?.type;
  const gameLabel = GAME_LABEL_BY_CHARM[charm.charmKey || charm.charm_key || charm.key] || null;
  const provenance = sourceType === "achievement"
    ? `${gameLabel || "Portal"} achievement`
    : sourceType === "relic_roll"
      ? "Relic roll"
      : "Legacy collection";
  const effects = charm.effects && typeof charm.effects === "object" && !Array.isArray(charm.effects)
    ? charm.effects
    : {};
  const effectLabels = [];
  const favorBonus = formatBasisPoints(effects.favor_multiplier_bps);
  const rareBiteBonus = formatBasisPoints(effects.rare_bite_bonus_bps);
  const materialBonus = formatBasisPoints(effects.material_multiplier_bps);
  const gameFavorBonus = formatBasisPoints(effects.game_favor_multiplier_bps);
  const gameMaterialBonus = formatBasisPoints(effects.game_material_multiplier_bps);

  if (favorBonus) effectLabels.push(`+${favorBonus} Favor`);
  if (rareBiteBonus) effectLabels.push(`+${rareBiteBonus} rare bites`);
  if (materialBonus) effectLabels.push(`+${materialBonus} materials`);
  if (gameFavorBonus) effectLabels.push(`+${gameFavorBonus} minigame Favor`);
  if (gameMaterialBonus) effectLabels.push(`+${gameMaterialBonus} minigame materials`);
  if (typeof effects.catch_effect === "string") effectLabels.push("Fishing FX");
  if (typeof effects.profile_particle === "string") effectLabels.push("Profile FX");
  if (typeof effects.profile_frame === "string") effectLabels.push("Profile frame");

  return { star, tier, provenance, gameLabel, effectLabels };
}

export function matchesCharmShelfFilters(charm = {}, { query = "", view = "all" } = {}) {
  const presentation = getCharmPresentation(charm);
  const sourceType = typeof charm.source === "string" ? charm.source : charm.source?.type;
  if (view === "equipped" && !charm.equipped) return false;
  if (view === "trophies" && sourceType !== "achievement" && charm.kind !== "achievement") return false;

  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    charm.name,
    charm.slot,
    charm.rarity,
    charm.description,
    charm.flavor_text,
    presentation.tier,
    presentation.provenance,
    presentation.gameLabel,
    ...presentation.effectLabels,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}
