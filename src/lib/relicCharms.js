export const RELIC_BASES = [
  { id: "lantern", label: "Lantern", icon: "Lamp", cost: 45 },
  { id: "tome", label: "Tome", icon: "BookOpen", cost: 35 },
  { id: "mask", label: "Mask", icon: "VenetianMask", cost: 55 },
  { id: "crystal", label: "Crystal", icon: "Gem", cost: 40 },
  { id: "instrument", label: "Instrument", icon: "Music", cost: 50 },
];

export const RELIC_THEMES = [
  { id: "celestial", label: "Celestial", palette: ["#0a1430", "#38bdf8", "#f9d77e"], accentClass: "text-sky-200", glow: "rgba(56,189,248,0.32)" },
  { id: "corrupted", label: "Corrupted", palette: ["#171023", "#8b5cf6", "#9ee85f"], accentClass: "text-violet-200", glow: "rgba(139,92,246,0.34)" },
  { id: "floral", label: "Floral", palette: ["#14291f", "#ec6f9b", "#f6e8b8"], accentClass: "text-rose-200", glow: "rgba(236,111,155,0.28)" },
  { id: "gothic", label: "Gothic", palette: ["#111827", "#a51d43", "#cba869"], accentClass: "text-amber-200", glow: "rgba(203,168,105,0.30)" },
  { id: "permafrost", label: "Permafrost", palette: ["#071424", "#93e4ff", "#ddd6fe"], accentClass: "text-cyan-100", glow: "rgba(147,228,255,0.30)" },
];

export const RELIC_EFFECTS = [
  { id: "blue-flame", label: "Blue flame", slot: "flame", cost: 12 },
  { id: "star-orbit", label: "Star orbit", slot: "halo", cost: 18 },
  { id: "petal-drift", label: "Petal drift", slot: "ribbon", cost: 10 },
  { id: "sigil-glow", label: "Sigil mark", slot: "sigil", cost: 16 },
  { id: "snow-dots", label: "Snow dots", slot: "aura", cost: 8 },
  { id: "lore-script", label: "Lore script", slot: "script", cost: 14 },
];

