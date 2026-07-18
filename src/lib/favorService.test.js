import assert from "node:assert/strict";
import test from "node:test";
import {
  createFavorService,
  getFavorAwardOutcome,
} from "./favorService.js";

const sourceId = "123e4567-e89b-42d3-a456-426614174000";

function makeFavorResult({ replayed = false, delta = 5, balance = 15, leveledUp = false } = {}) {
  return {
    replayed,
    favor: { delta, balance },
    rank: {
      previous: balance - delta >= 10 ? { name: "Seeker", min: 10 } : { name: "Forsaken", min: 0 },
      current: balance >= 10 ? { name: "Seeker", min: 10 } : { name: "Forsaken", min: 0 },
      leveled_up: leveledUp,
    },
  };
}

test("Favor service sends only the stable action, source, and option RPC parameters", async () => {
  const calls = [];
  const service = createFavorService({
    async rpc(name, params) {
      calls.push({ name, params });
      return {
        data: makeFavorResult(),
        error: null,
      };
    },
  });

  const result = await service.performAction("vote-poll", sourceId, "opt_sun");

  assert.deepEqual(calls, [{
    name: "perform_portal_favor_action",
    params: {
      action_key: "vote-poll",
      source_id: sourceId,
      option_key: "opt_sun",
    },
  }]);
  assert.deepEqual(result.favor, { delta: 5, balance: 15 });
});

test("Favor service sends a null option key for a non-poll action without client reward fields", async () => {
  let params;
  const service = createFavorService({
    async rpc(_name, nextParams) {
      params = nextParams;
      return {
        data: makeFavorResult(),
        error: null,
      };
    },
  });

  await service.performAction("submit-post", sourceId);

  assert.deepEqual(params, {
    action_key: "submit-post",
    source_id: sourceId,
    option_key: null,
  });
  assert.deepEqual(Object.keys(params).sort(), ["action_key", "option_key", "source_id"]);
});

test("Favor service rejects non-UUID sources and option keys outside poll actions before RPC", async () => {
  let callCount = 0;
  const service = createFavorService({
    async rpc() {
      callCount += 1;
      return { data: makeFavorResult(), error: null };
    },
  });

  await assert.rejects(
    () => service.performAction("submit-post", "not-a-source-id"),
    /valid UUID/i,
  );
  await assert.rejects(
    () => service.performAction("submit-post", sourceId, "opt_sun"),
    /only valid for poll/i,
  );
  await assert.rejects(
    () => service.performAction("vote-poll", sourceId),
    /Poll option is required/i,
  );
  assert.equal(callCount, 0);
});

test("Favor service normalizes server errors without exposing the transport object", async () => {
  const service = createFavorService({
    async rpc() {
      return {
        data: null,
        error: {
          code: "22023",
          message: "Poll option not found",
          details: "raw server detail",
        },
      };
    },
  });

  await assert.rejects(
    () => service.performAction("vote-poll", sourceId, "missing"),
    (error) => {
      assert.equal(error.name, "FavorActionError");
      assert.equal(error.code, "22023");
      assert.equal(error.message, "Poll option not found");
      assert.equal("details" in error, false);
      return true;
    },
  );
});

test("replayed and zero-delta Favor results never request a gain notification or level-up toast", () => {
  const replayed = getFavorAwardOutcome(makeFavorResult({ replayed: true, delta: 0, balance: 10, leveledUp: false }));
  const zeroDelta = getFavorAwardOutcome(makeFavorResult({ delta: 0, balance: 10, leveledUp: false }));

  assert.deepEqual(replayed, {
    shouldNotify: false,
    leveledUp: false,
    delta: 0,
    balance: 10,
  });
  assert.deepEqual(zeroDelta, {
    shouldNotify: false,
    leveledUp: false,
    delta: 0,
    balance: 10,
  });
});

test("a new positive Favor result preserves the authoritative level-up outcome", () => {
  const result = makeFavorResult({ balance: 10, leveledUp: true });
  result.rank.leveledUp = true;
  delete result.rank.leveled_up;

  assert.deepEqual(getFavorAwardOutcome(result), {
    shouldNotify: true,
    leveledUp: true,
    delta: 5,
    balance: 10,
  });
});
