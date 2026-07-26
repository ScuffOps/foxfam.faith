import { z } from "zod";

const safeInteger = z.number().int().safe();
const nonnegativeSafeInteger = safeInteger.nonnegative();
const materialEntrySchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  quantity: z.number().int().positive(),
}).strict();
const materialBalanceSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  balance: nonnegativeSafeInteger,
}).strict();
const materialDeltaSchema = materialBalanceSchema.extend({
  delta: safeInteger.refine((value) => value !== 0),
}).strict();
const favorResultSchema = z.object({
  delta: safeInteger,
  balance: nonnegativeSafeInteger,
}).strict();
const charmSchema = z.object({
  id: z.string().uuid(),
  charm_key: z.string().regex(/^[a-z0-9-]+$/),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "mythic"]),
  star: z.number().int().min(0).max(3),
  tier: z.enum(["dormant", "awakened", "exalted", "ascendant"]),
  equipped: z.boolean(),
  source: z.union([z.string(), z.record(z.unknown())]),
}).passthrough();
const recipeSchema = z.object({
  recipe_key: z.string().regex(/^[a-z0-9-]+$/),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "mythic"]),
  from_star: z.number().int().min(0).max(2),
  to_star: z.number().int().min(1).max(3),
  tier: z.enum(["awakened", "exalted", "ascendant"]),
  favor_cost: nonnegativeSafeInteger,
  material_costs: z.array(materialEntrySchema).min(1),
}).strict().superRefine((recipe, context) => {
  const expectedTiers = ["dormant", "awakened", "exalted", "ascendant"];
  if (recipe.to_star !== recipe.from_star + 1 || recipe.tier !== expectedTiers[recipe.to_star]) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Recipe progression is not sequential." });
  }
});
const salvageSchema = z.object({
  salvage_key: z.string().regex(/^[a-z0-9-]+$/),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "mythic"]),
  star: z.number().int().min(0).max(3),
  favor_yield: nonnegativeSafeInteger,
  material_yields: z.array(materialEntrySchema).min(1),
}).strict();

const forgeStateSchema = z.object({
  catalog_version: z.number().int().positive(),
  recipes: z.array(recipeSchema),
  salvage_yields: z.array(salvageSchema),
  balances: z.object({
    favor: nonnegativeSafeInteger,
    materials: z.array(materialBalanceSchema),
  }).strict(),
  charms: z.array(charmSchema),
}).strict();

const receiptBaseSchema = z.object({
  receipt_id: z.string().uuid(),
  request_id: z.string().uuid(),
  replayed: z.boolean(),
  favor: favorResultSchema,
  materials: z.array(materialDeltaSchema),
}).strict();
const upgradeSchema = receiptBaseSchema.extend({
  operation: z.literal("upgrade"),
  charm: charmSchema,
}).strict();
const conversionSchema = receiptBaseSchema.extend({
  operation: z.literal("convert"),
  converted_charm: charmSchema,
}).strict();

function parse(schema, value, label) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${label} returned an invalid response.`);
  }
  return result.data;
}

function normalizeCharm(charm) {
  return {
    ...charm,
    charmKey: charm.charm_key,
  };
}

export function parseRelicForgeState(value) {
  const state = parse(forgeStateSchema, value, "Relic Forge state");
  return {
    catalogVersion: state.catalog_version,
    recipes: state.recipes.map((recipe) => ({
      recipeKey: recipe.recipe_key,
      rarity: recipe.rarity,
      fromStar: recipe.from_star,
      toStar: recipe.to_star,
      tier: recipe.tier,
      favorCost: recipe.favor_cost,
      materialCosts: recipe.material_costs,
    })),
    salvageYields: state.salvage_yields.map((salvage) => ({
      salvageKey: salvage.salvage_key,
      rarity: salvage.rarity,
      star: salvage.star,
      favorYield: salvage.favor_yield,
      materialYields: salvage.material_yields,
    })),
    balances: state.balances,
    charms: state.charms.map(normalizeCharm),
  };
}

function normalizeReceipt(receipt) {
  return {
    operation: receipt.operation,
    receiptId: receipt.receipt_id,
    requestId: receipt.request_id,
    replayed: receipt.replayed,
    favor: receipt.favor,
    materials: receipt.materials,
  };
}

export function parseRelicForgeUpgrade(value) {
  const receipt = parse(upgradeSchema, value, "Relic Forge upgrade");
  return { ...normalizeReceipt(receipt), charm: normalizeCharm(receipt.charm) };
}

export function parseRelicForgeConversion(value) {
  const receipt = parse(conversionSchema, value, "Relic Forge conversion");
  return {
    ...normalizeReceipt(receipt),
    convertedCharm: normalizeCharm(receipt.converted_charm),
  };
}
