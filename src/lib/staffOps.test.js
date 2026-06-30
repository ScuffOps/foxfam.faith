import assert from "node:assert/strict";
import test from "node:test";
import { formatTimerDuration, getTimeEntryHours, getTimeRangeHours, parseStaffTaskForm } from "./staffOps.js";

test("time range hours subtracts breaks and rejects backwards time", () => {
  assert.equal(getTimeRangeHours("2026-06-20T10:00:00.000Z", "2026-06-20T12:30:00.000Z", 30), 2);
  assert.equal(getTimeRangeHours("2026-06-20T12:30:00.000Z", "2026-06-20T10:00:00.000Z", 0), 0);
});

test("time entry hours uses the same timer math", () => {
  assert.equal(
    getTimeEntryHours({
      started_at: "2026-06-20T01:00:00.000Z",
      ended_at: "2026-06-20T04:15:00.000Z",
      break_minutes: 15,
    }),
    3,
  );
});

test("timer duration formats elapsed work time", () => {
  assert.equal(formatTimerDuration("2026-06-20T00:00:00.000Z", "2026-06-20T01:02:03.000Z", 2), "01:00:03");
  assert.equal(formatTimerDuration("", "2026-06-20T01:02:03.000Z", 0), "00:00:00");
});

test("staff task date-only inputs default to noon", () => {
  const parsed = parseStaffTaskForm({
    title: "Date-only task",
    start_date: "2026-07-01",
    due_date: "2026-07-02",
    priority: "critical",
    status: "pending",
  });

  assert.equal(parsed.start_date, new Date("2026-07-01T12:00").toISOString());
  assert.equal(parsed.due_date, new Date("2026-07-02T12:00").toISOString());
});
