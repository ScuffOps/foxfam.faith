import assert from "node:assert/strict";
import test from "node:test";

import {
  createRewardedTimeRunnerState,
  createTimeRunnerReceiptIntent,
  findTimeRunnerHazardAction,
} from "./timeRunnerRewardModel.js";

const context = {
  phase: "running",
  layout: [
    { id: "time-0", at_ms: 1200, kind: "hand-sweep", required_op: "jump", resolved: false, outcome: null },
    { id: "time-1", at_ms: 2900, kind: "roman-gate", required_op: "duck", resolved: false, outcome: null },
  ],
  elapsed_ms: 0,
  falls: 1,
  clock_shards: 2,
  cleared_hazards: 1,
  focus: 30,
  focus_started_ms: 0,
  focus_until_ms: 0,
  combo: 2,
  best_combo: 3,
  route_step: 1,
  available_landings: [{ id: "landing-1-0", kind: "minute-hand", label: "Minute hand", branch: 0 }],
  score: 260,
  started_at: "2026-07-22T00:00:00.000Z",
  completed_at: null,
  action_index: 2,
};

test("canonical state projects into the existing Phaser presentation contract", () => {
  const state = createRewardedTimeRunnerState(context, { now: Date.parse(context.started_at) + 1000 });
  assert.equal(state.phase, "running");
  assert.equal(state.health, 2);
  assert.equal(state.clockShards, 2);
  assert.equal(state.hazards[0].id, "time-0");
  assert.equal(state.availableLandings[0].id, "landing-1-0");
});

test("hazard actions contain only server-owned ids and accepted ops", () => {
  const now = Date.parse(context.started_at) + 1250;
  assert.deepEqual(findTimeRunnerHazardAction(context, "jump", now), { op: "jump", hazard_id: "time-0" });
  assert.equal(findTimeRunnerHazardAction(context, "duck", now), null);
});

test("receipts become display-only reward intents", () => {
  assert.deepEqual(createTimeRunnerReceiptIntent({
    favor: { delta: 9 },
    materials: [{ key: "clock-brass", delta: 3, balance: 7 }],
    achievements: [{ key: "tower-cleared", title: "Ahead of Every Bell" }],
  }), {
    favorPreview: 9,
    items: [{ key: "clock-brass", label: "Clock Brass", quantity: 3, type: "material" }],
    achievements: [{ key: "tower-cleared", title: "Ahead of Every Bell" }],
  });
});
