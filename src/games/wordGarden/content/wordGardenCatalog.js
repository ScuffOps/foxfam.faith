export const WORD_GARDEN_PUZZLES = Object.freeze([
  Object.freeze({
    key: "petal-rite",
    title: "Petal Rite",
    letters: "PETALSR",
    center: "A",
    acceptedWords: Object.freeze(["PALE", "PALETTE", "PAPER", "PAPERS", "PARLERS", "PAST", "PEAR", "PEARS", "PETAL", "PETALS", "PLATE", "PLATES", "PLEAT", "RATE", "RATES", "REAL", "REAP", "SALE", "SALT", "SEAL", "SLATE", "SPARE", "SPEAR", "STALE", "STAPLE", "STAR", "START", "TAPE", "TAPER", "TAPERS", "TEAR", "TEARS", "PETALERS"]),
    fullBloomWords: Object.freeze(["PETALERS"]),
  }),
  Object.freeze({
    key: "clover-vow",
    title: "Clover Vow",
    letters: "CLOVERS",
    center: "O",
    acceptedWords: Object.freeze(["CLOVE", "CLOVER", "CLOVERS", "COOL", "CORE", "COVER", "COVERS", "LOVE", "LOVER", "LOVERS", "ROSE", "SOLE", "SORE", "VOLE"]),
    fullBloomWords: Object.freeze(["CLOVERS"]),
  }),
  Object.freeze({
    key: "charmed-hour",
    title: "Charmed Hour",
    letters: "CHARMED",
    center: "A",
    acceptedWords: Object.freeze(["ACHE", "ACRE", "ARCH", "CHARM", "CHARMED", "DARE", "DREAM", "HARE", "HARM", "HEARD", "MADE", "MARE", "RACE", "READ"]),
    fullBloomWords: Object.freeze(["CHARMED"]),
  }),
]);

export function getLocalDateKey(now = Date.now()) {
  const date = now instanceof Date ? now : new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailyWordGardenPuzzle(seedKey = getLocalDateKey()) {
  const hash = Array.from(String(seedKey)).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
  return WORD_GARDEN_PUZZLES[hash % WORD_GARDEN_PUZZLES.length];
}
