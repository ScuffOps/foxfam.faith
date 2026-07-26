import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_FAMILIAR,
  FAMILIAR_ACCESSORIES,
  FAMILIAR_CHARM_FX,
  FAMILIAR_OUTFITS,
  FAMILIAR_SPECIES,
  normalizeFamiliarSelection,
} from "./familiarCatalog.js";

test("normalizes an invalid selection to the cream fox-cat default", () => {
  assert.deepEqual(normalizeFamiliarSelection({ species: "dragon" }), DEFAULT_FAMILIAR);
});

test("every species exposes required layer slots", () => {
  assert.equal(Object.keys(FAMILIAR_SPECIES).length, 6);
  for (const species of Object.values(FAMILIAR_SPECIES)) {
    assert.deepEqual(species.layers, ["body", "markings", "outfit", "accessory", "charmFx"]);
    assert.match(species.asset, /^\/assets\/familiars\/.+\.png$/);
    assert.ok(species.coats.length > 0);
    assert.ok(species.markings.length > 0);
  }
});

test("normalizes invalid options within a valid species", () => {
  const selection = normalizeFamiliarSelection({
    species: "moon-rabbit",
    coat: "lava",
    markings: "none",
    outfit: "unknown",
    accessory: "unknown",
    charmFx: "unknown",
  });
  assert.equal(selection.species, "moon-rabbit");
  assert.equal(selection.coat, FAMILIAR_SPECIES["moon-rabbit"].coats[0]);
  assert.equal(selection.markings, "none");
  assert.equal(selection.outfit, "none");
  assert.equal(selection.accessory, "none");
  assert.equal(selection.charmFx, "none");
});

test("all customizable dimensions expose finite allowlists", () => {
  assert.ok(Object.keys(FAMILIAR_OUTFITS).length >= 3);
  assert.ok(Object.keys(FAMILIAR_ACCESSORIES).length >= 3);
  assert.ok(Object.keys(FAMILIAR_CHARM_FX).length >= 3);
});
