import assert from "node:assert/strict";
import test from "node:test";
import { isNotificationRead, markNotificationRead } from "../lib/notificationState.js";

test("notification read state accepts persisted read_at timestamps", () => {
  assert.equal(isNotificationRead({ read_at: "2026-06-19T20:00:00.000Z" }), true);
  assert.equal(isNotificationRead({ read: true }), true);
  assert.equal(isNotificationRead({ read: false, read_at: null }), false);
});

test("markNotificationRead updates both local and persisted-style fields", () => {
  const updated = markNotificationRead({ id: "note-1", title: "tiny chaos" });

  assert.equal(updated.read, true);
  assert.match(updated.read_at, /^\d{4}-\d{2}-\d{2}T/);
});
