import assert from "node:assert/strict";
import test from "node:test";
import {
  BOBA_CAFE_AUTHORED_ART_SLOT_IDS,
  BOBA_CAFE_CUSTOMER_ATLAS,
  BOBA_CAFE_DRINK_ATLAS,
  BOBA_CAFE_INGREDIENT_ATLAS,
  getBobaCafeAtlasCell,
  getBobaCafeDrinkState,
  resolveApprovedBobaCafeAuthoredArt,
} from "./bobaCafeAuthoredArt.js";

const COMPLETE_FAMILY = Object.freeze({
  "boba-cafe.customers": "approved-customers.png",
  "boba-cafe.ingredients": "approved-ingredients.png",
  "boba-cafe.drink-states": "approved-drinks.png",
});

test("Moonbrew requests only its three pending authored-art slots", () => {
  assert.deepEqual(BOBA_CAFE_AUTHORED_ART_SLOT_IDS, [
    "boba-cafe.customers",
    "boba-cafe.ingredients",
    "boba-cafe.drink-states",
  ]);
});

test("Moonbrew resolves the authored family only when all three assets are valid", () => {
  let requestedIds = null;
  const resolved = resolveApprovedBobaCafeAuthoredArt((ids) => {
    requestedIds = ids;
    return COMPLETE_FAMILY;
  });

  assert.equal(requestedIds, BOBA_CAFE_AUTHORED_ART_SLOT_IDS);
  assert.deepEqual(resolved, {
    customers: "approved-customers.png",
    ingredients: "approved-ingredients.png",
    drinkStates: "approved-drinks.png",
  });
  assert.ok(Object.isFrozen(resolved));
});

test("Moonbrew fails closed when any authored family member is missing or malformed", () => {
  for (const slotId of BOBA_CAFE_AUTHORED_ART_SLOT_IDS) {
    assert.equal(resolveApprovedBobaCafeAuthoredArt(() => ({
      ...COMPLETE_FAMILY,
      [slotId]: null,
    })), null);
  }

  assert.equal(resolveApprovedBobaCafeAuthoredArt(() => ({
    ...COMPLETE_FAMILY,
    "boba-cafe.ingredients": "   ",
  })), null);
  assert.equal(resolveApprovedBobaCafeAuthoredArt(() => null), null);
});

test("Moonbrew atlas contracts cover every current customer and selectable recipe option", () => {
  assert.deepEqual(getBobaCafeAtlasCell(BOBA_CAFE_CUSTOMER_ATLAS, "vesper-guest"), { column: 1, row: 1 });
  assert.deepEqual(getBobaCafeAtlasCell(BOBA_CAFE_INGREDIENT_ATLAS, "festival"), { column: 3, row: 3 });
  assert.deepEqual(getBobaCafeAtlasCell(BOBA_CAFE_DRINK_ATLAS, "finished"), { column: 4, row: 0 });
  assert.deepEqual(getBobaCafeAtlasCell(BOBA_CAFE_CUSTOMER_ATLAS, "unknown"), { column: 0, row: 0 });
});

test("Moonbrew drink state follows the existing five-step tray progression", () => {
  assert.equal(getBobaCafeDrinkState({}), "empty");
  assert.equal(getBobaCafeDrinkState({ tea: "black-tea" }), "tea");
  assert.equal(getBobaCafeDrinkState({ tea: "black-tea", milk: "oat-milk" }), "milk");
  assert.equal(getBobaCafeDrinkState({ tea: "black-tea", milk: "oat-milk", topping: "star-jelly" }), "topping");
  assert.equal(getBobaCafeDrinkState({ tea: "black-tea", milk: "oat-milk", topping: "star-jelly", charm: "moon-straw", sweetness: "glow" }), "finished");
});
