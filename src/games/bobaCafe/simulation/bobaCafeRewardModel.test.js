import assert from "node:assert/strict";
import test from "node:test";

import {
  createBobaCafeReceiptIntent,
  createRewardedBobaCafeState,
  getRewardedBobaPatiencePercent,
} from "./bobaCafeRewardModel.js";

const CONTEXT = {
  phase: "serving",
  order_index: 2,
  active_order: {
    order_key: "lantern-latte",
    order_label: "Lantern Latte",
    customer: { key: "choir-helper", label: "Choir Helper", palette: ["#f9a8d4", "#7dd3fc"] },
    recipe: { tea: "black-tea", milk: "cream-cloud", topping: "brown-sugar-pearls", charm: "lantern-pick", sweetness: "glow" },
    placed_at: "2026-07-22T12:00:00.000Z",
    deadline_at: "2026-07-22T12:00:29.600Z",
    patience_ms: 29600,
  },
  tray: { tea: "black-tea", milk: null, topping: null, charm: null, sweetness: null },
  score: 610,
  served_count: 2,
  perfect_count: 1,
  combo: 1,
  best_combo: 1,
  mistakes: 1,
  last_result: null,
  action_index: 7,
  completed_at: null,
};

test("maps an authoritative cafe snapshot without recomputing results", () => {
  const state = createRewardedBobaCafeState(CONTEXT);
  assert.equal(state.activeOrder.label, "Lantern Latte");
  assert.equal(state.tray.tea, "black-tea");
  assert.equal(state.score, 610);
  assert.equal(state.actionIndex, 7);
});

test("derives display patience from the server deadline", () => {
  const state = createRewardedBobaCafeState(CONTEXT);
  assert.equal(getRewardedBobaPatiencePercent(state, Date.parse("2026-07-22T12:00:14.800Z")), 50);
  assert.equal(getRewardedBobaPatiencePercent(state, Date.parse("2026-07-22T12:01:00.000Z")), 0);
});

test("maps authoritative material and favor receipts for the result sheet", () => {
  assert.deepEqual(createBobaCafeReceiptIntent({
    favor: { delta: 4 },
    materials: [{ key: "sugar-pearls", delta: 7 }],
    achievements: [{ key: "moonbrew-opening", title: "First Cup at Moonrise" }],
  }), {
    favorPreview: 4,
    items: [{ key: "sugar-pearls", label: "Sugar Pearls", quantity: 7, type: "material" }],
    achievements: [{ key: "moonbrew-opening", title: "First Cup at Moonrise" }],
  });
});
