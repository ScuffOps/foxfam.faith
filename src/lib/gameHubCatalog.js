export const GAME_WORLD_KEYS = {
  quarters: "quarters",
  starfishing: "starfishing",
  matchMerge: "match-merge",
  bobaCafe: "boba-cafe",
  puzzleCat: "puzzle-cat",
  timeRunner: "time-runner",
  communityWordle: "community-wordle",
};

export const HUB_UNLOCK_STATES = {
  open: "open",
  locked: "locked",
  comingSoon: "coming-soon",
};

export const FORGE_MATERIALS = [
  {
    key: "star-glass",
    label: "Star Glass",
    source: "Starfishing",
    description: "Cool glassy flakes used for celestial relic sockets and profile shimmer.",
  },
  {
    key: "moonwax",
    label: "Moonwax",
    source: "Match & Merge",
    description: "Soft ritual wax for charm tier work and candle-lit room upgrades.",
  },
  {
    key: "charm-cord",
    label: "Charm Cord",
    source: "Match & Merge",
    description: "Braided thread for binding charms into higher star tiers.",
  },
  {
    key: "sigil-shards",
    label: "Sigil Shards",
    source: "Match & Merge",
    description: "Etched fragments used for passive bonus slots and trophy plates.",
  },
  {
    key: "pearl-resin",
    label: "Pearl Resin",
    source: "Boba Cafe",
    description: "Sweet lacquer for cafe decor, charm gloss, and cozy counter upgrades.",
  },
  {
    key: "hymn-ink",
    label: "Hymn Ink",
    source: "Community Wordle",
    description: "Archive ink for word streak trophies and chapel board cosmetics.",
  },
  {
    key: "clock-brass",
    label: "Clock Brass",
    source: "Time Runner",
    description: "Warm brass from clocktower shards, used for time-themed charm frames.",
  },
  {
    key: "catnip-silver",
    label: "Catnip Silver",
    source: "Find Vezmir",
    description: "A soft silver used for hidden-object trophies and visitor keepsakes.",
  },
  {
    key: "vezmir-thread",
    label: "Vezmir Thread",
    source: "Find Vezmir",
    description: "A quiet thread for profile frames, room curtains, and secret-path decor.",
  },
];

export const GAME_WORLD_ORDER = [
  {
    key: GAME_WORLD_KEYS.quarters,
    label: "Quarters / Forge Hub",
    shortLabel: "Quarters",
    route: "/quarters",
    status: HUB_UNLOCK_STATES.open,
    sourceMaterialKeys: [],
    rewardFocus: "Home base, forge planning, charm loadout, trophies, decor.",
    lore: "Your private room off the Priory courtyard, built to hold every little victory.",
    trophyExamples: ["First Hearth", "Relic Shelf", "Guestbook Candle"],
    charmExamples: ["Hearthkeeper Frame", "Soft Sweep Sigil"],
  },
  {
    key: GAME_WORLD_KEYS.starfishing,
    label: "Starfishing",
    shortLabel: "Starfishing",
    route: "/starfishing",
    status: HUB_UNLOCK_STATES.open,
    sourceMaterialKeys: ["star-glass"],
    rewardFocus: "Favor, Fishpedia progress, duplicate release choices, celestial fish charms.",
    lore: "Cast a line into the constellation pond and reel in little impossible lights.",
    trophyExamples: ["First Star Reeled", "Smallest Star", "Caught Them All"],
    charmExamples: ["Starlit Bobber", "Fishpedia Mythic Frame"],
  },
  {
    key: GAME_WORLD_KEYS.matchMerge,
    label: "Match & Merge",
    shortLabel: "Merge",
    route: "/match-merge",
    status: HUB_UNLOCK_STATES.open,
    sourceMaterialKeys: ["moonwax", "charm-cord", "sigil-shards"],
    rewardFocus: "Forge materials, combo trophies, charm upgrade dust.",
    lore: "Sort the reliquary shelves until loose offerings become forge-ready material.",
    trophyExamples: ["Quiet Sorter", "Three-Minute Saint", "Moonwax Maven"],
    charmExamples: ["Reliquary Hands", "Combo Candle"],
  },
  {
    key: GAME_WORLD_KEYS.bobaCafe,
    label: "Boba Shop Cafe",
    shortLabel: "Boba Cafe",
    route: "/boba-cafe",
    status: HUB_UNLOCK_STATES.open,
    sourceMaterialKeys: ["pearl-resin"],
    rewardFocus: "Favor, Pearl Resin, cafe decor, service streak trophies.",
    lore: "Serve warm little moon drinks to Priory visitors before the queue gets dramatic.",
    trophyExamples: ["Perfect Pearl", "Quiet Queue Bell", "Moonbrew Ladle"],
    charmExamples: ["Cathedral Cup Seal", "Sweet Measure Frame"],
  },
  {
    key: GAME_WORLD_KEYS.puzzleCat,
    label: "Find Vezmir",
    shortLabel: "Find Vezmir",
    route: "/find-vezmir",
    status: HUB_UNLOCK_STATES.open,
    sourceMaterialKeys: ["catnip-silver", "vezmir-thread"],
    rewardFocus: "Hidden-object clears, lore scraps, profile frames, visitor trophies.",
    lore: "Follow small clues through the cloister until the missing familiar gives up hiding.",
    trophyExamples: ["First Clue Found", "No-Hint Cloister", "Vezmir Whisper"],
    charmExamples: ["Secret Thread", "Cloister Lens"],
  },
  {
    key: GAME_WORLD_KEYS.timeRunner,
    label: "Clocktower Side-Scroller",
    shortLabel: "Time Runner",
    route: "/time-runner",
    status: HUB_UNLOCK_STATES.open,
    sourceMaterialKeys: ["clock-brass"],
    rewardFocus: "Clock Brass, shard collection, time trial trophies, time charm frames.",
    lore: "Jump across clock hands and roman numerals to recover pieces of a broken face.",
    trophyExamples: ["First Bellstep", "No-Fall Minute", "Clockface Restored"],
    charmExamples: ["Bellstep Charm", "Pendulum Frame"],
  },
  {
    key: GAME_WORLD_KEYS.communityWordle,
    label: "Community Wordle",
    shortLabel: "Wordle",
    route: "/community-wordle",
    status: HUB_UNLOCK_STATES.open,
    sourceMaterialKeys: ["hymn-ink"],
    rewardFocus: "Daily streaks, community board cosmetics, Hymn Ink, Twitch-ready results.",
    lore: "Light the chapel board with one shared word and a spoiler-safe little ritual.",
    trophyExamples: ["First Guess", "Seven-Day Hymn", "Chapel Streak"],
    charmExamples: ["Hymn Ink Seal", "Wordlight Frame"],
  },
];

export const GAME_WORLD_BY_KEY = GAME_WORLD_ORDER.reduce((items, world) => {
  items[world.key] = world;
  return items;
}, {});

export const MATERIAL_BY_KEY = FORGE_MATERIALS.reduce((items, material) => {
  items[material.key] = material;
  return items;
}, {});

export function getGameWorldByKey(key) {
  return GAME_WORLD_BY_KEY[key] || null;
}

export function getForgeMaterialsForWorld(world) {
  return (world?.sourceMaterialKeys || [])
    .map((key) => MATERIAL_BY_KEY[key])
    .filter(Boolean);
}
