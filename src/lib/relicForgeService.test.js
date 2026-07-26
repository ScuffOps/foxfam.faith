import assert from "node:assert/strict";
import test from "node:test";
import { createRelicForgeService } from "./relicForgeService.js";

const charmId = "123e4567-e89b-42d3-a456-426614174001";
const requestId = "123e4567-e89b-42d3-a456-426614174002";
const receiptId = "123e4567-e89b-42d3-a456-426614174003";

const charm = { id: charmId, charm_key: "ash-thread", rarity: "common", star: 1, tier: "awakened", equipped: false, source: "relic_roll" };

test("Forge service uses narrow RPCs without client-authored costs, yields, or user ids", async () => {
  const calls = [];
  const service = createRelicForgeService({
    async rpc(name, params) {
      calls.push({ name, params });
      if (name === "load_relic_forge_state") {
        return { data: { catalog_version: 1, recipes: [], salvage_yields: [], balances: { favor: 0, materials: [] }, charms: [] }, error: null };
      }
      return {
        data: {
          operation: name === "upgrade_user_relic_charm" ? "upgrade" : "convert",
          receipt_id: receiptId,
          request_id: requestId,
          replayed: false,
          ...(name === "upgrade_user_relic_charm" ? { charm } : { converted_charm: charm }),
          favor: { delta: 0, balance: 0 },
          materials: [],
        },
        error: null,
      };
    },
  });

  await service.loadState();
  await service.upgradeCharm(charmId, requestId);
  await service.convertDuplicateCharm(charmId, requestId);

  assert.deepEqual(calls, [
    { name: "load_relic_forge_state", params: undefined },
    { name: "upgrade_user_relic_charm", params: { target_charm_id: charmId, request_id: requestId } },
    { name: "convert_duplicate_relic_charm", params: { target_charm_id: charmId, request_id: requestId } },
  ]);
});

test("Forge service validates request identifiers before calling Supabase", async () => {
  let called = false;
  const service = createRelicForgeService({ async rpc() { called = true; } });

  await assert.rejects(service.upgradeCharm("not-a-uuid", requestId), /valid UUID/);
  await assert.rejects(service.convertDuplicateCharm(charmId, "bad-request"), /valid UUID/);
  assert.equal(called, false);
});

test("Forge service preserves Supabase error codes without exposing raw response shapes", async () => {
  const service = createRelicForgeService({
    async rpc() {
      return { data: null, error: { code: "42501", message: "Charm is not owned by the caller" } };
    },
  });

  await assert.rejects(
    service.upgradeCharm(charmId, requestId),
    (error) => error.name === "RelicForgeServiceError" && error.code === "42501",
  );
});
