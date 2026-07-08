import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFindVezmirRewardIntent,
  createInitialFindVezmirState,
  FIND_VEZMIR_PHASES,
  getNextFindVezmirTarget,
  hitTestFindVezmirHotspot,
  requestFindVezmirHint,
  resolveFindVezmirTap,
} from "./findVezmirRules.js";

describe("findVezmirRules", () => {
  it("starts with deterministic clue order", () => {
    const state = createInitialFindVezmirState({ now: 1000 });
    assert.equal(state.phase, FIND_VEZMIR_PHASES.seeking);
    assert.equal(getNextFindVezmirTarget(state).key, "moon-mug");
  });

  it("does not allow Vezmir before every clue is found", () => {
    const state = createInitialFindVezmirState({ now: 1000 });
    const next = resolveFindVezmirTap(state, { objectKey: "vezmir" }, 1200);

    assert.equal(next.phase, FIND_VEZMIR_PHASES.seeking);
    assert.equal(next.foundKeys.includes("vezmir"), false);
    assert.equal(next.focus, 4);
    assert.equal(next.misses, 1);
  });

  it("moves to Vezmir-ready after all clue objects are found", () => {
    let state = createInitialFindVezmirState({ now: 1000 });
    for (const key of ["moon-mug", "ribbon-bell", "fox-pin", "star-note", "seed-pouch"]) {
      state = resolveFindVezmirTap(state, { objectKey: key }, 1100);
    }

    assert.equal(state.phase, FIND_VEZMIR_PHASES.vezmirReady);
    assert.equal(getNextFindVezmirTarget(state).key, "vezmir");
  });

  it("completes after Vezmir is found and builds a local reward intent", () => {
    let state = createInitialFindVezmirState({ now: 1000 });
    for (const key of ["moon-mug", "ribbon-bell", "fox-pin", "star-note", "seed-pouch", "vezmir"]) {
      state = resolveFindVezmirTap(state, { objectKey: key }, 3000);
    }
    const intent = buildFindVezmirRewardIntent({
      state,
      eventId: "find-vezmir-test",
      createdAt: "2026-07-08T00:00:00.000Z",
    });

    assert.equal(state.phase, FIND_VEZMIR_PHASES.complete);
    assert.equal(intent.gameKey, "find-vezmir");
    assert.equal(intent.eventType, "hidden-object-clear");
    assert.equal(intent.duplicatePolicy, "none");
    assert.ok(intent.achievementKeys.includes("found-vezmir"));
    assert.ok(intent.favorPreview > 0);
  });

  it("hit tests percentage hotspots without renderer state", () => {
    const object = hitTestFindVezmirHotspot({ x: 18, y: 74 });
    assert.equal(object.key, "moon-mug");
    assert.equal(hitTestFindVezmirHotspot({ x: 4, y: 4 }), null);
  });

  it("hints select the next unfound target and apply deterministic scoring", () => {
    const state = requestFindVezmirHint(createInitialFindVezmirState({ now: 1000 }));

    assert.equal(state.activeHintKey, "moon-mug");
    assert.equal(state.hintsUsed, 1);
    assert.equal(state.score, 183);
  });
});

