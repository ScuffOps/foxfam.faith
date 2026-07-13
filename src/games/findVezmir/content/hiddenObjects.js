export const FIND_VEZMIR_VEZMIR_KEY = "vezmir";

export const FIND_VEZMIR_OBJECTS = [
  {
    key: "moon-mug",
    label: "Moon Mug",
    shortLabel: "Mug",
    role: "clue",
    layer: "foreground",
    region: "southwest hearth",
    description: "A warm cup tucked into the quilted altar nook.",
    hotspot: { x: 15.4, y: 70.2, width: 8.6, height: 11.2 },
  },
  {
    key: "ribbon-bell",
    label: "Ribbon Bell",
    shortLabel: "Bell",
    role: "clue",
    layer: "room",
    region: "western arcade",
    description: "A tiny bell tied beneath the charm shelf.",
    hotspot: { x: 34.5, y: 34.8, width: 6.8, height: 9.4 },
  },
  {
    key: "fox-pin",
    label: "Fox Pin",
    shortLabel: "Pin",
    role: "clue",
    layer: "foreground",
    region: "central cushions",
    description: "A bright pin hiding near the floor pillows.",
    hotspot: { x: 58.4, y: 72.1, width: 7.6, height: 9.2 },
  },
  {
    key: "star-note",
    label: "Star Note",
    shortLabel: "Note",
    role: "clue",
    layer: "background",
    region: "eastern window",
    description: "A folded note caught under the window frame.",
    hotspot: { x: 76.6, y: 29.4, width: 7.2, height: 8.6 },
  },
  {
    key: "seed-pouch",
    label: "Seed Pouch",
    shortLabel: "Pouch",
    role: "clue",
    layer: "room",
    region: "eastern garden wall",
    description: "A soft pouch nestled beside the planter.",
    hotspot: { x: 81.4, y: 66.4, width: 8.2, height: 10.6 },
  },
  {
    key: FIND_VEZMIR_VEZMIR_KEY,
    label: "Vezmir",
    shortLabel: "Vezmir",
    role: "final",
    layer: "background",
    region: "central curtain",
    description: "A little witness peeking from the curtain folds.",
    hotspot: { x: 47.8, y: 43.3, width: 9.8, height: 19.4 },
  },
];

export const FIND_VEZMIR_CLUE_KEYS = FIND_VEZMIR_OBJECTS
  .filter((object) => object.role === "clue")
  .map((object) => object.key);

export const FIND_VEZMIR_TARGET_KEYS = [
  ...FIND_VEZMIR_CLUE_KEYS,
  FIND_VEZMIR_VEZMIR_KEY,
];

export const FIND_VEZMIR_OBJECT_BY_KEY = FIND_VEZMIR_OBJECTS.reduce((objectsByKey, object) => {
  objectsByKey[object.key] = object;
  return objectsByKey;
}, {});
