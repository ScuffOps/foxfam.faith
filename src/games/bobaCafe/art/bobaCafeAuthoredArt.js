import { getApprovedGameArtFamily } from "../../shared/art/gameArtManifest.js";

export const BOBA_CAFE_AUTHORED_ART_SLOT_IDS = Object.freeze([
  "boba-cafe.customers",
  "boba-cafe.ingredients",
  "boba-cafe.drink-states",
]);

export const BOBA_CAFE_CUSTOMER_ATLAS = createAtlas(3, 2, [
  "choir-helper",
  "library-visitor",
  "courtyard-runner",
  "relic-polisher",
  "vesper-guest",
]);

export const BOBA_CAFE_INGREDIENT_ATLAS = createAtlas(5, 4, [
  "jasmine-tea",
  "black-tea",
  "taro-tea",
  "matcha-tea",
  "oat-milk",
  "cream-cloud",
  "strawberry-milk",
  "cocoa-milk",
  "brown-sugar-pearls",
  "star-jelly",
  "pudding-cubes",
  "crystal-boba",
  "fox-lid",
  "moon-straw",
  "ribbon-seal",
  "lantern-pick",
  "soft",
  "glow",
  "festival",
]);

export const BOBA_CAFE_DRINK_ATLAS = createAtlas(5, 1, [
  "empty",
  "tea",
  "milk",
  "topping",
  "finished",
]);

export function resolveApprovedBobaCafeAuthoredArt(
  resolveFamily = getApprovedGameArtFamily,
) {
  const family = resolveFamily(BOBA_CAFE_AUTHORED_ART_SLOT_IDS);
  const customers = family?.["boba-cafe.customers"];
  const ingredients = family?.["boba-cafe.ingredients"];
  const drinkStates = family?.["boba-cafe.drink-states"];

  if (![customers, ingredients, drinkStates].every(isAssetPath)) return null;

  return Object.freeze({ customers, ingredients, drinkStates });
}

export function getBobaCafeAtlasCell(atlas, key) {
  return atlas.cells[key] || atlas.cells[atlas.fallbackKey];
}

export function getBobaCafeDrinkState(tray = {}) {
  if (!tray.tea) return "empty";
  if (!tray.milk) return "tea";
  if (!tray.topping) return "milk";
  if (!tray.charm || !tray.sweetness) return "topping";
  return "finished";
}

function createAtlas(columns, rows, keys) {
  const cells = Object.fromEntries(keys.map((key, index) => [
    key,
    Object.freeze({ column: index % columns, row: Math.floor(index / columns) }),
  ]));

  return Object.freeze({
    columns,
    rows,
    fallbackKey: keys[0],
    cells: Object.freeze(cells),
  });
}

function isAssetPath(value) {
  return typeof value === "string" && value.trim().length > 0;
}
