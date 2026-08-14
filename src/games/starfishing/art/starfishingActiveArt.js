import { getApprovedGameArtFamily } from "@/games/shared/art/gameArtManifest";

export const STARFISHING_ACTIVE_ART_SLOT_IDS = Object.freeze([
  "starfishing.rig",
  "starfishing.fisher",
  "starfishing.fish-family",
  "starfishing.qte",
]);

export const STARFISHING_FISHER_ATLAS = Object.freeze({
  columns: 3,
  rows: 2,
  speciesOrder: Object.freeze([
    "fox-cat",
    "moon-rabbit",
    "shrine-cat",
    "cloud-poodle",
    "moss-turtle",
    "moon-seal",
  ]),
});

export const STARFISHING_FISH_ATLAS = Object.freeze({ columns: 3, rows: 2 });
export const STARFISHING_QTE_ATLAS = Object.freeze({ columns: 2, rows: 2 });

const SLOT_TO_KEY = Object.freeze({
  "starfishing.rig": "rig",
  "starfishing.fisher": "fisher",
  "starfishing.fish-family": "fishFamily",
  "starfishing.qte": "qte",
});

export function getApprovedStarfishingActiveArt() {
  const family = getApprovedGameArtFamily(STARFISHING_ACTIVE_ART_SLOT_IDS);
  if (!family) return null;
  return Object.freeze(Object.fromEntries(
    STARFISHING_ACTIVE_ART_SLOT_IDS.map((slotId) => [SLOT_TO_KEY[slotId], family[slotId]]),
  ));
}
