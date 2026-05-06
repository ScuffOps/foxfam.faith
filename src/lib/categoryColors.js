// Custom palette mapped to event categories from Veri's shared swatches.
export const EVENT_CATEGORY_OPTIONS = [
  { key: "stream", label: "Channel / Streamer" },
  { key: "community", label: "Community" },
  { key: "collabs", label: "Collabs" },
  { key: "birthdays", label: "Birthdays" },
  { key: "personal", label: "Personal" },
];

export const CATEGORY_COLORS = {
  stream: {
    label: "Channel / Streamer",
    swatch: "Cobalt",
    hex: "#1f42ad",
    bg: "rgba(31,66,173,0.20)",
    dayBg: "rgba(31,66,173,0.18)",
    border: "#1f42ad",
  },
  community: {
    label: "Community",
    swatch: "Chambray",
    hex: "#3c5693",
    bg: "rgba(60,86,147,0.20)",
    dayBg: "rgba(60,86,147,0.18)",
    border: "#3c5693",
  },
  collabs: {
    label: "Collabs",
    swatch: "Strikemaster",
    hex: "#9b6080",
    bg: "rgba(155,96,128,0.20)",
    dayBg: "rgba(155,96,128,0.18)",
    border: "#9b6080",
  },
  birthdays: {
    label: "Birthdays",
    swatch: "Charlotte",
    hex: "#bdebf1",
    bg: "rgba(189,235,241,0.18)",
    dayBg: "rgba(189,235,241,0.15)",
    border: "#bdebf1",
  },
  personal: {
    label: "Personal",
    swatch: "Comet",
    hex: "#5c5f82",
    bg: "rgba(92,95,130,0.20)",
    dayBg: "rgba(92,95,130,0.16)",
    border: "#5c5f82",
  },
};

const CATEGORY_PRIORITY = ["birthdays", "stream", "community", "collabs", "personal"];

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.personal;
}

export function getCategoryLabel(category) {
  return getCategoryColor(category).label;
}

export function getPrimaryEventCategory(events = []) {
  const categories = new Set(events.map((event) => event.category));
  return CATEGORY_PRIORITY.find((category) => categories.has(category)) || events[0]?.category || "personal";
}

export function getEventDayAccent(events = []) {
  if (!events.length) return null;
  return getCategoryColor(getPrimaryEventCategory(events));
}
