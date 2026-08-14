import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  RELIC_ROLL_CHARM_CATALOG,
  RELIC_ROLL_CHARM_KEYS,
  rollRelicCharm,
} from "./relicCharms.js";

const progressionMigration = readFileSync(
  new URL("../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
  "utf8",
);

function getServerRollCharmKeys() {
  const functionStart = progressionMigration.indexOf("create or replace function public.roll_user_relic_charm(");
  const functionEnd = progressionMigration.indexOf("create or replace function ", functionStart + 1);
  const functionSql = progressionMigration.slice(
    functionStart,
    functionEnd === -1 ? progressionMigration.length : functionEnd,
  );
  const catalogStart = functionSql.indexOf("from (\n    values");
  const catalogEnd = functionSql.indexOf(") as catalog(charm_key", catalogStart);
  const catalogSql = functionSql.slice(catalogStart, catalogEnd);

  return [...catalogSql.matchAll(/\('([^']+)',\s*'[^']+',\s*'(?:common|uncommon|rare|epic|mythic)'/g)]
    .map((match) => match[1]);
}

test("client relic rolls use the exact server-authoritative charm pool", () => {
  assert.deepEqual(RELIC_ROLL_CHARM_KEYS, getServerRollCharmKeys());
  assert.deepEqual(
    RELIC_ROLL_CHARM_CATALOG.map((charm) => charm.key),
    RELIC_ROLL_CHARM_KEYS,
  );
  assert.equal(RELIC_ROLL_CHARM_CATALOG.length, 16);
  assert.ok(RELIC_ROLL_CHARM_CATALOG.every((charm) => charm.kind !== "achievement"));
});

test("rarity boundaries mirror the server roll and never return achievement charms", () => {
  const cases = [
    [0, "common"],
    [0.549999, "common"],
    [0.55, "uncommon"],
    [0.799999, "uncommon"],
    [0.8, "rare"],
    [0.939999, "rare"],
    [0.94, "epic"],
    [0.989999, "epic"],
    [0.99, "mythic"],
    [1, "mythic"],
  ];

  for (const [randomValue, rarity] of cases) {
    const charm = rollRelicCharm(randomValue, 0);
    assert.equal(charm.rarity, rarity);
    assert.notEqual(charm.kind, "achievement");
    assert.equal(charm.source, "relic_roll");
  }
});

test("selection randomness stays inside the selected general-charm rarity pool", () => {
  const firstRare = rollRelicCharm(0.8, 0);
  const lastRare = rollRelicCharm(0.8, 1);

  assert.equal(firstRare.charm_key, "star-shard");
  assert.equal(lastRare.charm_key, "bloodrose-pin");
});
