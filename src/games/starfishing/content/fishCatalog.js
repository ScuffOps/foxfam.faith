export const FISH_RARITIES = {
  common: "common",
  uncommon: "uncommon",
  rare: "rare",
  epic: "epic",
  mythic: "mythic",
};

export const STARFISHING_FISH = [
  {
    key: "ember-mote",
    label: "Ember Mote",
    rarity: FISH_RARITIES.common,
    constellation: "Candlewake",
    sizeRange: [2.1, 6.4],
    qtePattern: ["qte-left"],
    favorPreview: 3,
    materialDrops: [{ key: "star-glass", label: "Star Glass", quantity: 1, type: "material" }],
    lore: "A tiny warm star that flickers when it is praised.",
  },
  {
    key: "lunar-guppy",
    label: "Lunar Guppy",
    rarity: FISH_RARITIES.common,
    constellation: "Soft Tide",
    sizeRange: [3.0, 8.2],
    qtePattern: ["qte-right"],
    favorPreview: 3,
    materialDrops: [{ key: "star-glass", label: "Star Glass", quantity: 1, type: "material" }],
    lore: "Small, round, and convinced the moon is a snack.",
  },
  {
    key: "aurora-minnow",
    label: "Aurora Minnow",
    rarity: FISH_RARITIES.uncommon,
    constellation: "North Lantern",
    sizeRange: [5.5, 12.8],
    qtePattern: ["qte-left", "qte-up"],
    favorPreview: 5,
    materialDrops: [{ key: "star-glass", label: "Star Glass", quantity: 2, type: "material" }],
    lore: "Its fins leave little curtains of green light behind them.",
  },
  {
    key: "comet-koi",
    label: "Comet Koi",
    rarity: FISH_RARITIES.rare,
    constellation: "Longtail",
    sizeRange: [11.0, 24.0],
    qtePattern: ["qte-up", "qte-right", "qte-left"],
    favorPreview: 8,
    materialDrops: [{ key: "star-glass", label: "Star Glass", quantity: 3, type: "material" }],
    lore: "A sweeping fish with a tail like a wish that changed its mind.",
  },
  {
    key: "eclipse-ray",
    label: "Eclipse Ray",
    rarity: FISH_RARITIES.epic,
    constellation: "Black Halo",
    sizeRange: [22.0, 45.0],
    qtePattern: ["qte-down", "qte-left", "qte-up", "qte-right"],
    favorPreview: 13,
    materialDrops: [{ key: "star-glass", label: "Star Glass", quantity: 5, type: "material" }],
    lore: "A silent ray that dims the pond around it for exactly one breath.",
  },
  {
    key: "veri-starwhale",
    label: "Veri Starwhale",
    rarity: FISH_RARITIES.mythic,
    constellation: "Cathedral Deep",
    sizeRange: [48.0, 99.0],
    qtePattern: ["qte-left", "qte-up", "qte-right", "qte-down", "qte-up"],
    favorPreview: 25,
    materialDrops: [{ key: "star-glass", label: "Star Glass", quantity: 8, type: "material" }],
    lore: "A mythic silhouette that swims through old chapel windows in dreams.",
  },
];

export const FISH_BY_KEY = STARFISHING_FISH.reduce((items, fish) => {
  items[fish.key] = fish;
  return items;
}, {});

const RARITY_WEIGHTS = [
  ["common", 54],
  ["uncommon", 25],
  ["rare", 14],
  ["epic", 6],
  ["mythic", 1],
];

export function pickFish(randomValue = Math.random()) {
  const total = RARITY_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let threshold = randomValue * total;
  let rarity = "common";

  for (const [candidate, weight] of RARITY_WEIGHTS) {
    threshold -= weight;
    if (threshold <= 0) {
      rarity = candidate;
      break;
    }
  }

  const pool = STARFISHING_FISH.filter((fish) => fish.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)] || STARFISHING_FISH[0];
}

export function rollFishSize(fish, randomValue = Math.random()) {
  const [min, max] = fish.sizeRange;
  return Number((min + (max - min) * randomValue).toFixed(2));
}
