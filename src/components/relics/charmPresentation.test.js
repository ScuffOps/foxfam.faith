import assert from "node:assert/strict";
import test from "node:test";
import { getCharmPresentation, matchesCharmShelfFilters } from "./charmPresentation.js";

test("presents forged tiers, stars, game provenance, and passive effects", () => {
  assert.deepEqual(getCharmPresentation({
    charm_key: "glassfin-comet",
    star: 3,
    tier: "ascendant",
    source: { type: "achievement", key: "myth-in-moonwater" },
    effects: { rare_bite_bonus_bps: 300 },
  }), {
    star: 3,
    tier: "Ascendant",
    provenance: "Starfishing achievement",
    gameLabel: "Starfishing",
    effectLabels: ["+3% rare bites"],
  });
});

test("recognizes game provenance on the Forge RPC charm shape", () => {
  const presentation = getCharmPresentation({
    charmKey: "full-bloom-quill",
    source: { type: "achievement", key: "word-garden-full-bloom" },
  });

  assert.equal(presentation.gameLabel, "Word Garden");
  assert.equal(presentation.provenance, "Word Garden achievement");
});

test("keeps rolled and legacy charms honest without inventing effects", () => {
  assert.deepEqual(getCharmPresentation({ star: 9, tier: "unknown", source: "relic_roll" }), {
    star: 0,
    tier: "Dormant",
    provenance: "Relic roll",
    gameLabel: null,
    effectLabels: [],
  });
  assert.equal(getCharmPresentation({ source: "import" }).provenance, "Legacy collection");
});

test("filters the shelf by equipment, trophy provenance, and player-facing metadata", () => {
  const achievement = {
    charm_key: "spotless-tea-bell",
    name: "Spotless Tea Bell",
    rarity: "epic",
    slot: "bell",
    kind: "achievement",
    source: { type: "achievement", key: "perfect-shift" },
    tier: "exalted",
    effects: { profile_particle: "boba-bubbles" },
    equipped: true,
  };

  assert.equal(matchesCharmShelfFilters(achievement, { view: "equipped" }), true);
  assert.equal(matchesCharmShelfFilters(achievement, { view: "trophies" }), true);
  assert.equal(matchesCharmShelfFilters(achievement, { query: "Boba Cafe" }), true);
  assert.equal(matchesCharmShelfFilters(achievement, { query: "Profile FX" }), true);
  assert.equal(matchesCharmShelfFilters(achievement, { query: "Exalted" }), true);
  assert.equal(matchesCharmShelfFilters({ ...achievement, equipped: false }, { view: "equipped" }), false);
  assert.equal(matchesCharmShelfFilters({ source: "relic_roll" }, { view: "trophies" }), false);
});

test("presents shared-game Forge passives without confusing them with fishing bonuses", () => {
  const presentation = getCharmPresentation({
    charm_key: "ascendant-anvil",
    source: { type: "achievement", key: "quarters-ascendant-charm" },
    effects: { game_favor_multiplier_bps: 1000, profile_frame: "ascendant-forge" },
  });

  assert.equal(presentation.provenance, "Relic Forge achievement");
  assert.deepEqual(presentation.effectLabels, ["+10% minigame Favor", "Profile frame"]);
});
