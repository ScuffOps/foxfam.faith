import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GAME_WORLD_ORDER, FORGE_MATERIALS, getGameWorldByKey } from "./gameHubCatalog.js";

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
        "community-wordle",
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
});
