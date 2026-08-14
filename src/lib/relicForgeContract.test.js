import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  parseRelicForgeConversion,
  parseRelicForgeState,
  parseRelicForgeUpgrade,
} from "./relicForgeContract.js";

const charmId = "123e4567-e89b-42d3-a456-426614174001";
const requestId = "123e4567-e89b-42d3-a456-426614174002";
const receiptId = "123e4567-e89b-42d3-a456-426614174003";
const progressionMigration = readFileSync(
  new URL("../../supabase/migrations/20260721_add_relic_charm_progression.sql", import.meta.url),
  "utf8",
);
const forgeSource = readFileSync(new URL("../pages/RelicForge.jsx", import.meta.url), "utf8");

test("Forge migration catalogs every rarity for all upgrade and salvage stars", () => {
  for (const rarity of ["common", "uncommon", "rare", "epic", "mythic"]) {
    assert.match(progressionMigration, new RegExp(`'one-star-${rarity}'.*'${rarity}', 0, 1, 'awakened'`));
    assert.match(progressionMigration, new RegExp(`'two-star-${rarity}'.*'${rarity}', 1, 2, 'exalted'`));
    assert.match(progressionMigration, new RegExp(`'three-star-${rarity}'.*'${rarity}', 2, 3, 'ascendant'`));
    for (const star of [0, 1, 2, 3]) {
      assert.match(progressionMigration, new RegExp(`'${rarity}-star-${star}'.*'${rarity}', ${star},`));
    }
  }
  assert.match(progressionMigration, /to_star = from_star \+ 1/);
  assert.match(progressionMigration, /star between 0 and 3/);
});

test("Forge state accepts canonical recipes, balances, and owned charm progression", () => {
  const result = parseRelicForgeState({
    catalog_version: 2,
    recipes: [
      { recipe_key: "one-star-common", rarity: "common", from_star: 0, to_star: 1, tier: "awakened", favor_cost: 10, material_costs: [{ key: "star-glass", quantity: 5 }] },
      { recipe_key: "two-star-common", rarity: "common", from_star: 1, to_star: 2, tier: "exalted", favor_cost: 20, material_costs: [{ key: "moonwax", quantity: 3 }] },
      { recipe_key: "three-star-common", rarity: "common", from_star: 2, to_star: 3, tier: "ascendant", favor_cost: 35, material_costs: [{ key: "voidthread", quantity: 2 }] },
    ],
    salvage_yields: [0, 1, 2, 3].map((star) => ({ salvage_key: `common-star-${star}`, rarity: "common", star, favor_yield: 2 + star, material_yields: [{ key: "star-glass", quantity: 2 + star }] })),
    balances: { favor: 42, materials: [{ key: "star-glass", balance: 12 }] },
    charms: [{ id: charmId, charm_key: "ash-thread", rarity: "common", star: 3, tier: "ascendant", equipped: false, source: "relic_roll" }],
  });

  assert.equal(result.catalogVersion, 2);
  assert.equal(result.recipes[0].favorCost, 10);
  assert.equal(result.recipes[2].tier, "ascendant");
  assert.deepEqual(result.salvageYields.map(({ star }) => star), [0, 1, 2, 3]);
  assert.equal(result.charms[0].id, charmId);
  assert.equal(result.charms[0].star, 3);
  assert.equal(result.balances.materials[0].balance, 12);
});

test("Upgrade and conversion receipts normalize authoritative snapshots", () => {
  const upgrade = parseRelicForgeUpgrade({
    operation: "upgrade",
    receipt_id: receiptId,
    request_id: requestId,
    replayed: false,
    charm: { id: charmId, charm_key: "ash-thread", rarity: "common", star: 1, tier: "awakened", equipped: false, source: "relic_roll" },
    favor: { delta: -10, balance: 32 },
    materials: [{ key: "star-glass", delta: -5, balance: 7 }],
  });
  const conversion = parseRelicForgeConversion({
    operation: "convert",
    receipt_id: receiptId,
    request_id: requestId,
    replayed: true,
    converted_charm: { id: charmId, charm_key: "ash-thread", rarity: "common", star: 0, tier: "dormant", equipped: false, source: "relic_roll" },
    favor: { delta: 2, balance: 44 },
    materials: [{ key: "star-glass", delta: 2, balance: 14 }],
  });

  assert.equal(upgrade.charm.star, 1);
  assert.equal(upgrade.favor.delta, -10);
  assert.equal(conversion.replayed, true);
  assert.equal(conversion.convertedCharm.id, charmId);
});

test("Forge contract rejects unsafe or malformed authoritative responses", () => {
  assert.throws(() => parseRelicForgeState({ catalog_version: 0 }), /invalid/i);
  assert.throws(() => parseRelicForgeUpgrade({ operation: "convert" }), /invalid/i);
  assert.throws(() => parseRelicForgeConversion({ operation: "upgrade" }), /invalid/i);
  assert.throws(() => parseRelicForgeState({
    catalog_version: 2,
    recipes: [{ recipe_key: "bad-jump", rarity: "common", from_star: 0, to_star: 2, tier: "exalted", favor_cost: 10, material_costs: [{ key: "star-glass", quantity: 1 }] }],
    salvage_yields: [],
    balances: { favor: 0, materials: [] },
    charms: [],
  }), /invalid/i);
  assert.throws(() => parseRelicForgeUpgrade({
    operation: "upgrade",
    receipt_id: receiptId,
    request_id: requestId,
    replayed: false,
    charm: { id: charmId, charm_key: "ash-thread", rarity: "common", star: 4, tier: "ascendant", equipped: false, source: "relic_roll" },
    favor: { delta: -1, balance: 0 },
    materials: [],
  }), /invalid/i);
});

test("Forge load failures expose the correct recovery action and labeled fields", () => {
  assert.match(forgeSource, /user: authUser/);
  assert.match(forgeSource, /const ownerId = isAuthenticated && authUser\?\.id \? authUser\.id : ""/);
  assert.match(forgeSource, /isAuthenticated \|\| isLoadingAuth \? \(/);
  assert.match(forgeSource, /<RefreshCw[^>]*\/> Retry/);
  assert.match(forgeSource, /<label[^>]+htmlFor="relic-name"/);
  assert.match(forgeSource, /<Input id="relic-name"/);
  assert.match(forgeSource, /<label[^>]+htmlFor="relic-lore"/);
  assert.match(forgeSource, /<Textarea id="relic-lore"/);
});
