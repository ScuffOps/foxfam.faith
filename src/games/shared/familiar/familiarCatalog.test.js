import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_FAMILIAR, FAMILIAR_SPECIES, normalizeFamiliarSelection } from "./familiarCatalog.js";

test("normalizes an invalid selection to the cream fox-cat default", () => {
  assert.deepEqual(normalizeFamiliarSelection({ species: "dragon" }), DEFAULT_FAMILIAR);
});

test("every species exposes required layer slots", () => {
  for (const species of Object.values(FAMILIAR_SPECIES)) {
    assert.deepEqual(species.layers, ["body", "markings", "outfit", "accessory", "charmFx"]);
    assert.ok(species.coats.length > 0);
    assert.ok(species.markings.length > 0);
  }
});

test("normalizes invalid options within a valid species", () => {
  const selection = normalizeFamiliarSelection({ species: "moon-rabbit", coat: "lava", markings: "none" });
  assert.equal(selection.species, "moon-rabbit");
  assert.equal(selection.coat, FAMILIAR_SPECIES["moon-rabbit"].coats[0]);
  assert.equal(selection.markings, "none");
});
