import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatBasisPointBonus,
  getStarfishingProgressModel,
} from "./starfishingProgressModel.js";

const here = dirname(fileURLToPath(import.meta.url));

const charms = [
  {
    id: "1",
    charm_key: "starlit-bobber",
    name: "Starlit Bobber",
    slot: "fishing",
    source: { type: "achievement", key: "first-light" },
    equipped: true,
    effects: { favor_multiplier_bps: 500 },
  },
  {
    id: "2",
    charm_key: "century-chain",
    name: "Century Chain",
    slot: "fishing",
    source: { type: "achievement", key: "hundred-lights" },
    equipped: true,
    effects: { material_multiplier_bps: 750 },
  },
  {
    id: "3",
    charm_key: "fishpedia-frame",
    name: "Fishpedia Frame",
    slot: "profile-frame",
    source: { type: "achievement", key: "celestial-archivist" },
    equipped: true,
    effects: { profile_frame: "fishpedia-frame" },
  },
  {
    id: "4",
    charm_key: "glassfin-comet",
    name: "Glassfin Comet",
    slot: "fishing",
    source: { type: "achievement", key: "myth-in-moonwater" },
    equipped: false,
    effects: { rare_bite_bonus_bps: 300 },
  },
];

test("progress model reports canonical Fishpedia completion and recent achievement titles", () => {
  const model = getStarfishingProgressModel({
    progression: {
      fishpedia: [
        { fishKey: "lunar-guppy", caughtCount: 2 },
        { fishKey: "comet-koi", caughtCount: 1 },
      ],
      achievements: [
        { achievementKey: "first-light", unlockedAt: "2026-07-18T12:00:00.000Z" },
        { achievementKey: "myth-in-moonwater", unlockedAt: "2026-07-19T12:00:00.000Z" },
      ],
      trophies: [],
    },
    charms,
  });

  assert.equal(model.discoveredCount, 2);
  assert.equal(model.totalCount, 6);
  assert.equal(model.completionPercent, 33);
  assert.deepEqual(
    model.recentAchievements.map(({ title }) => title),
    ["Myth in Moonwater", "First Light"],
  );
});

test("progress model labels equipped fishing passives from basis points", () => {
  const model = getStarfishingProgressModel({
    progression: { fishpedia: [], achievements: [], trophies: [] },
    charms,
  });

  assert.deepEqual(
    model.fishingBonuses.map(({ label }) => label),
    ["+5% Favor", "+7.5% forge materials"],
  );
  assert.equal(formatBasisPointBonus(300, "rare bite chance"), "+3% rare bite chance");
});

test("progress model selects the equipped profile frame and matching trophy", () => {
  const model = getStarfishingProgressModel({
    progression: {
      fishpedia: [],
      achievements: [],
      trophies: [{
        id: "trophy-1",
        trophyKey: "celestial-archivist",
        data: { label: "Celestial Archivist" },
        acquiredAt: "2026-07-19T12:00:00.000Z",
      }],
    },
    charms,
  });

  assert.equal(model.profileFrame.name, "Fishpedia Frame");
  assert.equal(model.selectedTrophy.title, "Celestial Archivist");
});

test("progress model has quiet empty states", () => {
  const model = getStarfishingProgressModel({
    progression: { fishpedia: [], achievements: [], trophies: [] },
    charms: [],
  });

  assert.equal(model.isEmpty, true);
  assert.equal(model.profileFrame, null);
  assert.equal(model.selectedTrophy, null);
  assert.deepEqual(model.fishingBonuses, []);
});

test("progress card and shelf expose accessible status and durable equipment controls", () => {
  const cardSource = readFileSync(join(here, "StarfishingProgressCard.jsx"), "utf8");
  const shelfSource = readFileSync(join(here, "ProfileCharmShelf.jsx"), "utf8");
  const profileSource = readFileSync(join(here, "../../pages/Profile.jsx"), "utf8");
  const quartersSource = readFileSync(join(here, "../../pages/QuartersHub.jsx"), "utf8");

  assert.match(cardSource, /role="status"/);
  assert.match(cardSource, /aria-label="Fishpedia completion"/);
  assert.match(cardSource, /No stars catalogued yet/);
  assert.match(shelfSource, /setEquippedCharm/);
  assert.match(shelfSource, /aria-pressed=\{Boolean\(charm\.equipped\)\}/);
  assert.match(shelfSource, /disabled=\{busy/);
  assert.doesNotMatch(shelfSource, /setCharms\(\(current\)/);
  assert.match(profileSource, /loadStarfishingProgression/);
  assert.match(profileSource, /<StarfishingProgressCard/);
  assert.match(quartersSource, /loadStarfishingProgression/);
  assert.match(quartersSource, /<StarfishingProgressCard/);
});
