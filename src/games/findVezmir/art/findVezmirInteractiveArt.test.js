import assert from "node:assert/strict";
import test from "node:test";

import {
  FIND_VEZMIR_CLUE_ATLAS,
  FIND_VEZMIR_DEPTH_ATLAS,
  FIND_VEZMIR_INTERACTIVE_ART_SLOT_IDS,
  getApprovedFindVezmirInteractiveArt,
  getFindVezmirAtlasStyle,
} from "./findVezmirInteractiveArt.js";

const COMPLETE_FAMILY = Object.freeze({
  "find-vezmir.clues": "approved-clues.png",
  "find-vezmir.vezmir": "approved-vezmir.png",
  "find-vezmir.depth": "approved-depth.png",
});

test("Find Vezmir resolves only its complete bounded interactive art family", () => {
  let requestedIds = null;
  const result = getApprovedFindVezmirInteractiveArt((ids) => {
    requestedIds = ids;
    return COMPLETE_FAMILY;
  });

  assert.deepEqual(requestedIds, FIND_VEZMIR_INTERACTIVE_ART_SLOT_IDS);
  assert.deepEqual(result, {
    clues: "approved-clues.png",
    vezmir: "approved-vezmir.png",
    depth: "approved-depth.png",
  });
  assert.equal(Object.isFrozen(result), true);
});

test("Find Vezmir fails closed when any interactive art member is absent or malformed", () => {
  for (const family of [
    null,
    { ...COMPLETE_FAMILY, "find-vezmir.clues": undefined },
    { ...COMPLETE_FAMILY, "find-vezmir.vezmir": "" },
    { ...COMPLETE_FAMILY, "find-vezmir.depth": "   " },
  ]) {
    assert.equal(getApprovedFindVezmirInteractiveArt(() => family), null);
  }
});

test("Find Vezmir assigns distinct atlas cells to every clue and depth control", () => {
  const clueCells = Object.values(FIND_VEZMIR_CLUE_ATLAS.cells);
  const depthCells = Object.values(FIND_VEZMIR_DEPTH_ATLAS.cells);

  assert.equal(clueCells.length, 5);
  assert.equal(new Set(clueCells.map(({ column, row }) => `${column}:${row}`)).size, 5);
  assert.equal(depthCells.length, 3);
  assert.equal(new Set(depthCells.map(({ column, row }) => `${column}:${row}`)).size, 3);
  assert.notDeepEqual(
    getFindVezmirAtlasStyle(FIND_VEZMIR_CLUE_ATLAS, "moon-mug"),
    getFindVezmirAtlasStyle(FIND_VEZMIR_CLUE_ATLAS, "seed-pouch"),
  );
  assert.equal(getFindVezmirAtlasStyle(FIND_VEZMIR_CLUE_ATLAS, "vezmir"), null);
});
