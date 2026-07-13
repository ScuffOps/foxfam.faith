export const GAME_COLORS = Object.freeze({
  dreamLinen: "#FAF3EB",
  pinkPetals: "#F8E6E6",
  greenFields: "#EAEEE0",
  malibuBlue: "#D9E6EC",
  lavenderChalk: "#EEE8E8",
  trulyTeal: "#80ADBC",
  roseClay: "#D5A1A3",
  bellBlue: "#B4C6DC",
  hymnGold: "#DFD8AB",
  forgeBiscuit: "#CAB08B",
  ink: "#364152",
  outline: "#485365",
});

export const GAME_WORLD_ACCENTS = Object.freeze({
  starfishing: { surface: GAME_COLORS.trulyTeal, text: GAME_COLORS.ink },
  "match-merge": { surface: GAME_COLORS.lavenderChalk, text: GAME_COLORS.ink },
  "boba-cafe": { surface: GAME_COLORS.pinkPetals, text: GAME_COLORS.ink },
  "puzzle-cat": { surface: GAME_COLORS.greenFields, text: GAME_COLORS.ink },
  "time-runner": { surface: GAME_COLORS.bellBlue, text: GAME_COLORS.ink },
  "word-garden": { surface: GAME_COLORS.hymnGold, text: GAME_COLORS.ink },
});

export function getWorldAccent(worldKey) {
  return GAME_WORLD_ACCENTS[worldKey] || {
    surface: GAME_COLORS.malibuBlue,
    text: GAME_COLORS.ink,
  };
}
