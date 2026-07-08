export const MATCH_MERGE_TILES = [
  {
    tier: 1,
    key: "moon-spark",
    label: "Moon Spark",
    materialKey: "moonwax",
    materialLabel: "Moonwax",
    scoreValue: 20,
  },
  {
    tier: 2,
    key: "candle-seal",
    label: "Candle Seal",
    materialKey: "moonwax",
    materialLabel: "Moonwax",
    scoreValue: 55,
  },
  {
    tier: 3,
    key: "woven-cord",
    label: "Woven Cord",
    materialKey: "charm-cord",
    materialLabel: "Charm Cord",
    scoreValue: 130,
  },
  {
    tier: 4,
    key: "sigil-flake",
    label: "Sigil Flake",
    materialKey: "sigil-shards",
    materialLabel: "Sigil Shards",
    scoreValue: 280,
  },
  {
    tier: 5,
    key: "relic-knot",
    label: "Relic Knot",
    materialKey: "sigil-shards",
    materialLabel: "Sigil Shards",
    scoreValue: 640,
  },
];

export const MATCH_MERGE_TILE_BY_TIER = MATCH_MERGE_TILES.reduce((items, tile) => {
  items[tile.tier] = tile;
  return items;
}, {});

export const MAX_MATCH_MERGE_TIER = MATCH_MERGE_TILES[MATCH_MERGE_TILES.length - 1].tier;

export function getTileDefinition(tier) {
  return MATCH_MERGE_TILE_BY_TIER[tier] || MATCH_MERGE_TILE_BY_TIER[1];
}
