import assert from "node:assert/strict";
import test from "node:test";
import { resolvePublicProfileCosmetics, selectProfileCosmetics } from "./profileCosmeticPresentation.js";

test("selects one highest-priority frame and particle regardless of equipped count", () => {
  const cosmetics = selectProfileCosmetics([
    { charm_key: "low-frame", rarity: "uncommon", star: 3, equipped: true, effects: { profile_frame: "full-bloom" } },
    { charm_key: "mythic-frame", rarity: "mythic", star: 0, equipped: true, effects: { profile_frame: "fishpedia-frame" } },
    { charm_key: "old-particle", rarity: "rare", star: 3, equipped: true, effects: { profile_particle: "paw-trail" } },
    { charm_key: "epic-particle", rarity: "epic", star: 1, equipped: true, effects: { profile_particle: "boba-bubbles" } },
  ]);

  assert.equal(cosmetics.frame.key, "fishpedia-frame");
  assert.equal(cosmetics.frame.charm.charm_key, "mythic-frame");
  assert.equal(cosmetics.particle.key, "boba-bubbles");
  assert.equal(cosmetics.particle.charm.charm_key, "epic-particle");
});

test("ignores unequipped and unrecognized cosmetic payloads", () => {
  assert.deepEqual(selectProfileCosmetics([
    { equipped: false, effects: { profile_frame: "fishpedia-frame" } },
    { equipped: true, effects: { profile_particle: "unknown-effect" } },
  ]), { frame: null, particle: null });
});

test("resolves privacy-safe public cosmetic keys without private charm data", () => {
  const cosmetics = resolvePublicProfileCosmetics({
    profileFrame: "ascendant-forge",
    profileParticle: "forge-sparks",
  });

  assert.equal(cosmetics.frame.label, "Ascendant Forge Frame");
  assert.equal(cosmetics.frame.charm, null);
  assert.equal(cosmetics.particle.label, "Forge Sparks");
  assert.equal(cosmetics.particle.charm, null);
  assert.deepEqual(resolvePublicProfileCosmetics({ profileFrame: "unknown" }), {
    frame: null,
    particle: null,
  });
});
