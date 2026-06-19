export const FORUM_SECTIONS = [
  {
    id: "general",
    label: "General",
    description: "Open chat, questions, and everyday Foxfam threads.",
  },
  {
    id: "introductions",
    label: "Introductions",
    description: "New here? Step into the circle and say hello.",
  },
  {
    id: "veri_lore",
    label: "Veri Lore",
    description: "Shrine theories, stream callbacks, and sacred nonsense.",
  },
  {
    id: "fanworks",
    label: "Fanworks",
    description: "Share WIPs, edits, poems, songs, and creative offerings.",
  },
  {
    id: "stream_chat",
    label: "Stream Chat",
    description: "Episode reactions, clips, quotes, and live community chatter.",
  },
  {
    id: "help_desk",
    label: "Help Desk",
    description: "Portal help, community questions, and gentle troubleshooting.",
  },
  {
    id: "off_topic",
    label: "Off Topic",
    description: "Low-stakes chatter that does not need a formal altar.",
  },
];

const SECTION_IDS = new Set(FORUM_SECTIONS.map((section) => section.id));

export function normalizeForumCategory(category) {
  const normalized = String(category || "general").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return SECTION_IDS.has(normalized) ? normalized : "general";
}

export function getForumSection(category) {
  const normalized = normalizeForumCategory(category);
  return FORUM_SECTIONS.find((section) => section.id === normalized) || FORUM_SECTIONS[0];
}
