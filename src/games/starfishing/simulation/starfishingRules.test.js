import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyQteAction,
  beginCast,
  buildCatchRewardIntent,
  createInitialStarfishingState,
  STARFISHING_PHASES,
  tickStarfishing,
  updateFishpedia,
} from "./starfishingRules.js";

describe("starfishingRules", () => {
  it("moves from idle to waiting to qte", () => {
    const started = beginCast(createInitialStarfishingState(), 1000, 0);
    assert.equal(started.phase, STARFISHING_PHASES.waiting);

    const qte = tickStarfishing(started, started.biteAt);
    assert.equal(qte.phase, STARFISHING_PHASES.qte);
  });

  it("catches a fish after matching the qte pattern", () => {
    const started = beginCast(createInitialStarfishingState(), 1000, 0);
    let state = tickStarfishing(started, started.biteAt);

    for (const action of state.qtePattern) {
      state = applyQteAction(state, action, {}, started.biteAt + 50, 0.5);
    }

    assert.equal(state.phase, STARFISHING_PHASES.caught);
    assert.ok(state.lastCatch.fishKey);
    assert.equal(state.catchCount, 1);
  });

  it("does not clear a pending catch when cast input repeats", () => {
    const started = beginCast(createInitialStarfishingState(), 1000, 0);
    let state = tickStarfishing(started, started.biteAt);

    for (const action of state.qtePattern) {
      state = applyQteAction(state, action, {}, started.biteAt + 50, 0.5);
    }

    const recast = beginCast(state, started.biteAt + 500, 0.2);
    assert.equal(recast.phase, STARFISHING_PHASES.caught);
    assert.deepEqual(recast.lastCatch, state.lastCatch);
    assert.equal(recast.lastRewardIntent, state.lastRewardIntent);
  });

  it("escapes a fish on wrong qte action", () => {
    const started = beginCast(createInitialStarfishingState(), 1000, 0);
    const qte = tickStarfishing(started, started.biteAt);
    const escaped = applyQteAction(qte, "qte-down", {}, started.biteAt + 50, 0.5);

    assert.equal(escaped.phase, STARFISHING_PHASES.escaped);
    assert.equal(escaped.streak, 0);
  });

  it("updates fishpedia records", () => {
    const updated = updateFishpedia({}, {
      fishKey: "ember-mote",
      size: 4.2,
      caughtAt: "2026-07-08T00:00:00.000Z",
    });

    assert.equal(updated["ember-mote"].caught, true);
    assert.equal(updated["ember-mote"].count, 1);
    assert.equal(updated["ember-mote"].biggestSize, 4.2);
  });

  it("builds local reward intents for duplicate release choices", () => {
    const intent = buildCatchRewardIntent({
      catchRecord: {
        fishKey: "comet-koi",
        label: "Comet Koi",
        rarity: "rare",
        size: 18,
        duplicate: true,
        caughtAt: "2026-07-08T00:00:00.000Z",
      },
      duplicatePolicy: "release",
      durationMs: 2400,
    });

    assert.equal(intent.gameKey, "starfishing");
    assert.equal(intent.eventType, "duplicate-catch");
    assert.equal(intent.duplicatePolicy, "release");
    assert.equal(intent.favorPreview, 7);
  });
});
