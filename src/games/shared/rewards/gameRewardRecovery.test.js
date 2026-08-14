import assert from "node:assert/strict";
import test from "node:test";

import {
  clearGameRewardRecovery,
  readGameRewardRecovery,
  updateRewardSessionContext,
  writeGameRewardRecovery,
} from "./gameRewardRecovery.js";

const OWNER_ID = "owner-a";
const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function session(gameKey = "match-merge") {
  return {
    sessionId: SESSION_ID,
    gameKey,
    context: { action_index: 2, score: 55 },
    startedAt: "2026-08-13T12:00:00.000Z",
  };
}

test("stores retry intent and canonical session state per owner and game", () => {
  const storage = createStorage();
  const request = {
    kind: "action",
    idempotencyKey: REQUEST_ID,
    action: { op: "merge", from: 0, to: 1 },
  };
  assert.equal(writeGameRewardRecovery(storage, {
    gameKey: "match-merge",
    ownerId: OWNER_ID,
    request,
    session: session(),
  }), true);
  assert.deepEqual(readGameRewardRecovery(storage, {
    gameKey: "match-merge",
    ownerId: OWNER_ID,
  })?.request, request);
  assert.equal(readGameRewardRecovery(storage, {
    gameKey: "match-merge",
    ownerId: "owner-b",
  }), null);
});

test("requires a canonical session for action and claim retries", () => {
  const storage = createStorage();
  assert.equal(writeGameRewardRecovery(storage, {
    gameKey: "boba-cafe",
    ownerId: OWNER_ID,
    request: { kind: "claim", idempotencyKey: REQUEST_ID },
  }), false);
  assert.equal(writeGameRewardRecovery(storage, {
    gameKey: "boba-cafe",
    ownerId: OWNER_ID,
    request: { kind: "start" },
  }), true);
});

test("rejects malformed, oversized, and cross-game recovery payloads", () => {
  const storage = createStorage();
  assert.equal(writeGameRewardRecovery(storage, {
    gameKey: "word-garden",
    ownerId: OWNER_ID,
    request: { kind: "action", idempotencyKey: "not-a-uuid", action: { op: "rest" } },
    session: session("word-garden"),
  }), false);
  assert.equal(writeGameRewardRecovery(storage, {
    gameKey: "word-garden",
    ownerId: OWNER_ID,
    request: { kind: "action", idempotencyKey: REQUEST_ID, action: { op: "submit", word: "X".repeat(5000) } },
    session: session("word-garden"),
  }), false);
  assert.equal(writeGameRewardRecovery(storage, {
    gameKey: "time-runner",
    ownerId: OWNER_ID,
    request: { kind: "claim", idempotencyKey: REQUEST_ID },
    session: session("match-merge"),
  }), false);
});

test("clears only the selected owner and game recovery", () => {
  const storage = createStorage();
  for (const ownerId of [OWNER_ID, "owner-b"]) {
    writeGameRewardRecovery(storage, {
      gameKey: "puzzle-cat",
      ownerId,
      request: { kind: "start" },
    });
  }
  clearGameRewardRecovery(storage, { gameKey: "puzzle-cat", ownerId: OWNER_ID });
  assert.equal(readGameRewardRecovery(storage, { gameKey: "puzzle-cat", ownerId: OWNER_ID }), null);
  assert.ok(readGameRewardRecovery(storage, { gameKey: "puzzle-cat", ownerId: "owner-b" }));
});

test("refreshes canonical session context without losing session identity", () => {
  const current = session();
  assert.deepEqual(updateRewardSessionContext(current, { action_index: 3, score: 110 }), {
    ...current,
    context: { action_index: 3, score: 110 },
  });
});