export const RELIC_RARITY_META = {
  common: { label: "Common", weight: 55, className: "border-slate-300/25 bg-slate-300/10 text-slate-100" },
  uncommon: { label: "Uncommon", weight: 25, className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" },
  rare: { label: "Rare", weight: 14, className: "border-sky-300/35 bg-sky-300/10 text-sky-100" },
  epic: { label: "Epic", weight: 5, className: "border-violet-300/40 bg-violet-300/12 text-violet-100" },
  mythic: { label: "Mythic", weight: 1, className: "border-amber-200/50 bg-amber-200/14 text-amber-100" },
};

export const RELIC_CHARM_CATALOG = [
  { key: "ash-thread", name: "Ash Thread", rarity: "common", slot: "ribbon", kind: "wrap", description: "A smoke-dark cord for binding small vows to the relic." },
  { key: "candle-wax-seal", name: "Candle Wax Seal", rarity: "common", slot: "sigil", kind: "seal", description: "A soft seal pressed with a quiet mark." },
  { key: "iron-ring", name: "Iron Ring", rarity: "common", slot: "chain", kind: "ring", description: "Plain iron, warm from being carried." },
  { key: "smoke-ribbon", name: "Smoke Ribbon", rarity: "common", slot: "ribbon", kind: "trail", description: "A trailing ribbon that refuses to stay fully solid." },
  { key: "moonlit-chain", name: "Moonlit Chain", rarity: "uncommon", slot: "chain", kind: "chain", description: "Small links holding a cold lunar sheen." },
  { key: "verdant-knot", name: "Verdant Knot", rarity: "uncommon", slot: "root", kind: "knot", description: "A living knot that tightens near honest promises." },
  { key: "static-sigil", name: "Static Sigil", rarity: "uncommon", slot: "sigil", kind: "sigil", description: "A charged glyph that crackles when the relic wakes." },
  { key: "blue-ember", name: "Blue Ember", rarity: "uncommon", slot: "flame", kind: "ember", description: "A small blue ember that burns without eating air." },
  { key: "star-shard", name: "Star Shard", rarity: "rare", slot: "halo", kind: "shard", description: "A shard that catches light before it arrives." },
  { key: "hollow-bell", name: "Hollow Bell", rarity: "rare", slot: "bell", kind: "bell", description: "A silent bell that rings only in memory." },
  { key: "mirror-thorn", name: "Mirror Thorn", rarity: "rare", slot: "pin", kind: "pin", description: "A reflective thorn that shows the relic from the inside." },
  { key: "bloodrose-pin", name: "Blood-rose Pin", rarity: "rare", slot: "pin", kind: "pin", description: "A dark rose-metal fastener for dramatic attachments." },
  { key: "void-halo", name: "Void Halo", rarity: "epic", slot: "halo", kind: "halo", description: "A thin ring of absence that makes the relic feel heavier." },
  { key: "eclipse-lens", name: "Eclipse Lens", rarity: "epic", slot: "core", kind: "lens", description: "A smoked lens that turns glow into omen." },
  { key: "last-vow-core", name: "Last Vow Core", rarity: "mythic", slot: "core", kind: "core", description: "A mythic core made from a promise that survived the dark." },
  { key: "forsaken-halo", name: "Forsaken Halo", rarity: "mythic", slot: "halo", kind: "halo", description: "A fractured halo with no white edge, only colored fire." },
];

export const DEFAULT_RELIC = {
  name: "Ashen Promise",
  base_type: "lantern",
  theme: "celestial",
  lore: "Forged from a careful vow that learned to glow before it learned where it was going.",
  effects: ["blue-flame", "star-orbit"],
  equipped_charm_ids: [],
  status: "active",
};

export function getRelicBase(baseId) {
  return RELIC_BASES.find((item) => item.id === baseId) || RELIC_BASES[0];
}

export function getRelicTheme(themeId) {
  return RELIC_THEMES.find((item) => item.id === themeId) || RELIC_THEMES[0];
}

export function getCharmDefinition(charmKey) {
  return RELIC_CHARM_CATALOG.find((item) => item.key === charmKey) || RELIC_CHARM_CATALOG[0];
}

export function normalizeRelic(relic = {}) {
  return {
    ...DEFAULT_RELIC,
    ...(relic || {}),
    effects: Array.isArray(relic?.effects) ? relic.effects : DEFAULT_RELIC.effects,
    equipped_charm_ids: Array.isArray(relic?.equipped_charm_ids) ? relic.equipped_charm_ids : [],
  };
}

export function normalizeCharm(charm = {}) {
  const definition = getCharmDefinition(charm.charm_key || charm.key);
  return {
    charm_key: definition.key,
    name: charm.name || definition.name,
    rarity: charm.rarity || definition.rarity,
    slot: charm.slot || definition.slot,
    kind: charm.kind || definition.kind,
    description: charm.description || definition.description,
    equipped: Boolean(charm.equipped),
    acquired_at: charm.acquired_at || new Date().toISOString(),
    source: charm.source || "relic_roll",
    ...charm,
  };
}

export function rollRelicCharm(randomValue = Math.random()) {
  const totalWeight = Object.values(RELIC_RARITY_META).reduce((sum, item) => sum + item.weight, 0);
  let threshold = randomValue * totalWeight;
  let selectedRarity = "common";

  for (const [rarity, meta] of Object.entries(RELIC_RARITY_META)) {
    threshold -= meta.weight;
    if (threshold <= 0) {
      selectedRarity = rarity;
      break;
    }
  }

  const pool = RELIC_CHARM_CATALOG.filter((item) => item.rarity === selectedRarity);
  const selected = pool[Math.floor(Math.random() * pool.length)] || RELIC_CHARM_CATALOG[0];
  return normalizeCharm({
    charm_key: selected.key,
    name: selected.name,
    rarity: selected.rarity,
    slot: selected.slot,
    kind: selected.kind,
    description: selected.description,
    source: "relic_roll",
  });
}

export function getEquippedCharms(charms = []) {
  return charms.filter((charm) => charm.equipped);
}

export function groupCharmsByRarity(charms = []) {
  return charms.reduce((groups, charm) => {
    const rarity = charm.rarity || "common";
    return { ...groups, [rarity]: [...(groups[rarity] || []), charm] };
  }, {});
}
