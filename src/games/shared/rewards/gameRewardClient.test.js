import assert from "node:assert/strict";
import test from "node:test";

import {
  GameRewardClientError,
  claimGameReward,
  progressGameRewardSession,
  startGameRewardSession,
} from "./gameRewardClient.js";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const IDEMPOTENCY_KEY = "22222222-2222-4222-8222-222222222222";

function sessionPayload() {
  return {
    session_id: SESSION_ID,
    game_key: "word-garden",
    rules_version: 1,
    seed: "33333333-3333-4333-8333-333333333333",
    puzzle: { date: "2026-07-21", key: "petal-rite", title: "Petal Rite", letters: "PETALSR", center: "A" },
    started_at: "2026-07-21T12:00:00.000Z",
    expires_at: "2026-07-21T12:30:00.000Z",
  };
}

test("starts a reward session with only the game key", async () => {
  const calls = [];
  const client = { async rpc(name, params) { calls.push({ name, params }); return { data: sessionPayload(), error: null }; } };
  const session = await startGameRewardSession(client, "word-garden");
  assert.equal(session.sessionId, SESSION_ID);
  assert.deepEqual(calls, [{ name: "start_game_reward_session", params: { requested_game_key: "word-garden" } }]);
});

test("claims with evidence only and never accepts reward fields", async () => {
  const calls = [];
  const client = {
    async rpc(name, params) {
      calls.push({ name, params });
      return {
        data: {
          reward_event_id: "44444444-4444-4444-8444-444444444444",
          session_id: SESSION_ID,
          game_key: "word-garden",
          score: 4,
          favor: { delta: 3, balance: 3, cap_remaining: 77 },
          materials: [{ key: "blooming-ink", delta: 1, balance: 1 }],
          achievements: [{ key: "word-garden-first-sprout", title: "First Sprout" }],
          replayed: false,
        },
        error: null,
      };
    },
  };

  await claimGameReward(client, {
    sessionId: SESSION_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    evidence: { found_words: ["PALE"] },
  });

  assert.deepEqual(calls[0], {
    name: "claim_game_reward",
    params: {
      claim_session_id: SESSION_ID,
      claim_idempotency_key: IDEMPOTENCY_KEY,
      claim_evidence: { found_words: ["PALE"] },
    },
  });

  await assert.rejects(
    claimGameReward(client, {
      sessionId: SESSION_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      evidence: { found_words: ["PALE"], score: 999 },
    }),
    (error) => error instanceof GameRewardClientError && error.code === "GAME_REWARD_INVALID_INPUT",
  );
});

test("maps authorization and temporary transport failures", async () => {
  await assert.rejects(
    startGameRewardSession({ async rpc() { return { data: null, error: { code: "42501" } }; } }, "word-garden"),
    (error) => error.code === "GAME_REWARD_AUTH_REQUIRED" && !error.retryable,
  );
  await assert.rejects(
    startGameRewardSession({ async rpc() { return { data: null, error: { code: "57014" } }; } }, "word-garden"),
    (error) => error.code === "GAME_REWARD_TEMPORARILY_UNAVAILABLE" && error.retryable,
  );
});

test("progresses Blooming Ink with a word intent only", async () => {
  const calls = [];
  const context = {
    display_name: "Blooming Ink",
    puzzle_key: "petal-rite",
    phase: "playing",
    found_words: ["PALE"],
    score: 4,
    full_bloom_count: 0,
    action_index: 1,
    completed_at: null,
  };
  const client = { async rpc(name, params) {
    calls.push({ name, params });
    return { data: { session_id: SESSION_ID, game_key: "word-garden", action_index: 1, state: context, replayed: false }, error: null };
  } };
  const result = await progressGameRewardSession(client, {
    sessionId: SESSION_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    action: { op: "submit", word: "PALE" },
  });
  assert.deepEqual(result.state.found_words, ["PALE"]);
  assert.deepEqual(calls[0].params.progress_action, { op: "submit", word: "PALE" });
});

