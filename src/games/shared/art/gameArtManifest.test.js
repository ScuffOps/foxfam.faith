import assert from "node:assert/strict";
import test from "node:test";
import { GAME_WORLD_ORDER } from "../../../lib/gameHubCatalog.js";
import {
  GAME_ART_APPROVAL,
  GAME_ART_CLASSES,
  GAME_ART_PERSPECTIVES,
  GAME_ART_SLOTS,
  getGameArtSlots,
} from "./gameArtManifest.js";

test("every staged world has an environment and interaction-ready art family", () => {
  for (const world of GAME_WORLD_ORDER) {
    const slots = getGameArtSlots(world.key);
    assert.ok(slots.length >= 3, `${world.key} needs at least three production art slots`);
    assert.ok(slots.some((slot) => slot.assetClass === GAME_ART_CLASSES.environment), `${world.key} needs an environment slot`);
    assert.ok(slots.some((slot) => [GAME_ART_CLASSES.interaction, GAME_ART_CLASSES.prop, GAME_ART_CLASSES.sprite].includes(slot.assetClass)), `${world.key} needs interactive art`);
  }
});

test("art slots use unique ids and approved export vocabulary", () => {
  assert.equal(new Set(GAME_ART_SLOTS.map((slot) => slot.id)).size, GAME_ART_SLOTS.length);
  const classes = new Set(Object.values(GAME_ART_CLASSES));
  const perspectives = new Set(Object.values(GAME_ART_PERSPECTIVES));
  const approvals = new Set(Object.values(GAME_ART_APPROVAL));

  for (const slot of GAME_ART_SLOTS) {
    assert.ok(classes.has(slot.assetClass));
    assert.ok(perspectives.has(slot.perspective));
    assert.ok(approvals.has(slot.approval));
    assert.match(slot.aspect, /^\d+:\d+$/);
    assert.ok(slot.brief.length >= 24);
  }
});

test("no art slot is marked approved before the rendered checkpoint", () => {
  assert.ok(GAME_ART_SLOTS.every((slot) => slot.approval === GAME_ART_APPROVAL.awaitingRender));
});
