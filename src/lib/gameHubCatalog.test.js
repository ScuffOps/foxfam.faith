import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FORGE_MATERIALS,
  GAME_WORLD_BY_KEY,
  GAME_WORLD_KEYS,
  GAME_WORLD_ORDER,
  MATERIAL_BY_KEY,
  getGameWorldByKey,
  normalizeMaterialKey,
} from "./gameHubCatalog.js";

describe("gameHubCatalog", () => {
  it("keeps the approved minigame order", () => {
    assert.deepEqual(
      GAME_WORLD_ORDER.map((world) => world.key),
      [
        "quarters",
        "starfishing",
        "match-merge",
        "boba-cafe",
        "puzzle-cat",
        "time-runner",
        "word-garden",
      ],
    );
  });

  it("maps all material keys to a source game", () => {
    for (const material of FORGE_MATERIALS) {
      assert.equal(typeof material.key, "string");
      assert.equal(typeof material.source, "string");
      assert.ok(material.source.length > 0);
    }
  });

  it("can look up worlds by key", () => {
    assert.equal(getGameWorldByKey("starfishing")?.label, "Starfishing");
    assert.equal(getGameWorldByKey("missing-world"), null);
  });

  it("uses canonical Word Garden and renamed materials", () => {
    assert.equal(MATERIAL_BY_KEY.voidthread.label, "Voidthread");
    assert.equal(MATERIAL_BY_KEY["blooming-ink"].label, "Blooming Ink");
    assert.equal(GAME_WORLD_BY_KEY[GAME_WORLD_KEYS.wordGarden].route, "/word-garden");
  assert.equal(GAME_WORLD_BY_KEY[GAME_WORLD_KEYS.wordGarden].sourceMaterialKeys[0], "blooming-ink");
  assert.deepEqual(
    GAME_WORLD_BY_KEY[GAME_WORLD_KEYS.bobaCafe].sourceMaterialKeys,
    ["pearl-resin", "sugar-pearls", "cream-cloud"],
  );
  });

  it("normalizes legacy local material keys", () => {
    assert.equal(normalizeMaterialKey("vezmir-thread"), "voidthread");
    assert.equal(normalizeMaterialKey("hymn-ink"), "blooming-ink");
    assert.equal(normalizeMaterialKey("star-glass"), "star-glass");
  });
});
