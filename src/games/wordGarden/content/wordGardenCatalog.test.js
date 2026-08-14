import assert from "node:assert/strict";
import test from "node:test";

import {
  WORD_GARDEN_PUZZLES,
  getDailyWordGardenPuzzle,
  resolveWordGardenPuzzleGuide,
} from "./wordGardenCatalog.js";

test("every canonical bloom can be formed from its seven letters and heart letter", () => {
  for (const puzzle of WORD_GARDEN_PUZZLES) {
    assert.equal(new Set(puzzle.letters).size, 7, puzzle.key);
    for (const word of puzzle.acceptedWords) {
      assert.ok(word.length >= 4, `${puzzle.key}: ${word} is too short`);
      assert.ok(word.includes(puzzle.center), `${puzzle.key}: ${word} omits ${puzzle.center}`);
      assert.ok([...word].every((letter) => puzzle.letters.includes(letter)), `${puzzle.key}: ${word} uses an unavailable letter`);
    }
    assert.ok(puzzle.featuredWords.length >= 6, `${puzzle.key} needs a useful journal`);
    assert.ok(puzzle.featuredWords.every((word) => puzzle.acceptedWords.includes(word)), `${puzzle.key} features a rejected word`);
  }
});

test("practice rotates through the same dated sequence as the canonical server puzzles", () => {
  assert.equal(getDailyWordGardenPuzzle("2026-08-10").key, "petal-rite");
  assert.equal(getDailyWordGardenPuzzle("2026-08-14").key, "thorned-path");
  assert.equal(getDailyWordGardenPuzzle("2026-08-17").key, "petal-rite");
});

test("dated rewarded puzzle keys resolve to the same themed guide without exposing it through the RPC", () => {
  const guide = resolveWordGardenPuzzleGuide("thorned-path-20260814");
  assert.equal(guide.key, "thorned-path");
  assert.match(guide.theme, /bramble/i);
  assert.ok(guide.featuredWords.includes("THORN"));
});
