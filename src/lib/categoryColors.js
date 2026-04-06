// Custom palette mapped to event categories
export const CATEGORY_COLORS = {
  personal:  { hex: "#753243", bg: "rgba(117,50,67,0.18)",  border: "#753243" },
  community: { hex: "#3c5693", bg: "rgba(60,86,147,0.18)",  border: "#3c5693" },
  collabs:   { hex: "#6b2035", bg: "rgba(107,32,53,0.18)",  border: "#6b2035" },
  birthdays: { hex: "#755665", bg: "rgba(117,86,101,0.18)", border: "#755665" },
};

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.personal;
}