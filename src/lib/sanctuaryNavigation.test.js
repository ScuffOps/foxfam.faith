import assert from "node:assert/strict";
import test from "node:test";
import {
  SANCTUARY_NAV_ITEMS,
  SANCTUARY_NAV_PREFERENCE_KEY,
  isSanctuaryDestinationActive,
  isSanctuaryRoute,
  readSanctuaryNavPinned,
  writeSanctuaryNavPinned,
} from "./sanctuaryNavigation.js";

test("Sanctuary Mode is limited to the game hub and its supporting collection routes", () => {
  for (const pathname of [
    "/quarters",
    "/quarters/11111111-1111-4111-8111-111111111111",
    "/relic-forge",
    "/collections",
    "/profile/familiar",
    "/starfishing",
    "/match-merge",
    "/boba-cafe",
    "/find-vezmir",
    "/time-runner",
    "/word-garden",
  ]) {
    assert.equal(isSanctuaryRoute(pathname), true, pathname);
  }

  for (const pathname of [
    "/",
    "/profile",
    "/prayer",
    "/calendar",
    "/community",
    "/quarters/guest/details",
    "/quarters-archive",
  ]) {
    assert.equal(isSanctuaryRoute(pathname), false, pathname);
  }
});

test("the compact rail exposes every hub and game destination exactly once", () => {
  const paths = SANCTUARY_NAV_ITEMS.map((item) => item.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.deepEqual(paths, [
    "/",
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
});

test("visitor Quarters highlights the Quarters destination without prefix collisions", () => {
  assert.equal(
    isSanctuaryDestinationActive("/quarters/11111111-1111-4111-8111-111111111111", "/quarters"),
    true,
  );
  assert.equal(isSanctuaryDestinationActive("/quarters-archive", "/quarters"), false);
  assert.equal(isSanctuaryDestinationActive("/match-merge", "/match-merge"), true);
  assert.equal(isSanctuaryDestinationActive("/match-merge/history", "/match-merge"), false);
});

test("the pinned preference fails closed and persists only known values", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  assert.equal(readSanctuaryNavPinned(storage), false);
  writeSanctuaryNavPinned(true, storage);
  assert.equal(values.get(SANCTUARY_NAV_PREFERENCE_KEY), "expanded");
  assert.equal(readSanctuaryNavPinned(storage), true);
  writeSanctuaryNavPinned(false, storage);
  assert.equal(values.get(SANCTUARY_NAV_PREFERENCE_KEY), "rail");
  assert.equal(readSanctuaryNavPinned(storage), false);

  const unavailableStorage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
  };
  assert.equal(readSanctuaryNavPinned(unavailableStorage), false);
  assert.doesNotThrow(() => writeSanctuaryNavPinned(true, unavailableStorage));
});
