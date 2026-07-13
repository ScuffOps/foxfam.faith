export const QUARTERS_STATIONS = Object.freeze([
  { key: "forge", label: "Relic Forge", action: "open-forge", x: 77, y: 34 },
  { key: "customize", label: "Familiar Wardrobe", action: "open-customize", x: 83, y: 58 },
  { key: "decorate", label: "Decorate", action: "open-decorate", x: 19, y: 57 },
  { key: "trophies", label: "Trophy Shelf", action: "open-trophies", x: 53, y: 24 },
  { key: "collections", label: "Collections", action: "open-collections", x: 27, y: 31 },
  { key: "courtyard", label: "Priory Courtyard", action: "show-courtyard", x: 90, y: 73 },
]);

export function buildCourtyardStations(worlds = []) {
  return worlds
    .filter((world) => world.key !== "quarters")
    .map((world, index) => ({
      ...world,
      x: [18, 50, 81, 22, 51, 80][index] || 50,
      y: [26, 20, 30, 69, 76, 66][index] || 50,
    }));
}

export function moveSceneCursor(cursor, delta) {
  return {
    x: Math.max(14, Math.min(86, cursor.x + delta.x)),
    y: Math.max(18, Math.min(82, cursor.y + delta.y)),
  };
}
