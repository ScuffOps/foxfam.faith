import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_FAMILIAR } from "./familiarCatalog.js";
import { familiarRowSchema, familiarSelectionSchema } from "./familiarSchema.js";

test("accepts the complete default familiar selection", () => {
  assert.deepEqual(familiarSelectionSchema.parse(DEFAULT_FAMILIAR), DEFAULT_FAMILIAR);
});

test("rejects unknown values in every familiar dimension", () => {
  for (const key of ["species", "coat", "markings", "outfit", "accessory", "charmFx"]) {
    assert.equal(
      familiarSelectionSchema.safeParse({ ...DEFAULT_FAMILIAR, [key]: "not-allowed" }).success,
      false,
      `${key} should be rejected`,
    );
  }
});

test("rejects a valid coat or marking used with the wrong species", () => {
  assert.equal(familiarSelectionSchema.safeParse({ ...DEFAULT_FAMILIAR, coat: "lavender" }).success, false);
  assert.equal(familiarSelectionSchema.safeParse({ ...DEFAULT_FAMILIAR, markings: "moon-brow" }).success, false);
});

test("validates persisted ownership and snake-case row fields", () => {
  const row = familiarRowSchema.parse({
    user_id: "11111111-1111-4111-8111-111111111111",
    ...DEFAULT_FAMILIAR,
    charm_fx: DEFAULT_FAMILIAR.charmFx,
    catalog_version: 1,
    created_at: "2026-07-21T12:00:00.000Z",
    updated_at: "2026-07-21T12:00:00.000Z",
  });
  assert.equal(row.user_id, "11111111-1111-4111-8111-111111111111");
});
