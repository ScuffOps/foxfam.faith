import assert from "node:assert/strict";
import test from "node:test";
import { getRelicEvolutionLabel, getRelicEvolutionStage } from "./relicEvolutionModel.js";

test("relic evolution follows the highest equipped forged tier", () => {
  assert.equal(getRelicEvolutionStage([
    { equipped: true, tier: "awakened", star: 1 },
    { equipped: true, tier: "exalted", star: 2 },
    { equipped: false, tier: "ascendant", star: 3 },
  ]), 2);
  assert.equal(getRelicEvolutionLabel(2), "Exalted");
});

test("relic evolution falls back to validated stars without rewarding charm count", () => {
  assert.equal(getRelicEvolutionStage([
    { equipped: true, star: 1 },
    { equipped: true, star: 1 },
    { equipped: true, star: 1 },
    { equipped: true, star: 1 },
  ]), 1);
  assert.equal(getRelicEvolutionStage([{ equipped: true, star: 9 }]), 0);
  assert.equal(getRelicEvolutionLabel(99), "Dormant");
});
