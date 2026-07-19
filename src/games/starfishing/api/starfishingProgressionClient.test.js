import assert from "node:assert/strict";
import test from "node:test";

import {
  createStarfishingProgressionClient,
} from "./starfishingProgressionClient.js";

const userId = "123e4567-e89b-42d3-a456-426614174000";
const ticketId = "223e4567-e89b-42d3-a456-426614174000";
const catchId = "323e4567-e89b-42d3-a456-426614174000";
const idempotencyKey = "423e4567-e89b-42d3-a456-426614174000";
const caughtAt = "2026-07-18T12:00:00.000Z";

const validCastTicket = {
  ticket_id: ticketId,
  fish_key: "lunar-guppy",
  qte_length: 1,
  applied_effects: [],
  not_before: "2026-07-18T11:59:55.000Z",
  expires_at: "2026-07-18T12:09:55.000Z",
};

const validClaimResult = {
  catch: {
    id: catchId,
    fish_key: "lunar-guppy",
    label: "Lunar Guppy",
    rarity: "common",
    size: 4.2,
    duplicate: false,
    duplicate_policy: "none",
    caught_at: caughtAt,
  },
  fishpedia: {
    fish_key: "lunar-guppy",
    caught_count: 1,
    smallest_size: 4.2,
    largest_size: 4.2,
    first_caught_at: caughtAt,
    last_caught_at: caughtAt,
    discovered_count: 1,
    catalog_count: 6,
    completion_percent: 17,
  },
  favor: { delta: 3, balance: 18 },
  materials: [],
  achievements: [],
  charms: [],
  applied_effects: [],
  replayed: false,
};

function createRpcClient(handler) {
  return {
    auth: {
      async getUser() {
        return { data: { user: { id: userId } }, error: null };
      },
    },
    rpc: handler,
  };
}

