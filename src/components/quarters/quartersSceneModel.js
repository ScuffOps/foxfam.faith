export const QUARTERS_SCENE_PLANE = Object.freeze({
  width: 1200,
  height: 800,
  aspect: "3:2",
});

export const QUARTERS_STATIONS = Object.freeze([
  { key: "forge", label: "Relic Forge", action: "open-forge", x: 19, y: 72 },
  { key: "customize", label: "Familiar Wardrobe", action: "open-customize", x: 65, y: 25 },
  { key: "decorate", label: "Decorate", action: "open-decorate", x: 77, y: 76 },
  { key: "trophies", label: "Trophy Shelf", action: "open-trophies", x: 45, y: 14 },
  { key: "collections", label: "Collections", action: "open-collections", x: 48, y: 27 },
  { key: "courtyard", label: "Priory Courtyard", action: "show-courtyard", x: 89, y: 29 },
]);

export const COURTYARD_WORLD_POSITIONS = Object.freeze({
  "word-garden": { x: 74, y: 24 },
  "match-merge": { x: 50, y: 19 },
  "boba-cafe": { x: 82, y: 73 },
  "puzzle-cat": { x: 24, y: 24 },
  starfishing: { x: 20, y: 76 },
  "time-runner": { x: 58, y: 76 },
});

export function buildCourtyardStations(worlds = []) {
  return worlds
    .filter((world) => world.key !== "quarters")
    .map((world) => ({
      ...world,
      ...(COURTYARD_WORLD_POSITIONS[world.key] || { x: 50, y: 50 }),
    }));
}

export function moveSceneCursor(cursor, delta) {
  return {
    x: Math.max(14, Math.min(86, cursor.x + delta.x)),
    y: Math.max(18, Math.min(82, cursor.y + delta.y)),
  };
}

export function findNearbyQuartersStation(cursor, radius = 10) {
  const nearest = QUARTERS_STATIONS
    .map((station) => ({
      station,
      distance: Math.hypot(station.x - cursor.x, (station.y - cursor.y) * 1.15),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  return nearest && nearest.distance <= radius ? nearest.station.key : "";
}

export function scenePercentToPoint({ x, y }) {
  return {
    x: Math.round((x / 100) * QUARTERS_SCENE_PLANE.width),
    y: Math.round((y / 100) * QUARTERS_SCENE_PLANE.height),
  };
}
