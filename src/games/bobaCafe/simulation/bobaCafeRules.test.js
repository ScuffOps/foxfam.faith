import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOBA_CAFE_PHASES,
  buildBobaCafeRewardIntent,
  createInitialBobaCafeState,
  getTrayCompletion,
  markBobaCafeClaimed,
  selectCafeOptionByShortcut,
  selectBobaIngredient,
  selectBobaSweetness,
  startNextBobaOrder,
  submitBobaDrink,
  restoreBobaCafePracticeState,
  tickBobaCafe,
} from "./bobaCafeRules.js";

describe("bobaCafeRules", () => {
  it("creates deterministic first orders for the same seed", () => {
    const first = createInitialBobaCafeState({ now: 1000, seed: "dulcis" });
    const second = createInitialBobaCafeState({ now: 2000, seed: "dulcis" });

    assert.equal(first.activeOrder.label, second.activeOrder.label);
    assert.deepEqual(first.activeOrder.recipe, second.activeOrder.recipe);
  });

  it("recovers safely from stale or malformed local practice state", () => {
    const recovered = restoreBobaCafePracticeState({ phase: "serving", score: "oops" }, { seed: "recovery-seed", now: 1000 });
    assert.equal(recovered.daySeed, "recovery-seed");
    assert.equal(recovered.score, 0);

    const valid = createInitialBobaCafeState({ seed: "valid-seed", now: 1000 });
    assert.equal(restoreBobaCafePracticeState(valid), valid);
  });

  it("fills a tray by ingredient group and sweetness", () => {
    let state = createInitialBobaCafeState({ now: 1000, seed: "tray" });
    state = selectBobaIngredient(state, "black-tea", 1100);
    state = selectBobaIngredient(state, "cream-cloud", 1200);
    state = selectBobaSweetness(state, "glow", 1300);

    assert.equal(state.tray.tea, "black-tea");
    assert.equal(state.tray.milk, "cream-cloud");
    assert.equal(state.tray.sweetness, "glow");
    assert.equal(getTrayCompletion(state.tray), 60);
  });

  it("selects available station options by one-based shortcut", () => {
    const state = createInitialBobaCafeState({ now: 1000, seed: "shortcut" });
    const teaState = selectCafeOptionByShortcut(state, "tea", 2, 1100);
    const sweetState = selectCafeOptionByShortcut(teaState, "sweetness", 3, 1200);

    assert.equal(teaState.tray.tea, "black-tea");
    assert.equal(sweetState.tray.sweetness, "festival");
  });

  it("leaves state unchanged for unknown stations or unavailable ordinals", () => {
    const state = createInitialBobaCafeState({ now: 1000, seed: "shortcut-invalid" });

    assert.equal(selectCafeOptionByShortcut(state, "tea", 9), state);
    assert.equal(selectCafeOptionByShortcut(state, "unknown", 1), state);
    assert.equal(selectCafeOptionByShortcut(state, "milk", 0), state);
  });

  it("scores a perfect order and advances to result", () => {
    let state = createInitialBobaCafeState({ now: 1000, seed: "perfect" });
    for (const ingredientKey of Object.values(state.activeOrder.recipe)) {
      state = ingredientKey in { soft: true, glow: true, festival: true }
        ? selectBobaSweetness(state, ingredientKey, 1200)
        : selectBobaIngredient(state, ingredientKey, 1200);
    }

    const result = submitBobaDrink(state, 2200);

    assert.equal(result.phase, BOBA_CAFE_PHASES.result);
    assert.equal(result.lastResult.perfect, true);
    assert.equal(result.perfectCount, 1);
    assert.equal(result.combo, 1);
    assert.ok(result.score > 0);
  });

  it("times out an order through ticking", () => {
    const state = createInitialBobaCafeState({ now: 1000, seed: "timeout" });
    const result = tickBobaCafe(state, state.activeOrder.placedAt + state.activeOrder.patienceMs + 1);

    assert.equal(result.phase, BOBA_CAFE_PHASES.result);
    assert.equal(result.lastResult.timedOut, true);
    assert.equal(result.score, 0);
    assert.equal(result.mistakes, 1);
  });

  it("starts the next deterministic order after a result", () => {
    const state = createInitialBobaCafeState({ now: 1000, seed: "next" });
    const result = submitBobaDrink(state, 2000);
    const next = startNextBobaOrder(result, 3000);

    assert.equal(next.phase, BOBA_CAFE_PHASES.serving);
    assert.equal(next.orderIndex, 1);
    assert.notEqual(next.activeOrder.id, state.activeOrder.id);
  });

  it("builds and marks a local reward intent for unclaimed score", () => {
    const state = {
      ...createInitialBobaCafeState({ now: 1000, seed: "reward" }),
      score: 460,
      servedCount: 4,
      perfectCount: 3,
      bestCombo: 3,
    };
    const intent = buildBobaCafeRewardIntent({ state, durationMs: 45000 });
    const claimed = markBobaCafeClaimed(state, 5000);

    assert.equal(intent.gameKey, "boba-cafe");
    assert.equal(intent.eventType, "cafe-shift-claim");
    assert.equal(intent.score, 460);
    assert.equal(intent.items.some((item) => item.key === "sugar-pearls"), true);
    assert.equal(intent.achievementKeys.includes("perfect-pour"), true);
    assert.equal(claimed.claimedScore, 460);
  });
});
