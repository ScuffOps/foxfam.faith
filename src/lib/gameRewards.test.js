import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLocalRewardCap,
  buildRewardIntent,
  convertDuplicateCatch,
  DUPLICATE_POLICIES,
} from "./gameRewards.js";

const rareFish = {
  key: "aurora-minnow",
  label: "Aurora Minnow",
  rarity: "rare",
};

describe("gameRewards", () => {
  it("keeps duplicate catches without preview grants", () => {
    const result = convertDuplicateCatch({ policy: DUPLICATE_POLICIES.keep, fish: rareFish });
    assert.equal(result.policy, "keep");
    assert.equal(result.favorPreview, 0);
    assert.deepEqual(result.items, []);
  });

  it("releases duplicate catches for local Favor preview", () => {
    const result = convertDuplicateCatch({ policy: DUPLICATE_POLICIES.release, fish: rareFish });
    assert.equal(result.policy, "release");
    assert.equal(result.favorPreview, 7);
    assert.deepEqual(result.items, []);
  });

  it("converts duplicate catches into local Star Glass preview", () => {
    const result = convertDuplicateCatch({ policy: DUPLICATE_POLICIES.convert, fish: rareFish });
    assert.equal(result.policy, "convert");
    assert.equal(result.favorPreview, 0);
    assert.equal(result.items[0].key, "star-glass");
    assert.equal(result.items[0].quantity, 4);
  });

  it("builds validated reward intents", () => {
    const intent = buildRewardIntent({
      gameKey: "starfishing",
      eventType: "catch",
      score: 245.7,
      durationMs: 1200.1,
      favorPreview: 5,
      items: [{ key: "star-glass", label: "Star Glass", quantity: 2, type: "material" }],
      achievementKeys: ["first-catch"],
      duplicatePolicy: "none",
      eventId: "starfishing-test-intent",
      createdAt: "2026-07-08T00:00:00.000Z",
    });

    assert.equal(intent.score, 246);
    assert.equal(intent.durationMs, 1200);
    assert.equal(intent.items[0].label, "Star Glass");
  });

  it("caps local preview values", () => {
    const intent = buildRewardIntent({
      gameKey: "starfishing",
      eventType: "session",
      favorPreview: 900,
      eventId: "starfishing-test-cap",
      createdAt: "2026-07-08T00:00:00.000Z",
    });

    assert.equal(applyLocalRewardCap(intent, 25).favorPreview, 25);
  });
});
