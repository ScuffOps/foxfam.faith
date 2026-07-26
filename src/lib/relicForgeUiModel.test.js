import assert from "node:assert/strict";
import test from "node:test";
import {
  applyForgeReceipt,
  countCharmCopies,
  formatForgeReceipt,
  getCharmForgeEligibility,
  getNextCharmTier,
} from "./relicForgeUiModel.js";

const firstCharm = {
  id: "123e4567-e89b-42d3-a456-426614174001",
  charm_key: "ash-thread",
  charmKey: "ash-thread",
  rarity: "common",
  star: 0,
  tier: "dormant",
  equipped: false,
  source: "relic_roll",
};

const duplicateCharm = { ...firstCharm, id: "123e4567-e89b-42d3-a456-426614174002" };
const state = {
  recipes: [
    { rarity: "common", fromStar: 0, toStar: 1, tier: "awakened", favorCost: 10, materialCosts: [{ key: "star-glass", quantity: 5 }] },
    { rarity: "common", fromStar: 1, toStar: 2, tier: "exalted", favorCost: 20, materialCosts: [{ key: "moonwax", quantity: 3 }] },
    { rarity: "common", fromStar: 2, toStar: 3, tier: "ascendant", favorCost: 35, materialCosts: [{ key: "voidthread", quantity: 2 }] },
  ],
  salvageYields: [0, 1, 2, 3].map((star) => ({ rarity: "common", star, favorYield: 2 + star, materialYields: [{ key: "star-glass", quantity: 2 + star }] })),
  balances: { favor: 40, materials: [{ key: "star-glass", balance: 8 }, { key: "moonwax", balance: 3 }, { key: "voidthread", balance: 2 }] },
  charms: [firstCharm, duplicateCharm],
};

test("Forge eligibility requires canonical balances and protects final or achievement charms", () => {
  const copies = countCharmCopies(state.charms);
  const eligible = getCharmForgeEligibility({ charm: firstCharm, state, copyCounts: copies });
  assert.equal(eligible.canAfford, true);
  assert.equal(eligible.canConvert, true);

  const finalCopy = getCharmForgeEligibility({ charm: firstCharm, state: { ...state, charms: [firstCharm] }, copyCounts: countCharmCopies([firstCharm]) });
  assert.equal(finalCopy.canConvert, false);
  assert.match(finalCopy.conversionReason, /final copy/i);

  const achievement = getCharmForgeEligibility({
    charm: { ...duplicateCharm, source: { type: "achievement", key: "first-light" } },
    state,
    copyCounts: copies,
  });
  assert.equal(achievement.canConvert, false);
  assert.match(achievement.conversionReason, /permanent trophies/i);
});

test("Forge eligibility advances through exact recipes and stops at ascendant", () => {
  const copies = countCharmCopies(state.charms);
  const exalted = getCharmForgeEligibility({ charm: { ...firstCharm, star: 1, tier: "awakened" }, state, copyCounts: copies });
  assert.equal(exalted.recipe.toStar, 2);
  assert.equal(exalted.recipe.tier, "exalted");
  assert.equal(getNextCharmTier(exalted.recipe), "exalted");
  assert.equal(exalted.canAfford, true);

  const ascendant = getCharmForgeEligibility({ charm: { ...firstCharm, star: 3, tier: "ascendant" }, state, copyCounts: copies });
  assert.equal(ascendant.recipe, null);
  assert.equal(ascendant.canAfford, false);
  assert.equal(ascendant.salvage.star, 3);
});

test("Forge receipts update canonical balances and only the affected charm", () => {
  const awakened = { ...firstCharm, star: 1, tier: "awakened" };
  const upgraded = applyForgeReceipt(state, {
    operation: "upgrade",
    charm: awakened,
    favor: { delta: -10, balance: 10 },
    materials: [{ key: "star-glass", delta: -5, balance: 3 }],
  });
  assert.equal(upgraded.balances.favor, 10);
  assert.equal(upgraded.balances.materials[0].balance, 3);
  assert.equal(upgraded.charms[0].tier, "awakened");
  assert.equal(upgraded.charms.length, 2);

  const converted = applyForgeReceipt(state, {
    operation: "convert",
    convertedCharm: duplicateCharm,
    favor: { delta: 2, balance: 22 },
    materials: [{ key: "star-glass", delta: 2, balance: 10 }],
  });
  assert.equal(converted.charms.length, 1);
  assert.equal(converted.charms[0].id, firstCharm.id);
  assert.match(formatForgeReceipt({ favor: { delta: 2 }, materials: [{ key: "star-glass", delta: 2 }] }), /Star Glass/);
});
