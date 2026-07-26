import { MATERIAL_BY_KEY } from "./gameHubCatalog.js";

export function countCharmCopies(charms = []) {
  return charms.reduce((counts, charm) => {
    const key = charm.charmKey || charm.charm_key;
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());
}

export function getCharmForgeEligibility({ charm, state, copyCounts }) {
  const charmKey = charm.charmKey || charm.charm_key;
  const sourceType = typeof charm.source === "string" ? charm.source : charm.source?.type;
  const recipe = state.recipes.find((entry) => entry.rarity === charm.rarity && entry.fromStar === charm.star) || null;
  const salvage = state.salvageYields.find((entry) => entry.rarity === charm.rarity && entry.star === charm.star) || null;
  const materialBalances = new Map(state.balances.materials.map((entry) => [entry.key, entry.balance]));
  const canAfford = Boolean(recipe)
    && state.balances.favor >= recipe.favorCost
    && recipe.materialCosts.every((cost) => (materialBalances.get(cost.key) || 0) >= cost.quantity);
  const isAchievement = sourceType === "achievement";
  const isFinalCopy = (copyCounts.get(charmKey) || 0) <= 1;
  const canConvert = Boolean(salvage) && !isAchievement && !charm.equipped && !isFinalCopy;
  let conversionReason = "One duplicate will be permanently converted.";
  if (isAchievement) conversionReason = "Achievement charms are permanent trophies.";
  else if (charm.equipped) conversionReason = "Unequip this charm before conversion.";
  else if (isFinalCopy) conversionReason = "Your final copy is protected.";
  else if (!salvage) conversionReason = "No conversion recipe is available.";

  return { recipe, salvage, canAfford, canConvert, conversionReason };
}

export const CHARM_TIER_BY_STAR = ["dormant", "awakened", "exalted", "ascendant"];

export function getNextCharmTier(recipe) {
  return recipe ? CHARM_TIER_BY_STAR[recipe.toStar] || recipe.tier : null;
}

export function applyForgeReceipt(current, receipt) {
  if (!current) return current;
  const materialBalances = new Map(current.balances.materials.map((entry) => [entry.key, entry]));
  receipt.materials.forEach((entry) => materialBalances.set(entry.key, { key: entry.key, balance: entry.balance }));
  const charms = receipt.operation === "upgrade"
    ? current.charms.map((charm) => charm.id === receipt.charm.id ? receipt.charm : charm)
    : current.charms.filter((charm) => charm.id !== receipt.convertedCharm.id);
  return {
    ...current,
    balances: { favor: receipt.favor.balance, materials: [...materialBalances.values()] },
    charms,
  };
}

export function formatForgeReceipt(receipt) {
  const favorText = receipt.favor.delta === 0
    ? "Favor unchanged"
    : `${Math.abs(receipt.favor.delta)} Favor ${receipt.favor.delta > 0 ? "returned" : "invested"}`;
  const materialText = receipt.materials
    .map((material) => `${Math.abs(material.delta)} ${MATERIAL_BY_KEY[material.key]?.label || material.key}`)
    .join(", ");
  return [favorText, materialText].filter(Boolean).join(" · ");
}
