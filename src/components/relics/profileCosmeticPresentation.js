const RARITY_WEIGHT = Object.freeze({
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  mythic: 5,
});

export const PROFILE_FRAME_CATALOG = Object.freeze({
  "fishpedia-frame": { key: "fishpedia-frame", label: "Fishpedia Frame", motif: "book", color: "#80adbc", shade: "#5f8796" },
  "lantern-eyed": { key: "lantern-eyed", label: "Lantern-Eyed Frame", motif: "eye", color: "#d5a1a3", shade: "#a7797e" },
  "unfractured-loop": { key: "unfractured-loop", label: "Unfractured Loop", motif: "clock", color: "#dfc66f", shade: "#ad914a" },
  "full-bloom": { key: "full-bloom", label: "Full Bloom Frame", motif: "flower", color: "#aebf91", shade: "#7f9869" },
  "ascendant-forge": { key: "ascendant-forge", label: "Ascendant Forge Frame", motif: "diamond", color: "#dfc66f", shade: "#ad914a" },
});

export const PROFILE_PARTICLE_CATALOG = Object.freeze({
  "pocket-star": { key: "pocket-star", label: "Pocket Star", motif: "star", color: "#dfc66f" },
  "refinement-spark": { key: "refinement-spark", label: "Refinement Spark", motif: "diamond", color: "#80adbc" },
  "shaper-sigil": { key: "shaper-sigil", label: "Shaper Sigil", motif: "sigil", color: "#b5a5cf" },
  "tea-steam": { key: "tea-steam", label: "Tea Steam", motif: "steam", color: "#80adbc" },
  "boba-bubbles": { key: "boba-bubbles", label: "Boba Bubbles", motif: "bubble", color: "#d5a1a3" },
  "paw-trail": { key: "paw-trail", label: "Paw Trail", motif: "paw", color: "#cab08b" },
  "clock-sparks": { key: "clock-sparks", label: "Clock Sparks", motif: "clock", color: "#dfc66f" },
  "ink-petals": { key: "ink-petals", label: "Blooming Ink Petals", motif: "petal", color: "#aebf91" },
  "forge-sparks": { key: "forge-sparks", label: "Forge Sparks", motif: "diamond", color: "#dfc66f" },
});

function compareCosmeticCharms(left, right) {
  const rarityDifference = (RARITY_WEIGHT[right.rarity] || 0) - (RARITY_WEIGHT[left.rarity] || 0);
  if (rarityDifference) return rarityDifference;
  const starDifference = Number(right.star || 0) - Number(left.star || 0);
  if (starDifference) return starDifference;
  return String(left.charm_key || left.id || "").localeCompare(String(right.charm_key || right.id || ""));
}

export function selectProfileCosmetics(charms = []) {
  const equipped = charms.filter((charm) => charm?.equipped).sort(compareCosmeticCharms);
  const frameCharm = equipped.find((charm) => PROFILE_FRAME_CATALOG[charm.effects?.profile_frame]);
  const particleCharm = equipped.find((charm) => PROFILE_PARTICLE_CATALOG[charm.effects?.profile_particle]);

  return {
    frame: frameCharm ? { ...PROFILE_FRAME_CATALOG[frameCharm.effects.profile_frame], charm: frameCharm } : null,
    particle: particleCharm ? { ...PROFILE_PARTICLE_CATALOG[particleCharm.effects.profile_particle], charm: particleCharm } : null,
  };
}

export function resolvePublicProfileCosmetics(cosmetics = {}) {
  const frame = PROFILE_FRAME_CATALOG[cosmetics.profileFrame];
  const particle = PROFILE_PARTICLE_CATALOG[cosmetics.profileParticle];
  return {
    frame: frame ? { ...frame, charm: null } : null,
    particle: particle ? { ...particle, charm: null } : null,
  };
}
