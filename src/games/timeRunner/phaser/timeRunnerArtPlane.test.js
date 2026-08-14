import assert from "node:assert/strict";
import test from "node:test";
import { TIME_RUNNER_APPROVED_ANCHORS, TIME_RUNNER_ART_PLANE } from "./timeRunnerArtPlane.js";

test("Time Runner approved art anchors stay registered to its widescreen illustration", () => {
  assert.deepEqual(TIME_RUNNER_ART_PLANE, {
    width: 960,
    height: 540,
    aspect: "16:9",
  });
  assert.deepEqual(TIME_RUNNER_APPROVED_ANCHORS.familiar, { x: 0.286, y: 0.365 });
  assert.deepEqual(TIME_RUNNER_APPROVED_ANCHORS.clock, { x: 0.701, y: 0.217, radius: 0.2 });
  assert.deepEqual(TIME_RUNNER_APPROVED_ANCHORS.landingChoices, [
    { x: 0.59, y: 0.515 },
    { x: 0.85, y: 0.605 },
  ]);
  assert.equal(TIME_RUNNER_APPROVED_ANCHORS.hazardBaselineY, 0.44);
});
