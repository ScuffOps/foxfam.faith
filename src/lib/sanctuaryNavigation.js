export const SANCTUARY_NAV_PREFERENCE_KEY = "foxfam_sanctuary_nav_mode";

const SANCTUARY_EXACT_ROUTES = new Set([
  "/quarters",
  "/relic-forge",
  "/collections",
  "/profile/familiar",
  "/starfishing",
  "/match-merge",
  "/boba-cafe",
  "/find-vezmir",
  "/time-runner",
  "/word-garden",
]);

const VISITOR_QUARTERS_ROUTE = /^\/quarters\/[^/]+$/;

export const SANCTUARY_NAV_ITEMS = Object.freeze([
  { path: "/", label: "Portal home", icon: "portal", group: "portal" },
  { path: "/quarters", label: "Quarters", icon: "quarters", group: "hub" },
  { path: "/relic-forge", label: "Relic Forge", icon: "forge", group: "hub" },
  { path: "/collections", label: "Collections", icon: "collections", group: "hub" },
  { path: "/profile/familiar", label: "Familiar Wardrobe", icon: "familiar", group: "hub" },
  { path: "/starfishing", label: "Starfishing", icon: "starfishing", group: "games" },
  { path: "/match-merge", label: "Match & Merge", icon: "merge", group: "games" },
  { path: "/boba-cafe", label: "Boba Shrine Cafe", icon: "boba", group: "games" },
  { path: "/find-vezmir", label: "Find Vezmir", icon: "find", group: "games" },
  { path: "/time-runner", label: "Time Runner", icon: "time", group: "games" },
  { path: "/word-garden", label: "Word Garden", icon: "words", group: "games" },
]);

export function isSanctuaryRoute(pathname) {
  return SANCTUARY_EXACT_ROUTES.has(pathname) || VISITOR_QUARTERS_ROUTE.test(pathname);
}

export function isSanctuaryDestinationActive(pathname, destinationPath) {
  if (destinationPath === "/") return pathname === "/";
  if (destinationPath === "/quarters") {
    return pathname === "/quarters" || VISITOR_QUARTERS_ROUTE.test(pathname);
  }
  return pathname === destinationPath;
}

export function readSanctuaryNavPinned(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(SANCTUARY_NAV_PREFERENCE_KEY) === "expanded";
  } catch {
    return false;
  }
}

export function writeSanctuaryNavPinned(isPinned, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SANCTUARY_NAV_PREFERENCE_KEY, isPinned ? "expanded" : "rail");
  } catch {
    // Navigation remains usable when storage is unavailable.
  }
}
