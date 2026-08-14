import assert from "node:assert/strict";
import test from "node:test";

import { presentClaimAchievements } from "./gameRewardReceiptPresentation.js";

test("claim achievement presentation preserves authoritative collectible provenance", () => {
  const collectible = {
    kind: "charm",
    charmKey: "full-bloom-quill",
    label: "Full Bloom Quill",
    rarity: "epic",
    slot: "profile-frame",
    effects: { profile_frame: "full-bloom" },
    trophyKey: "full-bloom",
  };
  assert.deepEqual(presentClaimAchievements({
    achievements: [{ key: "word-garden-full-bloom", title: "Full Bloom", collectible }],
  }), [{ key: "word-garden-full-bloom", title: "Full Bloom", collectible }]);
  assert.deepEqual(presentClaimAchievements({ achievements: [{ key: "legacy", title: "Legacy" }] }), [
    { key: "legacy", title: "Legacy" },
  ]);
});
