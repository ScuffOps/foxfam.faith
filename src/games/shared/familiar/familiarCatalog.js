const REQUIRED_LAYERS = Object.freeze(["body", "markings", "outfit", "accessory", "charmFx"]);

export const FAMILIAR_SPECIES = Object.freeze({
  "fox-cat": {
    label: "Red panda",
    earStyle: "pointed",
    tailStyle: "plume",
    asset: "/assets/familiars/red-panda.png",
    layers: REQUIRED_LAYERS,
    coats: ["cream", "rose", "mist"],
    markings: ["brow-star", "soft-mask", "none"],
  },
  "moon-rabbit": {
    label: "Moon moth",
    earStyle: "long",
    tailStyle: "wings",
    asset: "/assets/familiars/moon-moth.png",
    layers: REQUIRED_LAYERS,
    coats: ["lily", "malibu", "lavender"],
    markings: ["none", "moon-brow", "petal-cheeks"],
  },
  "shrine-cat": {
    label: "Celestial ermine",
    earStyle: "round-pointed",
    tailStyle: "curl",
    asset: "/assets/familiars/celestial-ermine.png",
    artInset: "wide-safe",
    layers: REQUIRED_LAYERS,
    coats: ["taupe", "cream", "teal-gray"],
    markings: ["temple-mask", "brow-star", "none"],
  },
  "cloud-poodle": {
    label: "Cloud poodle",
    earStyle: "floppy",
    tailStyle: "cloud",
    asset: "/assets/familiars/cloud-poodle.png",
    layers: REQUIRED_LAYERS,
    coats: ["lily", "malibu", "lavender"],
    markings: ["none", "petal-cheeks", "brow-star"],
  },
  "moss-turtle": {
    label: "Moss garden turtle",
    earStyle: "none",
    tailStyle: "sprout",
    asset: "/assets/familiars/moss-turtle.png",
    layers: REQUIRED_LAYERS,
    coats: ["taupe", "teal-gray", "cream"],
    markings: ["temple-mask", "none", "brow-star"],
  },
  "moon-seal": {
    label: "Moonwater seal",
    earStyle: "none",
    tailStyle: "flippers",
    asset: "/assets/familiars/moon-seal.png",
    artInset: "wide-safe",
    layers: REQUIRED_LAYERS,
    coats: ["lily", "malibu", "mist"],
    markings: ["none", "moon-brow", "petal-cheeks"],
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

export const FAMILIAR_OUTFITS = Object.freeze({
  none: { label: "No outfit" },
  "teal-tunic": { label: "Teal tunic" },
  "rose-cardigan": { label: "Rose cardigan" },
  "priory-apron": { label: "Priory apron" },
  "stargazer-cape": { label: "Stargazer cape" },
});

export const FAMILIAR_ACCESSORIES = Object.freeze({
  none: { label: "No accessory" },
  "hymn-charm": { label: "Hymn charm" },
  "moon-ribbon": { label: "Moon ribbon" },
  "forge-goggles": { label: "Forge goggles" },
  "petal-crown": { label: "Petal crown" },
});

export const FAMILIAR_CHARM_FX = Object.freeze({
  none: { label: "No aura" },
  "celestial-butterflies": { label: "Celestial butterflies" },
  "floating-sigils": { label: "Floating sigils" },
  "stardust-trail": { label: "Stardust trail" },
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
    outfit: Object.hasOwn(FAMILIAR_OUTFITS, value.outfit) ? value.outfit : "none",
    accessory: Object.hasOwn(FAMILIAR_ACCESSORIES, value.accessory) ? value.accessory : "none",
    charmFx: Object.hasOwn(FAMILIAR_CHARM_FX, value.charmFx) ? value.charmFx : "none",
  };
}
