import assert from "node:assert/strict";
import test from "node:test";

import {
  getApprovedMatchMergeProductionArt,
  getMatchMergeOfferingAtlasTransform,
  MATCH_MERGE_OFFERING_ATLAS,
  MATCH_MERGE_PRODUCTION_ART_SLOT_IDS,
} from "./matchMergeProductionArt.js";

const COMPLETE_FAMILY = Object.freeze({
  "match-merge.offerings": "approved-offerings.png",
  "match-merge.merge-fx": "approved-merge-fx.png",
});

test("resolves Match and Merge production art only as a complete family", () => {
  let requestedIds = null;
  const result = getApprovedMatchMergeProductionArt((ids) => {
    requestedIds = ids;
    return COMPLETE_FAMILY;
  });

  assert.deepEqual(requestedIds, MATCH_MERGE_PRODUCTION_ART_SLOT_IDS);
  assert.deepEqual(result, {
    offerings: "approved-offerings.png",
    mergeFx: "approved-merge-fx.png",
  });
  assert.equal(Object.isFrozen(result), true);
});

test("fails closed when the offering art is missing", () => {
  const result = getApprovedMatchMergeProductionArt(() => ({
    "match-merge.merge-fx": "approved-merge-fx.png",
  }));

  assert.equal(result, null);
});

test("fails closed when the merge effect is missing", () => {
  const result = getApprovedMatchMergeProductionArt(() => ({
    "match-merge.offerings": "approved-offerings.png",
  }));

  assert.equal(result, null);
});

test("fails closed for an unresolved or malformed family", () => {
  assert.equal(getApprovedMatchMergeProductionArt(() => null), null);
  assert.equal(getApprovedMatchMergeProductionArt(() => ({
    "match-merge.offerings": "   ",
    "match-merge.merge-fx": "approved-merge-fx.png",
  })), null);
});

test("maps all five offering tiers to distinct cells in the approved atlas", () => {
  const offeringKeys = [
    "moon-spark",
    "candle-seal",
    "woven-cord",
    "sigil-flake",
    "relic-knot",
  ];
  const cells = offeringKeys.map((key) => MATCH_MERGE_OFFERING_ATLAS.cells[key]);

  assert.equal(MATCH_MERGE_OFFERING_ATLAS.columns, 3);
  assert.equal(MATCH_MERGE_OFFERING_ATLAS.rows, 2);
  assert.equal(new Set(cells.map(({ column, row }) => `${column}:${row}`)).size, offeringKeys.length);
  assert.notEqual(
    getMatchMergeOfferingAtlasTransform("moon-spark"),
    getMatchMergeOfferingAtlasTransform("relic-knot"),
  );
  assert.equal(
    getMatchMergeOfferingAtlasTransform("unknown-offering"),
    getMatchMergeOfferingAtlasTransform("moon-spark"),
  );
});
