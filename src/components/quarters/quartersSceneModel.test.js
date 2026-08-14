import assert from "node:assert/strict";
import test from "node:test";
import { GAME_WORLD_ORDER } from "../../lib/gameHubCatalog.js";
import {
  COURTYARD_WORLD_POSITIONS,
  QUARTERS_STATIONS,
  buildCourtyardStations,
  findNearbyQuartersStation,
  moveSceneCursor,
} from "./quartersSceneModel.js";

test("courtyard exposes every playable world once", () => {
  const stations = buildCourtyardStations(GAME_WORLD_ORDER);
  assert.equal(stations.length, 6);
  assert.equal(new Set(stations.map((item) => item.route)).size, 6);
});

test("courtyard world gates match the approved landmark layout", () => {
  const stations = buildCourtyardStations(GAME_WORLD_ORDER);
  const positions = Object.fromEntries(stations.map(({ key, x, y }) => [key, { x, y }]));
  assert.deepEqual(positions, COURTYARD_WORLD_POSITIONS);
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

test("walking near a Quarters station exposes exactly the nearest interaction", () => {
  assert.equal(findNearbyQuartersStation({ x: 20, y: 71 }), "forge");
  assert.equal(findNearbyQuartersStation({ x: 86, y: 29 }), "courtyard");
  assert.equal(findNearbyQuartersStation({ x: 50, y: 65 }), "");
});
