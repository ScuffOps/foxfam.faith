import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyTimeRunnerAction,
  buildTimeRunnerRewardIntent,
  createInitialTimeRunnerState,
  startTimeRunner,
  tickTimeRunner,
  TIME_RUNNER_COLLISION_X,
  TIME_RUNNER_PHASES,
  TIME_RUNNER_POSTURES,
} from "./timeRunnerRules.js";

describe("timeRunnerRules", () => {
  it("starts a deterministic clocktower run", () => {
    const first = tickTimeRunner(startTimeRunner(createInitialTimeRunnerState({ seed: "seed-a", now: 1000 }), 1000), 1800);
    const second = tickTimeRunner(startTimeRunner(createInitialTimeRunnerState({ seed: "seed-a", now: 1000 }), 1000), 1800);

    assert.equal(first.phase, TIME_RUNNER_PHASES.running);
    assert.equal(first.hazards.length, 1);
    assert.deepEqual(first.hazards[0], second.hazards[0]);
  });

  it("clears a minute hand when the runner is jumping", () => {
    const now = 2000;
    const running = {
      ...startTimeRunner(createInitialTimeRunnerState({ now }), now),
      hazards: [{
        id: "hand",
        kind: "hand-sweep",
        label: "Minute Hand Sweep",
        requiredPosture: TIME_RUNNER_POSTURES.jump,
        scoreValue: 90,
        focusValue: 8,
        x: TIME_RUNNER_COLLISION_X,
        resolved: false,
        spawnedAtMs: 0,
      }],
      posture: TIME_RUNNER_POSTURES.jump,
      postureUntil: now + 500,
      nextHazardAt: 999999,
    };

    const next = tickTimeRunner(running, now + 100);

    assert.equal(next.health, 3);
    assert.equal(next.combo, 1);
    assert.equal(next.hazards[0].resolved, true);
    assert.equal(next.lastMoment.type, "avoid");
  });

  it("fractures the run when a required posture is missed", () => {
    const now = 2000;
    const running = {
      ...startTimeRunner(createInitialTimeRunnerState({ now }), now),
      health: 1,
      hazards: [{
        id: "gate",
        kind: "roman-gate",
        label: "Roman Numeral Gate",
        requiredPosture: TIME_RUNNER_POSTURES.duck,
        scoreValue: 80,
        focusValue: 7,
        x: TIME_RUNNER_COLLISION_X,
        resolved: false,
        spawnedAtMs: 0,
      }],
      nextHazardAt: 999999,
    };

    const next = tickTimeRunner(running, now + 100);

    assert.equal(next.phase, TIME_RUNNER_PHASES.finished);
    assert.equal(next.finishReason, "clock-fractured");
    assert.equal(next.health, 0);
  });

  it("lets focus skip protect the runner after charging", () => {
    const now = 2000;
    const charged = {
      ...startTimeRunner(createInitialTimeRunnerState({ now }), now),
      focus: 35,
    };
    const skipped = applyTimeRunnerAction(charged, "qte-right", now + 10);

    assert.equal(skipped.posture, TIME_RUNNER_POSTURES.focus);
    assert.ok(skipped.invulnerableUntil > now);
    assert.equal(skipped.focus, 5);
  });

  it("builds local-only reward intents from unclaimed score", () => {
    const state = {
      ...createInitialTimeRunnerState({ now: 1000 }),
      phase: TIME_RUNNER_PHASES.finished,
      score: 720,
      claimedScore: 120,
      clockShards: 4,
      bestCombo: 9,
      health: 3,
      completed: true,
    };
    const intent = buildTimeRunnerRewardIntent({ state, durationMs: 45000 });

    assert.equal(intent.gameKey, "time-runner");
    assert.equal(intent.eventType, "clocktower-clear");
    assert.equal(intent.score, 600);
    assert.equal(intent.favorPreview, 9);
    assert.equal(intent.items.some((item) => item.key === "clock-face-shard"), true);
    assert.equal(intent.achievementKeys.includes("clocktower-clear"), true);
    assert.equal(intent.duplicatePolicy, "none");
  });
});
