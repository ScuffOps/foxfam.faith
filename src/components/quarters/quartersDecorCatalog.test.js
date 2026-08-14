import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_QUARTERS_DECOR,
  QUARTERS_DECOR_SLOTS,
  decorLayoutFromRow,
  decorRowFromLayout,
  normalizeQuartersDecor,
  quartersDecorLayoutSchema,
} from "./quartersDecorCatalog.js";

test("quarters decor catalog defines four stable slots with unique choices", () => {
    assert.deepEqual(QUARTERS_DECOR_SLOTS.map((slot) => slot.key), ["rug", "wall", "shelf", "nook"]);
    for (const slot of QUARTERS_DECOR_SLOTS) {
      assert.equal(new Set(slot.options.map((option) => option.key)).size, slot.options.length);
      assert.ok(slot.options.length >= 3);
    }
});

test("quarters decor catalog falls back safely when stored decor is invalid", () => {
  assert.deepEqual(normalizeQuartersDecor({ rug: "outside-catalog" }), DEFAULT_QUARTERS_DECOR);
  assert.throws(() => quartersDecorLayoutSchema.parse({ ...DEFAULT_QUARTERS_DECOR, wall: "bad" }));
});

test("quarters decor catalog maps validated layouts to storage rows and back", () => {
  const row = decorRowFromLayout(DEFAULT_QUARTERS_DECOR);
  assert.deepEqual(row, {
      rug_key: "moonweave-rug",
      wall_key: "crescent-banner",
      shelf_key: "star-lantern",
      nook_key: "moon-cushion",
  });
  assert.deepEqual(decorLayoutFromRow({
    user_id: "11111111-1111-4111-8111-111111111111",
    ...row,
  }), DEFAULT_QUARTERS_DECOR);
});
