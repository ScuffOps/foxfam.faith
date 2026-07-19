import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  abandonServerClaim,
  applyStarfishingAction,
  applyQteAction,
  beginCast,
  beginServerCast,
  beginServerClaim,
  buildCatchRewardIntent,
  createPendingClaimSnapshot,
  createInitialStarfishingState,
  failServerCast,
  failServerClaim,
  getOwnerPendingClaimEnvelope,
  getSignedInClaimPolicy,
  isClaimContextCurrent,
  planStarfishingSessionTransition,
  receiveServerClaim,
  receiveServerTicket,
  removeOwnerPendingClaimEnvelope,
  restorePendingClaimSnapshot,
  STARFISHING_PHASES,
  tickStarfishing,
  upsertOwnerPendingClaimEnvelope,
  updateFishpedia,
} from "./starfishingRules.js";
import { GAME_ACTIONS } from "../../shared/input/actions.js";

describe("starfishingRules", () => {
  it("moves from idle to waiting to qte", () => {
    const started = beginCast(createInitialStarfishingState(), 1000, 0);
    assert.equal(started.phase, STARFISHING_PHASES.waiting);

    const qte = tickStarfishing(started, started.biteAt);
    assert.equal(qte.phase, STARFISHING_PHASES.qte);
  });

  it("starts a cast from idle through the semantic primary action", () => {
    const state = applyStarfishingAction(
      createInitialStarfishingState(),
      GAME_ACTIONS.primary,
      {},
      1000,
      0,
    );

    assert.equal(state.phase, STARFISHING_PHASES.waiting);
    assert.equal(state.castStartedAt, 1000);
  });

  it("advances a qte through semantic directional actions", () => {
    const started = beginCast(createInitialStarfishingState(), 1000, 0);
    const qte = tickStarfishing(started, started.biteAt);
    const firstAction = {
      "qte-left": GAME_ACTIONS.moveLeft,
      "qte-up": GAME_ACTIONS.moveUp,
      "qte-right": GAME_ACTIONS.moveRight,
      "qte-down": GAME_ACTIONS.moveDown,
    }[qte.qtePattern[0]];

    const advanced = applyStarfishingAction(qte, firstAction, {}, started.biteAt + 50, 0.5);

    assert.equal(advanced.qteIndex, 1);
    assert.notEqual(advanced.phase, STARFISHING_PHASES.escaped);
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
    assert.equal(state.qteCompletedAt, started.biteAt + 50);
    assert.equal(state.completionDurationMs, started.biteAt + 50 - started.castStartedAt);
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

  it("creates exactly one reward intent for one duplicate choice", () => {
    const caught = {
      fishKey: "comet-koi",
      label: "Comet Koi",
      rarity: "rare",
      size: 18,
      duplicate: true,
      caughtAt: "2026-07-08T00:00:00.000Z",
    };

    const first = buildCatchRewardIntent({ catchRecord: caught, duplicatePolicy: "convert", durationMs: 2400 });

    assert.ok(first);
    assert.equal(first.duplicatePolicy, "convert");
    assert.equal(first.eventType, "duplicate-catch");
    assert.equal(first.items.length, 1);
  });

  it("requests a server cast without selecting a local fish", () => {
    const state = beginServerCast(createInitialStarfishingState());

    assert.equal(state.phase, STARFISHING_PHASES.requestingCast);
    assert.equal(state.activeFish, null);
    assert.equal(state.serverTicket, null);
  });

  it("uses the server ticket to select the fish and qte length", () => {
    const requesting = beginServerCast(createInitialStarfishingState());
    const ticket = {
      ticketId: "223e4567-e89b-42d3-a456-426614174000",
      fishKey: "lunar-guppy",
      qteLength: 3,
      appliedEffects: [],
      notBefore: "2026-07-18T12:00:01.000Z",
      expiresAt: "2026-07-18T12:10:00.000Z",
    };
    const waiting = receiveServerTicket(requesting, ticket, 1000);

    assert.equal(waiting.phase, STARFISHING_PHASES.waiting);
    assert.equal(waiting.activeFish.key, ticket.fishKey);
    assert.equal(waiting.qtePattern.length, ticket.qteLength);
    assert.equal(waiting.serverTicket.ticketId, ticket.ticketId);
  });

  it("preserves a caught fish and one idempotency key while claiming", () => {
    const caught = {
      ...createInitialStarfishingState(),
      phase: STARFISHING_PHASES.caught,
      lastCatch: { fishKey: "lunar-guppy", size: 4.2 },
      serverTicket: { ticketId: "223e4567-e89b-42d3-a456-426614174000" },
    };
    const claiming = beginServerClaim(
      caught,
      "423e4567-e89b-42d3-a456-426614174000",
      "keep",
      { actionCount: 1, missCount: 0, durationMs: 1200 },
    );

    assert.equal(claiming.phase, STARFISHING_PHASES.claiming);
    assert.equal(
      claiming.pendingClaim.idempotencyKey,
      "423e4567-e89b-42d3-a456-426614174000",
    );
    assert.equal(claiming.pendingClaim.telemetry.durationMs, 1200);
    assert.deepEqual(claiming.lastCatch, caught.lastCatch);
  });

  it("always uses keep as the neutral signed-in preclaim policy", () => {
    assert.equal(getSignedInClaimPolicy(), "keep");
  });

  it("records authoritative claim data and returns to idle", () => {
    const claiming = {
      ...createInitialStarfishingState(),
      phase: STARFISHING_PHASES.claiming,
      lastCatch: { fishKey: "lunar-guppy", size: 4.2 },
      pendingClaim: {
        idempotencyKey: "423e4567-e89b-42d3-a456-426614174000",
        duplicatePolicy: "none",
      },
    };
    const result = {
      catch: { fishKey: "lunar-guppy", size: 4.4 },
      fishpedia: { fishKey: "lunar-guppy", caughtCount: 1 },
      favor: { delta: 3, balance: 12 },
      materials: [],
      achievements: [],
      charms: [],
      appliedEffects: [],
      replayed: false,
    };
    const claimed = receiveServerClaim(claiming, result);

    assert.equal(claimed.phase, STARFISHING_PHASES.idle);
    assert.equal(claimed.lastClaim.favor.balance, 12);
    assert.equal(claimed.lastCatch.size, 4.4);
    assert.equal(claimed.pendingClaim, null);
  });

  it("keeps claim identity and catch data after a retryable failure", () => {
    const claiming = {
      ...createInitialStarfishingState(),
      phase: STARFISHING_PHASES.claiming,
      lastCatch: { fishKey: "lunar-guppy", size: 4.2 },
      pendingClaim: {
        idempotencyKey: "423e4567-e89b-42d3-a456-426614174000",
        duplicatePolicy: "none",
      },
    };
    const failed = failServerClaim(claiming, {
      code: "STARFISHING_TEMPORARILY_UNAVAILABLE",
      message: "Starfishing is resting for a moment. Please try again.",
      retryable: true,
    });
    const retried = beginServerClaim(
      failed,
      failed.pendingClaim.idempotencyKey,
      failed.pendingClaim.duplicatePolicy,
    );

    assert.equal(failed.phase, STARFISHING_PHASES.claimError);
    assert.equal(failed.claimError.retryable, true);
    assert.deepEqual(failed.lastCatch, claiming.lastCatch);
    assert.equal(
      retried.pendingClaim.idempotencyKey,
      claiming.pendingClaim.idempotencyKey,
    );
    assert.equal(abandonServerClaim(failed), failed);
  });

  it("only abandons a claim after a definitive no-commit rejection", () => {
    const failed = {
      ...createInitialStarfishingState(),
      phase: STARFISHING_PHASES.claimError,
      lastCatch: { fishKey: "lunar-guppy" },
      pendingClaim: {
        idempotencyKey: "423e4567-e89b-42d3-a456-426614174000",
        duplicatePolicy: "keep",
      },
      claimError: {
        code: "STARFISHING_REQUEST_REJECTED",
        message: "The claim was rejected before commit.",
        definitiveNoCommit: true,
      },
    };

    const abandoned = abandonServerClaim(failed);
    assert.equal(abandoned.phase, STARFISHING_PHASES.idle);
    assert.equal(abandoned.pendingClaim, null);
  });

  it("guards delayed and in-flight claims with mount and session epochs", () => {
    assert.equal(isClaimContextCurrent({
      isMounted: true,
      expectedEpoch: 4,
      currentEpoch: 4,
    }), true);
    assert.equal(isClaimContextCurrent({
      isMounted: false,
      expectedEpoch: 4,
      currentEpoch: 4,
    }), false);
    assert.equal(isClaimContextCurrent({
      isMounted: true,
      expectedEpoch: 4,
      currentEpoch: 5,
    }), false);
  });

  it("restores an unresolved claim only for the same signed-in owner", () => {
    const ownerId = "123e4567-e89b-42d3-a456-426614174000";
    const claiming = {
      ...createInitialStarfishingState(),
      phase: STARFISHING_PHASES.claimError,
      serverTicket: {
        ticketId: "223e4567-e89b-42d3-a456-426614174000",
        fishKey: "lunar-guppy",
      },
      pendingClaim: {
        idempotencyKey: "423e4567-e89b-42d3-a456-426614174000",
        duplicatePolicy: "keep",
        telemetry: { actionCount: 1, missCount: 0, durationMs: 1400 },
      },
      lastCatch: { fishKey: "lunar-guppy", label: "Lunar Guppy" },
      claimError: {
        code: "STARFISHING_TEMPORARILY_UNAVAILABLE",
        definitiveNoCommit: false,
      },
    };
    const snapshot = createPendingClaimSnapshot(claiming, ownerId);
    const initial = createInitialStarfishingState();
    const restored = restorePendingClaimSnapshot(initial, snapshot, ownerId);

    assert.equal(restored.phase, STARFISHING_PHASES.claimError);
    assert.equal(
      restored.pendingClaim.idempotencyKey,
      claiming.pendingClaim.idempotencyKey,
    );
    assert.equal(
      restorePendingClaimSnapshot(initial, snapshot, "other-owner"),
      initial,
    );
  });

  it("stores unresolved envelopes independently for each owner", () => {
    const ownerA = "123e4567-e89b-42d3-a456-426614174000";
    const ownerB = "223e4567-e89b-42d3-a456-426614174000";
    const envelopeA = {
      ownerId: ownerA,
      serverTicket: { ticketId: "523e4567-e89b-42d3-a456-426614174000" },
      pendingClaim: { idempotencyKey: "323e4567-e89b-42d3-a456-426614174000" },
    };
    const envelopeB = {
      ownerId: ownerB,
      serverTicket: { ticketId: "623e4567-e89b-42d3-a456-426614174000" },
      pendingClaim: { idempotencyKey: "423e4567-e89b-42d3-a456-426614174000" },
    };

    const withA = upsertOwnerPendingClaimEnvelope(null, envelopeA);
    const withBoth = upsertOwnerPendingClaimEnvelope(withA, envelopeB);
    const migratedLegacy = upsertOwnerPendingClaimEnvelope(envelopeA, envelopeB);
    const withoutB = removeOwnerPendingClaimEnvelope(withBoth, ownerB);

    assert.equal(getOwnerPendingClaimEnvelope(withA, ownerB), null);
    assert.equal(
      getOwnerPendingClaimEnvelope(withBoth, ownerA).pendingClaim.idempotencyKey,
      envelopeA.pendingClaim.idempotencyKey,
    );
    assert.equal(
      getOwnerPendingClaimEnvelope(withBoth, ownerB).pendingClaim.idempotencyKey,
      envelopeB.pendingClaim.idempotencyKey,
    );
    assert.equal(getOwnerPendingClaimEnvelope(withoutB, ownerB), null);
    assert.equal(
      getOwnerPendingClaimEnvelope(withoutB, ownerA).pendingClaim.idempotencyKey,
      envelopeA.pendingClaim.idempotencyKey,
    );
    assert.equal(
      getOwnerPendingClaimEnvelope(migratedLegacy, ownerA).pendingClaim.idempotencyKey,
      envelopeA.pendingClaim.idempotencyKey,
    );
    assert.doesNotMatch(JSON.stringify(withBoth), /access_token|refresh_token|credential/i);
  });

  it("plans reactive guest, owner-switch, and signed-out transitions", () => {
    const guestToA = planStarfishingSessionTransition({
      currentOwnerId: "",
      nextOwnerId: "owner-a",
      currentEpoch: 2,
    });
    const aToB = planStarfishingSessionTransition({
      currentOwnerId: "owner-a",
      nextOwnerId: "owner-b",
      currentEpoch: guestToA.nextEpoch,
    });
    const bToGuest = planStarfishingSessionTransition({
      currentOwnerId: "owner-b",
      nextOwnerId: "",
      currentEpoch: aToB.nextEpoch,
    });

    assert.equal(guestToA.shouldReloadProgression, true);
    assert.equal(guestToA.shouldRestoreEnvelope, true);
    assert.equal(guestToA.authMode, "signed-in");
    assert.equal(aToB.shouldReloadProgression, true);
    assert.equal(aToB.shouldResetServerState, true);
    assert.equal(aToB.nextEpoch, 4);
    assert.equal(bToGuest.authMode, "guest");
    assert.equal(bToGuest.shouldReloadProgression, false);
    assert.equal(bToGuest.shouldResetServerState, true);
  });

  it("returns a failed cast request to an actionable idle state", () => {
    const failed = failServerCast(beginServerCast(createInitialStarfishingState()), {
      code: "STARFISHING_REQUEST_REJECTED",
      message: "That Starfishing action could not be accepted.",
      retryable: false,
    });

    assert.equal(failed.phase, STARFISHING_PHASES.idle);
    assert.equal(failed.serverError.code, "STARFISHING_REQUEST_REJECTED");
  });
});