function createReadClient(rowsByTable) {
  const calls = [];
  const client = {
    auth: {
      async getUser() {
        return { data: { user: { id: userId } }, error: null };
      },
    },
    from(table) {
      const call = { table, select: null, filters: [], order: [], limit: null };
      calls.push(call);
      const result = { data: rowsByTable[table] || [], error: null };
      const query = {
        select(columns) {
          call.select = columns;
          return query;
        },
        eq(column, value) {
          call.filters.push([column, value]);
          return query;
        },
        order(column, options) {
          call.order.push([column, options]);
          return query;
        },
        limit(value) {
          call.limit = value;
          return query;
        },
        then(resolve, reject) {
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { client, calls };
}

test("startStarfishingCast sends no client-authored reward parameters", async () => {
  const calls = [];
  const client = createStarfishingProgressionClient(createRpcClient(async (name, params) => {
    calls.push({ name, params });
    return { data: validCastTicket, error: null };
  }));

  const ticket = await client.startStarfishingCast();

  assert.equal(ticket.ticketId, ticketId);
  assert.deepEqual(calls, [{ name: "start_starfishing_cast", params: undefined }]);
});

test("claimStarfishingCatch sends only ticket, idempotency, policy, and bounded telemetry", async () => {
  const calls = [];
  const client = createStarfishingProgressionClient(createRpcClient(async (name, params) => {
    calls.push({ name, params });
    return { data: validClaimResult, error: null };
  }));

  const result = await client.claimStarfishingCatch({
    ticketId,
    idempotencyKey,
    duplicatePolicy: "release",
    telemetry: { actionCount: 2, missCount: 0, durationMs: 3200 },
    rewardAmount: 99999,
    rarity: "mythic",
    fishKey: "veri-starwhale",
    cost: -500,
  });

  assert.equal(result.catch.fishKey, "lunar-guppy");
  assert.deepEqual(calls, [{
    name: "claim_starfishing_catch",
    params: {
      claim_ticket_id: ticketId,
      claim_idempotency_key: idempotencyKey,
      claim_duplicate_policy: "release",
      claim_qte_action_count: 2,
      claim_miss_count: 0,
      claim_duration_ms: 3200,
    },
  }]);
});

test("claimStarfishingCatch rejects out-of-bounds telemetry before RPC", async () => {
  let rpcCalls = 0;
  const client = createStarfishingProgressionClient(createRpcClient(async () => {
    rpcCalls += 1;
    return { data: validClaimResult, error: null };
  }));

  await assert.rejects(
    () => client.claimStarfishingCatch({
      ticketId,
      idempotencyKey,
      duplicatePolicy: "keep",
      telemetry: { actionCount: 17, missCount: 0, durationMs: 1000 },
    }),
    (error) => {
      assert.equal(error.code, "STARFISHING_INVALID_INPUT");
      assert.equal(error.retryable, false);
      return true;
    },
  );
  assert.equal(rpcCalls, 0);
});

test("loadStarfishingProgression scopes every private read to the authenticated owner", async () => {
  const { client: rawClient, calls } = createReadClient({
    user_fishpedia: [{
      fish_key: "lunar-guppy",
      caught_count: 2,
      smallest_size: 3.4,
      largest_size: 6.1,
      first_caught_at: caughtAt,
      last_caught_at: caughtAt,
    }],
    game_catches: [{
      id: catchId,
      fish_key: "lunar-guppy",
      size: 6.1,
      rarity: "common",
      duplicate: true,
      duplicate_policy: "keep",
      created_at: caughtAt,
    }],
    currency_accounts: [{ currency_key: "favor", balance: 18 }],
    user_material_balances: [{
      material_key: "star-glass",
      balance: 3,
      updated_at: caughtAt,
    }],
    user_achievements: [{
      achievement_key: "first-light",
      source_catch_id: catchId,
      unlocked_at: caughtAt,
    }],
    user_trophies: [{
      id: "523e4567-e89b-42d3-a456-426614174000",
      trophy_key: "first-light",
      source_achievement_key: "first-light",
      data: { label: "First Light" },
      acquired_at: caughtAt,
    }],
  });
  const client = createStarfishingProgressionClient(rawClient);

  const progression = await client.loadStarfishingProgression();

  assert.equal(progression.favorBalance, 18);
  assert.equal(progression.fishpedia[0].fishKey, "lunar-guppy");
  assert.equal(progression.recentCatches[0].duplicatePolicy, "keep");
  assert.equal(progression.materials[0].materialKey, "star-glass");
  assert.equal(progression.achievements[0].achievementKey, "first-light");
  assert.equal(progression.trophies[0].trophyKey, "first-light");
  assert.deepEqual(calls.map(({ table }) => table), [
    "user_fishpedia",
    "game_catches",
    "currency_accounts",
    "user_material_balances",
    "user_achievements",
    "user_trophies",
  ]);
  for (const call of calls) {
    assert.deepEqual(call.filters[0], ["user_id", userId]);
  }
  const accountCall = calls.find(({ table }) => table === "currency_accounts");
  assert.deepEqual(accountCall.filters[1], ["currency_key", "favor"]);
});

test("loadStarfishingProgression rejects signed-out access before any table read", async () => {
  let tableReads = 0;
  const client = createStarfishingProgressionClient({
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
    },
    from() {
      tableReads += 1;
      throw new Error("should not read");
    },
    async rpc() {
      throw new Error("should not mutate");
    },
  });

  await assert.rejects(
    () => client.loadStarfishingProgression(),
    (error) => {
      assert.equal(error.code, "STARFISHING_AUTH_REQUIRED");
      assert.equal(error.retryable, false);
      assert.equal(error.message, "Sign in to sync Starfishing progress.");
      return true;
    },
  );
  assert.equal(tableReads, 0);
});

test("RPC failures become stable user-safe errors without transport details", async () => {
  const client = createStarfishingProgressionClient(createRpcClient(async () => ({
    data: null,
    error: {
      code: "57014",
      message: "canceling statement due to statement timeout",
      details: "private schema internals",
      hint: "secret operational hint",
    },
  })));

  await assert.rejects(
    () => client.startStarfishingCast(),
    (error) => {
      assert.equal(error.name, "StarfishingProgressionError");
      assert.equal(error.code, "STARFISHING_TEMPORARILY_UNAVAILABLE");
      assert.equal(error.retryable, true);
      assert.equal(error.message, "Starfishing is resting for a moment. Please try again.");
      assert.equal("details" in error, false);
      assert.equal("hint" in error, false);
      assert.doesNotMatch(error.stack, /private schema internals/);
      return true;
    },
  );
});

test("read query construction failures are sanitized", async () => {
  const client = createStarfishingProgressionClient({
    auth: {
      async getUser() {
        return { data: { user: { id: userId } }, error: null };
      },
    },
    from() {
      const error = new Error("raw read transport failure");
      error.code = "08006";
      throw error;
    },
  });

  await assert.rejects(
    () => client.loadStarfishingProgression(),
    (error) => {
      assert.equal(error.code, "STARFISHING_TEMPORARILY_UNAVAILABLE");
      assert.equal(error.retryable, true);
      assert.doesNotMatch(error.message, /raw read transport failure/);
      return true;
    },
  );
});

test("invalid authoritative responses fail closed with a stable response error", async () => {
  const client = createStarfishingProgressionClient(createRpcClient(async () => ({
    data: { ...validCastTicket, fish_key: "forged-fish" },
    error: null,
  })));

  await assert.rejects(
    () => client.startStarfishingCast(),
    (error) => {
      assert.equal(error.code, "STARFISHING_INVALID_RESPONSE");
      assert.equal(error.retryable, false);
      assert.equal(error.message, "Starfishing returned an invalid response.");
      return true;
    },
  );
});
