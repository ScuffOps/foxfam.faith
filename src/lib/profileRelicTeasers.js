const RELIC_TEASERS = [
  {
    title: "Veiled Lantern",
    omen: "A blue-lit vessel waits behind smoked glass. It brightens when the right promise gets close.",
  },
  {
    title: "Moonheld Sigil",
    omen: "A small mark circles itself in silence, counting every return to the shrine.",
  },
  {
    title: "Hollow Bell",
    omen: "No sound comes from it yet. The metal still remembers who reached for it first.",
  },
  {
    title: "Starbound Thread",
    omen: "A ribbon of cold light has tied itself into a knot that refuses ordinary scissors.",
  },
  {
    title: "Ashen Lens",
    omen: "The surface shows nothing directly, but every reflection looks recently awakened.",
  },
];

const RELIC_STAGES = ["Dormant", "Listening", "Stirring", "Near Waking", "Unsealed Soon"];
const MYSTERY_RELIC_IMAGE = "/assets/seal-revamp-c-source.png";

function hashString(value = "") {
  return [...String(value)].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

export function getProfileRelicTeaser(user = {}) {
  const seed = `${user.id || ""}:${user.display_name || ""}:${user.username || ""}`;
  const hash = Math.abs(hashString(seed));
  const teaser = RELIC_TEASERS[hash % RELIC_TEASERS.length];
  const stage = RELIC_STAGES[hash % RELIC_STAGES.length];

  return {
    ...teaser,
    image: MYSTERY_RELIC_IMAGE,
    stage,
    code: `FF-${String(hash % 10000).padStart(4, "0")}`,
  };
}
