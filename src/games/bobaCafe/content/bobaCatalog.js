export const BOBA_CAFE_INGREDIENT_GROUPS = [
  {
    key: "tea",
    label: "Tea",
    options: [
      { key: "jasmine-tea", label: "Jasmine", accent: "#6ee7b7" },
      { key: "black-tea", label: "Black Tea", accent: "#c084fc" },
      { key: "taro-tea", label: "Taro", accent: "#f0abfc" },
      { key: "matcha-tea", label: "Matcha", accent: "#86efac" },
    ],
  },
  {
    key: "milk",
    label: "Milk",
    options: [
      { key: "oat-milk", label: "Oat", accent: "#fde68a" },
      { key: "cream-cloud", label: "Cloud", accent: "#f8fafc" },
      { key: "strawberry-milk", label: "Berry", accent: "#f9a8d4" },
      { key: "cocoa-milk", label: "Cocoa", accent: "#d6a56d" },
    ],
  },
  {
    key: "topping",
    label: "Pearls",
    options: [
      { key: "brown-sugar-pearls", label: "Brown Sugar", accent: "#92400e" },
      { key: "star-jelly", label: "Star Jelly", accent: "#67e8f9" },
      { key: "pudding-cubes", label: "Pudding", accent: "#facc15" },
      { key: "crystal-boba", label: "Crystal", accent: "#bfdbfe" },
    ],
  },
  {
    key: "charm",
    label: "Charm",
    options: [
      { key: "fox-lid", label: "Fox Lid", accent: "#fb7185" },
      { key: "moon-straw", label: "Moon Straw", accent: "#c4b5fd" },
      { key: "ribbon-seal", label: "Ribbon", accent: "#fda4af" },
      { key: "lantern-pick", label: "Lantern", accent: "#fbbf24" },
    ],
  },
];

export const SWEETNESS_LEVELS = [
  { key: "soft", label: "Soft", value: 25 },
  { key: "glow", label: "Glow", value: 50 },
  { key: "festival", label: "Festival", value: 75 },
];

export const BOBA_CUSTOMERS = [
  { key: "choir-helper", label: "Choir Helper", palette: ["#f9a8d4", "#7dd3fc"] },
  { key: "library-visitor", label: "Library Visitor", palette: ["#c4b5fd", "#fef3c7"] },
  { key: "courtyard-runner", label: "Courtyard Runner", palette: ["#86efac", "#fecaca"] },
  { key: "relic-polisher", label: "Relic Polisher", palette: ["#fde68a", "#a7f3d0"] },
  { key: "vesper-guest", label: "Vesper Guest", palette: ["#93c5fd", "#f0abfc"] },
];

export const BOBA_ORDER_TEMPLATES = [
  {
    key: "lantern-latte",
    label: "Lantern Latte",
    recipe: {
      tea: "black-tea",
      milk: "cream-cloud",
      topping: "brown-sugar-pearls",
      charm: "lantern-pick",
      sweetness: "glow",
    },
  },
  {
    key: "shrine-matcha",
    label: "Shrine Matcha",
    recipe: {
      tea: "matcha-tea",
      milk: "oat-milk",
      topping: "star-jelly",
      charm: "moon-straw",
      sweetness: "soft",
    },
  },
  {
    key: "taro-ribbon",
    label: "Taro Ribbon",
    recipe: {
      tea: "taro-tea",
      milk: "strawberry-milk",
      topping: "crystal-boba",
      charm: "ribbon-seal",
      sweetness: "festival",
    },
  },
  {
    key: "garden-jasmine",
    label: "Garden Jasmine",
    recipe: {
      tea: "jasmine-tea",
      milk: "oat-milk",
      topping: "pudding-cubes",
      charm: "fox-lid",
      sweetness: "glow",
    },
  },
  {
    key: "cocoa-comet",
    label: "Cocoa Comet",
    recipe: {
      tea: "black-tea",
      milk: "cocoa-milk",
      topping: "crystal-boba",
      charm: "moon-straw",
      sweetness: "festival",
    },
  },
  {
    key: "soft-starlight",
    label: "Soft Starlight",
    recipe: {
      tea: "jasmine-tea",
      milk: "cream-cloud",
      topping: "star-jelly",
      charm: "ribbon-seal",
      sweetness: "soft",
    },
  },
];

export const BOBA_INGREDIENTS_BY_KEY = BOBA_CAFE_INGREDIENT_GROUPS.reduce((items, group) => {
  group.options.forEach((option) => {
    items[option.key] = { ...option, groupKey: group.key, groupLabel: group.label };
  });
  return items;
}, {});

export const SWEETNESS_BY_KEY = SWEETNESS_LEVELS.reduce((items, level) => {
  items[level.key] = level;
  return items;
}, {});

export function getIngredientLabel(key) {
  return BOBA_INGREDIENTS_BY_KEY[key]?.label || SWEETNESS_BY_KEY[key]?.label || "Unknown";
}
