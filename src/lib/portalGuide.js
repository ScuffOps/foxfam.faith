export const PORTAL_RULES = [
  {
    title: "Care for the person",
    body: "Disagree with ideas without turning another member into the target. Curiosity first; cruelty gets removed.",
  },
  {
    title: "Keep private things private",
    body: "Do not repost personal messages, private schedules, contact details, or vulnerable stories without clear permission.",
  },
  {
    title: "Upload safely",
    body: "Share media you have permission to post. Executables, installers, and files intended to harm or deceive are not welcome.",
  },
  {
    title: "Post with purpose",
    body: "Use the closest forum section, add useful context, and avoid flooding the same thought across several spaces.",
  },
  {
    title: "Let staff moderate",
    body: "Mods may move, lock, archive, or remove content to protect the community. Ask privately if a decision needs clarification.",
  },
];

export const STREAM_RULES = [
  {
    title: "Honor Veri's boundaries",
    body: "Do not pressure for private information, attention, collaborations, or access beyond what Veri offers publicly.",
  },
  {
    title: "Share the room",
    body: "Avoid backseating, repeated demands, spam, and conversations that crowd everyone else out of chat.",
  },
  {
    title: "Keep the connection grounded",
    body: "Warm parasocial energy is welcome. Possessiveness, entitlement, harassment, or treating fiction as consent is not.",
  },
  {
    title: "Follow platform rules",
    body: "Twitch and Discord rules still apply here. Staff can act on behavior that threatens the stream or community elsewhere.",
  },
];

export const PORTAL_DIRECTORY = [
  {
    title: "Choose your public identity",
    body: "Set your display name, avatar, profile details, accessibility preferences, and notification choices.",
    path: "/settings",
    action: "Open settings",
  },
  {
    title: "Connect Twitch or Discord",
    body: "Linked identities unlock reliable recognition across the portal and future stream integrations.",
    path: "/settings#integrations",
    action: "Connect accounts",
  },
  {
    title: "Add your birthday",
    body: "Give Foxfam a date to celebrate. Your year and age can remain private.",
    path: "/birthdays",
    action: "Set birthday",
  },
  {
    title: "Introduce yourself",
    body: "Start in Introductions so familiar names can become familiar people.",
    path: "/forum?section=introductions&compose=1",
    action: "Write introduction",
  },
  {
    title: "Explore the shrine",
    body: "Leave a prayer, browse offerings, and read the Reliquary. Relics and charms remain locked until the wider ecosystem is ready.",
    path: "/prayer",
    action: "Visit the shrine",
  },
];

export const ONBOARDING_ITEMS = [
  { key: "identity", label: "Connect Twitch or Discord", path: "/settings#integrations" },
  { key: "birthday", label: "Set your birthday", path: "/birthdays" },
  { key: "introduction", label: "Post an introduction", path: "/forum?section=introductions&compose=1" },
  { key: "shrine", label: "Tour the shrine", path: "/prayer" },
];
