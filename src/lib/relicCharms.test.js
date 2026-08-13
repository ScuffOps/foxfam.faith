import test from "node:test";
import assert from "node:assert/strict";
import { stackCharmInstances } from "./relicCharms.js";

test("duplicate charms stack in groups of ten", () => {
  const charms = Array.from({ length: 12 }, (_, index) => ({ id: String(index), charm_key: "ash-thread", rarity: "common", equipped: index === 3 }));
  const stacks = stackCharmInstances(charms);
  assert.deepEqual(stacks.map((stack) => stack.quantity), [10, 2]);
  assert.equal(stacks[0].representative.equipped, true);
});
