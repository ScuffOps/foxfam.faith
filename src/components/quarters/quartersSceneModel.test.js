import assert from "node:assert/strict";
import test from "node:test";
import { GAME_WORLD_ORDER } from "../../lib/gameHubCatalog.js";
import { QUARTERS_STATIONS, buildCourtyardStations, moveSceneCursor } from "./quartersSceneModel.js";

test("courtyard exposes every playable world once", () => {
  const stations = buildCourtyardStations(GAME_WORLD_ORDER);
  assert.equal(stations.length, 6);
  assert.equal(new Set(stations.map((item) => item.route)).size, 6);
});

test("quarters includes the approved diegetic stations", () => {
  assert.deepEqual(QUARTERS_STATIONS.map((station) => station.key), [
    "forge",
    "customize",
    "decorate",
    "trophies",
    "collections",
    "courtyard",
  ]);
});

test("scene cursor movement clamps to the walkable room", () => {
  assert.deepEqual(moveSceneCursor({ x: 50, y: 50 }, { x: 80, y: -90 }), { x: 86, y: 18 });
});
