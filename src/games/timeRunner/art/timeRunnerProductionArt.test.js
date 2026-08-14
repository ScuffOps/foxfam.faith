import assert from "node:assert/strict";
import test from "node:test";

import {
  getApprovedTimeRunnerProductionArt,
  getTimeRunnerActionAtlasTransform,
  getTimeRunnerRunnerFrame,
  getTimeRunnerShardAtlasTransform,
  TIME_RUNNER_ACTION_ATLAS,
  TIME_RUNNER_PRODUCTION_ART_SLOT_IDS,
} from "./timeRunnerProductionArt.js";

const COMPLETE_FAMILY = Object.freeze({
  "time-runner.runner": "approved-runner.png",
  "time-runner.shards": "approved-shards.png",
  "time-runner.actions": "approved-actions.png",
});

test("resolves Time Runner authored art only as the complete requested family", () => {
  let requestedIds = null;
  const result = getApprovedTimeRunnerProductionArt((ids) => {
    requestedIds = ids;
    return COMPLETE_FAMILY;
  });

  assert.deepEqual(requestedIds, TIME_RUNNER_PRODUCTION_ART_SLOT_IDS);
  assert.deepEqual(result, {
    runner: "approved-runner.png",
    shards: "approved-shards.png",
    actions: "approved-actions.png",
  });
  assert.equal(Object.isFrozen(result), true);
});

test("fails closed when any Time Runner authored-art member is missing", () => {
  for (const missingId of TIME_RUNNER_PRODUCTION_ART_SLOT_IDS) {
    const partialFamily = { ...COMPLETE_FAMILY };
    delete partialFamily[missingId];
    assert.equal(getApprovedTimeRunnerProductionArt(() => partialFamily), null);
  }
});

test("fails closed for unresolved and malformed Time Runner families", () => {
  assert.equal(getApprovedTimeRunnerProductionArt(() => null), null);
  assert.equal(getApprovedTimeRunnerProductionArt(() => ({
    ...COMPLETE_FAMILY,
    "time-runner.actions": "   ",
  })), null);
});

test("maps live runner postures and a failed finish to stable authored-strip frames", () => {
  assert.equal(getTimeRunnerRunnerFrame({ posture: "run", finishReason: "" }), 0);
  assert.equal(getTimeRunnerRunnerFrame({ posture: "jump", finishReason: "" }), 1);
  assert.equal(getTimeRunnerRunnerFrame({ posture: "focus", finishReason: "" }), 2);
  assert.equal(getTimeRunnerRunnerFrame({ posture: "duck", finishReason: "" }), 0);
  assert.equal(getTimeRunnerRunnerFrame({ posture: "run", finishReason: "tower-cleared" }), 0);
  assert.equal(getTimeRunnerRunnerFrame({ posture: "run", finishReason: "clock-fractured" }), 3);
});

test("keeps authored action prompts and shard rewards on distinct atlas cells", () => {
  const actionTransforms = Object.keys(TIME_RUNNER_ACTION_ATLAS.cells)
    .map((action) => getTimeRunnerActionAtlasTransform(action));

  assert.equal(new Set(actionTransforms).size, 4);
  assert.notEqual(
    getTimeRunnerShardAtlasTransform("clockShard"),
    getTimeRunnerShardAtlasTransform("clockBrass"),
  );
  assert.equal(
    getTimeRunnerShardAtlasTransform("unknown"),
    getTimeRunnerShardAtlasTransform("clockShard"),
  );
});
