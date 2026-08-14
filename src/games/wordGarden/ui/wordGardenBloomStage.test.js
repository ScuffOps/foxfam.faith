import assert from "node:assert/strict";
import test from "node:test";
import {
  WORD_GARDEN_BLOOM_STAGE,
  resolveWordGardenBloomStage,
} from "./wordGardenBloomStage.js";

test("Word Garden bloom art follows the current puzzle progression", () => {
  assert.equal(resolveWordGardenBloomStage(null), WORD_GARDEN_BLOOM_STAGE.sprout);
  assert.equal(resolveWordGardenBloomStage({ foundWords: [] }), WORD_GARDEN_BLOOM_STAGE.sprout);
  assert.equal(resolveWordGardenBloomStage({
    status: "playing",
    foundWords: [{ word: "PETAL", isFullBloom: false }],
  }), WORD_GARDEN_BLOOM_STAGE.bloom);
  assert.equal(resolveWordGardenBloomStage({
    status: "playing",
    foundWords: [{ word: "PETALERS", isFullBloom: true }],
  }), WORD_GARDEN_BLOOM_STAGE.fullBloom);
  assert.equal(resolveWordGardenBloomStage({
    status: "complete",
    foundWords: [{ word: "PETAL", isFullBloom: false }],
  }), WORD_GARDEN_BLOOM_STAGE.bloomingInk);
});

test("completed gardens take precedence over earlier bloom states", () => {
  assert.equal(resolveWordGardenBloomStage({
    status: "complete",
    foundWords: [{ word: "PETALERS", isFullBloom: true }],
  }), WORD_GARDEN_BLOOM_STAGE.bloomingInk);
});