test("progresses Match and Merge with intent only", async () => {
  const calls = [];
  const context = {
    grid: [0, 2, 1, 1, 2, 2, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0],
    score: 55,
    moves: 1,
    highest_tier: 2,
    merge_streak: 1,
    best_chain: 1,
    last_merge_at: "2026-07-21T12:00:01.000Z",
    action_index: 1,
  };
  const client = {
    async rpc(name, params) {
      calls.push({ name, params });
      return {
        data: {
          session_id: SESSION_ID,
          game_key: "match-merge",
          action_index: 1,
          state: context,
          replayed: false,
        },
        error: null,
      };
    },
  };

  const result = await progressGameRewardSession(client, {
    sessionId: SESSION_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    action: { op: "merge", from: 0, to: 1 },
  });
  assert.equal(result.state.score, 55);
  assert.deepEqual(calls[0], {
    name: "progress_game_reward_session",
    params: {
      progress_session_id: SESSION_ID,
      progress_idempotency_key: IDEMPOTENCY_KEY,
      progress_action: { op: "merge", from: 0, to: 1 },
    },
  });

  await assert.rejects(
    progressGameRewardSession(client, {
      sessionId: SESSION_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      action: { op: "merge", from: 0, to: 1, score: 999 },
    }),
    (error) => error instanceof GameRewardClientError && error.code === "GAME_REWARD_INVALID_INPUT",
  );
});

test("progresses Boba Cafe with player intent only", async () => {
  const calls = [];
  const context = {
    phase: "serving",
    order_index: 0,
    active_order: {
      order_key: "lantern-latte",
      order_label: "Lantern Latte",
      customer: { key: "choir-helper", label: "Choir Helper", palette: ["#f9a8d4", "#7dd3fc"] },
      recipe: { tea: "black-tea", milk: "cream-cloud", topping: "brown-sugar-pearls", charm: "lantern-pick", sweetness: "glow" },
      placed_at: "2026-07-22T12:00:00.000Z",
      deadline_at: "2026-07-22T12:00:32.000Z",
      patience_ms: 32000,
    },
    tray: { tea: "black-tea", milk: null, topping: null, charm: null, sweetness: null },
    score: 0,
    served_count: 0,
    perfect_count: 0,
    combo: 0,
    best_combo: 0,
    mistakes: 0,
    last_result: null,
    action_index: 1,
    completed_at: null,
  };
  const client = { async rpc(name, params) {
    calls.push({ name, params });
    return { data: { session_id: SESSION_ID, game_key: "boba-cafe", action_index: 1, state: context, replayed: false }, error: null };
  } };

  const result = await progressGameRewardSession(client, {
    sessionId: SESSION_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    action: { op: "select", station: "tea", choice: "black-tea" },
  });
  assert.equal(result.state.tray.tea, "black-tea");
  assert.equal(calls[0].params.progress_action.choice, "black-tea");

  await assert.rejects(
    progressGameRewardSession(client, {
      sessionId: SESSION_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      action: { op: "serve", score: 999 },
    }),
    (error) => error instanceof GameRewardClientError && error.code === "GAME_REWARD_INVALID_INPUT",
  );
});

test("progresses Find Vezmir with coordinate intent only", async () => {
  const calls = [];
  const context = {
    phase: "seeking",
    targets: [
      { key: "moon-mug", role: "clue", layer: "foreground", x: 180, y: 750, radius: 58 },
      { key: "ribbon-bell", role: "clue", layer: "room", x: 380, y: 390, radius: 58 },
      { key: "fox-pin", role: "clue", layer: "foreground", x: 610, y: 760, radius: 58 },
      { key: "star-note", role: "clue", layer: "background", x: 800, y: 340, radius: 58 },
      { key: "seed-pouch", role: "clue", layer: "room", x: 850, y: 710, radius: 58 },
      { key: "vezmir", role: "final", layer: "background", x: 520, y: 520, radius: 78 },
    ],
    found_keys: ["moon-mug"],
    active_hint_key: null,
    focus: 5,
    misses: 0,
    hints_used: 0,
    score: 365,
    elapsed_ms: 1000,
    started_at: "2026-07-22T12:00:00.000Z",
    completed_at: null,
    action_index: 1,
  };
  const client = { async rpc(name, params) {
    calls.push({ name, params });
    return { data: { session_id: SESSION_ID, game_key: "puzzle-cat", action_index: 1, state: context, replayed: false }, error: null };
  } };

  const result = await progressGameRewardSession(client, {
    sessionId: SESSION_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    action: { op: "search", x: 197, y: 758, layer: "foreground" },
  });
  assert.deepEqual(result.state.found_keys, ["moon-mug"]);
  assert.deepEqual(calls[0].params.progress_action, { op: "search", x: 197, y: 758, layer: "foreground" });

  await assert.rejects(
    progressGameRewardSession(client, {
      sessionId: SESSION_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      action: { op: "search", objectKey: "moon-mug", layer: "foreground" },
    }),
    (error) => error instanceof GameRewardClientError && error.code === "GAME_REWARD_INVALID_INPUT",
  );
});
