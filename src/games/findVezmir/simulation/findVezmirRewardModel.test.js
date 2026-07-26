import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createFindVezmirReceiptIntent,
  createFindVezmirSearchAction,
  createRewardedFindVezmirState,
} from "./findVezmirRewardModel.js";

describe("findVezmirRewardModel", () => {
  it("maps an authoritative snapshot without replacing local camera state", () => {
    const state = createRewardedFindVezmirState({
      phase: "vezmir-ready",
      found_keys: ["moon-mug"],
      active_hint_key: "ribbon-bell",
      targets: [],
      focus: 4,
      misses: 1,
      hints_used: 1,
      score: 312,
      elapsed_ms: 1200,
      started_at: "2026-07-22T12:00:00.000Z",
      action_index: 3,
      completed_at: null,
    }, { pan: { x: 4, y: -2 }, layers: ["foreground", "room", "background"], activeLayer: 2 });

    assert.deepEqual(state.pan, { x: 4, y: -2 });
    assert.equal(state.activeLayer, 2);
    assert.deepEqual(state.foundKeys, ["moon-mug"]);
    assert.equal(state.hintsUsed, 1);
    assert.equal(state.actionIndex, 3);
  });

  it("turns both hotspot and pointer searches into coordinate-only actions", () => {
    assert.deepEqual(createFindVezmirSearchAction({ objectKey: "moon-mug", layer: "foreground" }), {
      op: "search",
      x: 197,
      y: 758,
      layer: "foreground",
    });
    assert.deepEqual(createFindVezmirSearchAction({ x: 48.234, y: 52.345, layer: "room" }), {
      op: "search",
      x: 482,
      y: 523,
      layer: "room",
    });
    assert.equal(createFindVezmirSearchAction({ objectKey: "moon-mug", layer: "room" }), null);
    assert.equal(createFindVezmirSearchAction({ x: 120, y: 40, layer: "room" }), null);
  });

  it("maps authoritative receipts for the shared result sheet", () => {
    assert.deepEqual(createFindVezmirReceiptIntent({
      favor: { delta: 18 },
      materials: [{ key: "catnip-silver", delta: 3 }, { key: "voidthread", delta: 2 }],
      achievements: [{ key: "lantern-eyed", title: "No Hint Could Hide Him" }],
    }), {
      favorPreview: 18,
      items: [
        { key: "catnip-silver", label: "Catnip Silver", quantity: 3, type: "material" },
        { key: "voidthread", label: "Voidthread", quantity: 2, type: "material" },
      ],
      achievements: [{ key: "lantern-eyed", title: "No Hint Could Hide Him" }],
    });
  });
});
