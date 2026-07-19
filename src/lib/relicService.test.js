import assert from "node:assert/strict";
import test from "node:test";
import { RELIC_CHARM_CATALOG, normalizeCharm } from "./relicCharms.js";
import { createRelicService } from "./relicService.js";

const charmId = "123e4567-e89b-42d3-a456-426614174001";

test("setCharmEquipped uses the achievement-safe RPC and returns normalized owned rows", async () => {
  const calls = [];
  const service = createRelicService({
    async rpc(name, params) {
      calls.push({ name, params });
      return {
        data: [{
          id: charmId,
          charm_key: "starlit-bobber",
          name: "Starlit Bobber",
          rarity: "uncommon",
          slot: "fishing",
          effects: { favor_multiplier_bps: 500 },
          source: { type: "achievement", key: "first-light" },
          equipped: true,
        }],
        error: null,
      };
    },
  });

  const result = await service.setCharmEquipped(charmId, true);

  assert.deepEqual(calls, [{
    name: "set_equipped_relic_charm",
    params: { target_charm_id: charmId, should_equip: true },
  }]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].effects, { favor_multiplier_bps: 500 });
  assert.deepEqual(result[0].source, { type: "achievement", key: "first-light" });
});

test("achievement charm definitions cover every approved Phase 2 reward", () => {
  const names = new Set(RELIC_CHARM_CATALOG.map((definition) => definition.name));
  assert.deepEqual(
    [...names].filter((name) => [
      "Starlit Bobber",
      "Merciful Tide",
      "Pocket Star",
      "Glassfin Comet",
      "Fishpedia Frame",
      "Century Chain",
    ].includes(name)).sort(),
    [
      "Century Chain",
      "Fishpedia Frame",
      "Glassfin Comet",
      "Merciful Tide",
      "Pocket Star",
      "Starlit Bobber",
    ],
  );
});

test("achievement instances preserve server-provided effect metadata", () => {
  const effects = {
    favor_multiplier_bps: 500,
    profile_particle: "server-starlight",
  };
  const normalized = normalizeCharm({
    charm_key: "starlit-bobber",
    name: "Server Starlit Bobber",
    effects,
    source: { type: "achievement", key: "first-light" },
  });

  assert.equal(normalized.name, "Server Starlit Bobber");
  assert.deepEqual(normalized.effects, effects);
  assert.deepEqual(normalized.source, { type: "achievement", key: "first-light" });
});
