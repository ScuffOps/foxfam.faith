import assert from "node:assert/strict";
import test from "node:test";
import {
  WORD_GARDEN_ART_FAMILY_IDS,
  resolveApprovedWordGardenArtFamily,
} from "./wordGardenArtFamily.js";

test("Word Garden resolves its authored family only when both bounded slots are approved", () => {
  let requestedIds = null;
  const family = resolveApprovedWordGardenArtFamily((ids) => {
    requestedIds = ids;
    return {
      "word-garden.flower": "/approved/flower.png",
      "word-garden.bloom-family": "/approved/bloom-family.png",
    };
  });

  assert.deepEqual(requestedIds, WORD_GARDEN_ART_FAMILY_IDS);
  assert.deepEqual(family, {
    flower: "/approved/flower.png",
    bloomFamily: "/approved/bloom-family.png",
  });
  assert.equal(Object.isFrozen(family), true);
});

test("Word Garden fails closed when either authored family slot is unresolved", () => {
  for (const partialFamily of [
    null,
    { "word-garden.flower": "/approved/flower.png" },
    { "word-garden.bloom-family": "/approved/bloom-family.png" },
    {
      "word-garden.flower": "",
      "word-garden.bloom-family": "/approved/bloom-family.png",
    },
  ]) {
    assert.equal(resolveApprovedWordGardenArtFamily(() => partialFamily), null);
  }
});
