const REQUIRED_LAYERS = Object.freeze(["body", "markings", "outfit", "accessory", "charmFx"]);

export const FAMILIAR_SPECIES = Object.freeze({
  "fox-cat": {
    label: "Fox-cat",
    earStyle: "pointed",
    tailStyle: "plume",
    layers: REQUIRED_LAYERS,
    coats: ["cream", "rose", "mist"],
    markings: ["brow-star", "soft-mask", "none"],
  },
  "moon-rabbit": {
    label: "Moon rabbit",
    earStyle: "long",
    tailStyle: "puff",
    layers: REQUIRED_LAYERS,
    coats: ["lily", "malibu", "lavender"],
    markings: ["none", "moon-brow", "petal-cheeks"],
  },
  "shrine-cat": {
    label: "Shrine cat",
    earStyle: "round-pointed",
    tailStyle: "curl",
    layers: REQUIRED_LAYERS,
    coats: ["taupe", "cream", "teal-gray"],
    markings: ["temple-mask", "brow-star", "none"],
  },
});

export const FAMILIAR_COATS = Object.freeze({
  cream: { base: "#FAF3EB", detail: "#D5A1A3" },
  rose: { base: "#F8E6E6", detail: "#D5A1A3" },
  mist: { base: "#D9E6EC", detail: "#80ADBC" },
  lily: { base: "#FEFCF7", detail: "#D5A1A3" },
  malibu: { base: "#D9E6EC", detail: "#B4C6DC" },
  lavender: { base: "#EEE8E8", detail: "#B4C6DC" },
  taupe: { base: "#C2B7B1", detail: "#8B7B76" },
  "teal-gray": { base: "#A8BFC2", detail: "#80ADBC" },
});

export const DEFAULT_FAMILIAR = Object.freeze({
  species: "fox-cat",
  coat: "cream",
  markings: "brow-star",
  outfit: "teal-tunic",
  accessory: "hymn-charm",
  charmFx: "none",
});

export function normalizeFamiliarSelection(value) {
  const species = FAMILIAR_SPECIES[value?.species];
  if (!species) return { ...DEFAULT_FAMILIAR };

  return {
    species: value.species,
    coat: species.coats.includes(value.coat) ? value.coat : species.coats[0],
    markings: species.markings.includes(value.markings) ? value.markings : species.markings[0],
    outfit: value.outfit || DEFAULT_FAMILIAR.outfit,
    accessory: value.accessory || "none",
    charmFx: value.charmFx || "none",
  };
}
