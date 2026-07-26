export const QUARTERS_STATIONS = Object.freeze([
  { key: "forge", label: "Relic Forge", action: "open-forge", x: 77, y: 34 },
  { key: "customize", label: "Familiar Wardrobe", action: "open-customize", x: 83, y: 58 },
  { key: "decorate", label: "Decorate", action: "open-decorate", x: 19, y: 57 },
  { key: "trophies", label: "Trophy Shelf", action: "open-trophies", x: 43, y: 30 },
  { key: "collections", label: "Collections", action: "open-collections", x: 27, y: 31 },
  { key: "courtyard", label: "Priory Courtyard", action: "show-courtyard", x: 90, y: 73 },
]);

export const COURTYARD_WORLD_POSITIONS = Object.freeze({
  "word-garden": { x: 18, y: 26 },
  "match-merge": { x: 50, y: 20 },
  "boba-cafe": { x: 81, y: 30 },
  "puzzle-cat": { x: 22, y: 69 },
  starfishing: { x: 51, y: 76 },
  "time-runner": { x: 80, y: 66 },
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
