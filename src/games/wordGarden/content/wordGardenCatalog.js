const puzzle = ({ key, title, theme, themePrompt, letters, center, acceptedWords, featuredWords, fullBloomWords }) => Object.freeze({
  key,
  title,
  theme,
  themePrompt,
  letters,
  center,
  acceptedWords: Object.freeze(acceptedWords),
  featuredWords: Object.freeze(featuredWords),
  fullBloomWords: Object.freeze(fullBloomWords),
});

export const WORD_GARDEN_PUZZLES = Object.freeze([
  puzzle({
    key: "petal-rite",
    title: "Petal Rite",
    theme: "Pressed petals and old paper",
    themePrompt: "Find words tucked into the Priory flower press.",
    letters: "PETALSR",
    center: "A",
    acceptedWords: ["AERATE", "ALERT", "ALTAR", "ALTER", "APART", "APPEAL", "APPEAR", "APPLE", "APSE", "AREA", "ARREST", "ASLEEP", "ASSET", "ASTER", "ATLAS", "EASE", "EASEL", "EAST", "EASTER", "EATER", "ELAPSE", "ELATE", "ERASE", "LASER", "LAST", "LATE", "LATER", "LATEST", "LATTER", "LEAP", "LEAPT", "LEASE", "LEAST", "PALE", "PALATE", "PALETTE", "PAPER", "PAPERS", "PARLERS", "PAST", "PEAR", "PEARS", "PETAL", "PETALS", "PLATE", "PLATES", "PLEAT", "RATE", "RATES", "REAL", "REAP", "SALE", "SALT", "SEAL", "SLATE", "SPARE", "SPEAR", "STALE", "STAPLE", "STAR", "START", "TAPE", "TAPER", "TAPERS", "TEAR", "TEARS", "PETALERS"],
    featuredWords: ["PALE", "PETAL", "PLATE", "SLATE", "STAPLE", "APPLE", "PALETTE", "PETALERS"],
    fullBloomWords: ["PETALERS"],
  }),
  puzzle({
    key: "planter-song",
    title: "Planter Song",
    theme: "Seed packets and lantern songs",
    themePrompt: "Unfold words from a gardener's planting notes.",
    letters: "PLANTER",
    center: "A",
    acceptedWords: ["ALERT", "ALTER", "APPAREL", "APPARENT", "APPEAL", "APPEAR", "APPLE", "AREA", "ARENA", "EARN", "EATER", "ELATE", "ENTRAP", "LANE", "LANTERN", "LATE", "LATENT", "LATER", "LEAN", "LEAP", "LEARN", "NEAR", "PALE", "PANEL", "PARENT", "PEAR", "PETAL", "PLANE", "PLANER", "PLANET", "PLANT", "PLANTER", "PLATE", "PLEAT", "RATE", "REAL", "RENTAL", "TALE", "TALENT", "TAPER", "TEAR", "TRAP"],
    featuredWords: ["LATE", "PALE", "PLANT", "PLANE", "PANEL", "PLANET", "LANTERN", "PLANTER"],
    fullBloomWords: ["PLANTER"],
  }),
  puzzle({
    key: "garden-vow",
    title: "Garden Vow",
    theme: "Promises kept among green things",
    themePrompt: "Gather words from the Priory's oldest garden vow.",
    letters: "GARDENS",
    center: "A",
    acceptedWords: ["AGED", "AGENDA", "AGREE", "ANGER", "AREA", "ARENA", "DANGER", "DARE", "DARN", "DEAD", "DEAN", "DEAR", "DEGRADE", "DRAG", "DREAD", "EAGER", "EARN", "EASE", "ENGAGE", "ENRAGE", "ERASE", "ERRAND", "GARDEN", "GARDENS", "GEAR", "GRAND", "RAGE", "RANGE", "RANGER", "RANGES", "READ", "SAGE", "SAND", "SNARE"],
    featuredWords: ["DARE", "SAGE", "GEAR", "GRAND", "RANGE", "GARDEN", "DANGER", "GARDENS"],
    fullBloomWords: ["GARDENS"],
  }),
  puzzle({
    key: "violet-hour",
    title: "Violet Hour",
    theme: "Violets beneath evening glass",
    themePrompt: "Trace words through the conservatory at dusk.",
    letters: "VIOLETS",
    center: "O",
    acceptedWords: ["EVOLVE", "LOVE", "LOSE", "LOST", "OLIVE", "SILO", "SLOE", "SLOT", "SOIL", "SOLE", "SOLO", "SOLVE", "SOOT", "STOLE", "STOOL", "STOVE", "TOIL", "TOILET", "TOLL", "TOOL", "TOOT", "TOTE", "VETO", "VIOLET", "VIOLETS", "VOLE", "VOLT", "VOTE"],
    featuredWords: ["LOVE", "SOIL", "SOLE", "TOIL", "OLIVE", "STOVE", "VIOLET", "VIOLETS"],
    fullBloomWords: ["VIOLETS"],
  }),
  puzzle({
    key: "thorned-path",
    title: "Thorned Path",
    theme: "A bramble path after moonrise",
    themePrompt: "Find the words that lead safely through the thorns.",
    letters: "THORNED",
    center: "O",
    acceptedWords: ["DENOTE", "DETHRONE", "DONE", "DONOR", "DOOR", "DOTE", "DRONE", "ERODE", "HERO", "HERON", "HONOR", "HOOD", "HOOT", "HORN", "HORNET", "NEON", "NODE", "NOON", "NORTH", "NORTHERN", "NOTE", "ODOR", "ORDER", "OTHER", "OTTER", "REDO", "REDONE", "RODE", "RODENT", "RODEO", "ROOT", "ROTE", "ROTTEN", "TENDON", "TENON", "TENOR", "THORN", "THORNED", "THRONE", "TONE", "TOON", "TOOT", "TOOTH", "TORE", "TORN", "TORRENT"],
    featuredWords: ["HORN", "NOTE", "TONE", "NORTH", "OTHER", "THORN", "THRONE", "THORNED"],
    fullBloomWords: ["THORNED"],
  }),
  puzzle({
    key: "pollen-drift",
    title: "Pollen Drift",
    theme: "Pollen floating through open windows",
    themePrompt: "Catch words as they drift across the greenhouse.",
    letters: "FLOWERS",
    center: "O",
    acceptedWords: ["FLOSS", "FLOOR", "FLOORS", "FLOW", "FLOWER", "FLOWERS", "FLOWS", "FOOL", "FOOLS", "FORE", "FORES", "FOWL", "FOWLS", "LOOSE", "LOSE", "LOWER", "LOWERS", "LOWS", "OWES", "ROLE", "ROLES", "ROSE", "ROWS", "SLOW", "SLOWER", "SOLE", "SORE", "WOLF", "WOLFS", "WOOL", "WOOF", "WORE"],
    featuredWords: ["FLOW", "ROSE", "SLOW", "FLOWS", "LOWER", "FLOWER", "SLOWER", "FLOWERS"],
    fullBloomWords: ["FLOWERS"],
  }),
  puzzle({
    key: "meadow-rest",
    title: "Meadow Rest",
    theme: "A quiet meadow after rain",
    themePrompt: "Settle into the soft words hidden in the meadow.",
    letters: "MEADOWS",
    center: "A",
    acceptedWords: ["AMASS", "AWESOME", "DAME", "DEAD", "DOODAD", "EASE", "MADAM", "MADE", "MASS", "MEAD", "MEADOW", "MEADOWS", "MESA", "SAME", "SAWED", "SEAM", "SEESAW", "SESAME", "SODA", "SWAM", "WADE"],
    featuredWords: ["DAME", "MADE", "SAME", "SEAM", "WADE", "MEAD", "MEADOW", "MEADOWS"],
    fullBloomWords: ["MEADOWS"],
  }),
]);

export function getLocalDateKey(now = Date.now()) {
  const date = now instanceof Date ? now : new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveWordGardenPuzzleGuide(puzzleKey = "") {
  const normalizedKey = String(puzzleKey).toLowerCase();
  return WORD_GARDEN_PUZZLES.find((candidate) => normalizedKey === candidate.key || normalizedKey.startsWith(`${candidate.key}-`)) || WORD_GARDEN_PUZZLES[0];
}

export function getDailyWordGardenPuzzle(seedKey = getLocalDateKey()) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(seedKey));
  if (dateMatch) {
    const date = Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
    const anchor = Date.UTC(2026, 7, 10);
    const dayOffset = Math.floor((date - anchor) / 86_400_000);
    const index = ((dayOffset % WORD_GARDEN_PUZZLES.length) + WORD_GARDEN_PUZZLES.length) % WORD_GARDEN_PUZZLES.length;
    return WORD_GARDEN_PUZZLES[index];
  }

  const hash = Array.from(String(seedKey)).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
  return WORD_GARDEN_PUZZLES[hash % WORD_GARDEN_PUZZLES.length];
}
