import assert from "node:assert/strict";
import test from "node:test";
import { appendModerationHistory, formatModerationStatus, getModerationSummary } from "./moderation.js";

test("appendModerationHistory prepends public-safe status entries", () => {
  const next = appendModerationHistory(
    { status: "open", moderation_history: [{ status: "open", actor_name: "Staff", created_at: "2026-01-01T00:00:00.000Z" }] },
    { status: "closed", actorName: "Mod", note: "Resolved" },
  );

  assert.equal(next[0].status, "closed");
  assert.equal(next[0].actor_name, "Mod");
  assert.equal(next[0].note, "Resolved");
  assert.equal(next[1].status, "open");
});

test("getModerationSummary groups active pending and closed records", () => {
  const summary = getModerationSummary(
    [{ status: "approved" }, { status: "pending" }, { status: "fixed" }, { status: "rejected" }],
    new Set(["fixed", "rejected"]),
  );

  assert.deepEqual(summary, { active: 1, pending: 1, closed: 2, total: 4 });
});

test("formatModerationStatus makes stored statuses readable", () => {
  assert.equal(formatModerationStatus("cannot_reproduce"), "Cannot Reproduce");
});
