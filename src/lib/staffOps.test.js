import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTimerDuration,
  getTimeEntryHours,
  getTimeRangeHours,
  parseModShiftForm,
  parseShiftPlannerAssignmentForm,
  parseStaffTaskForm,
} from "./staffOps.js";

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

test("staff date-only inputs default to local noon", () => {
  const task = parseStaffTaskForm({ title: "Date-only task", start_date: "2026-06-29", due_date: "2026-06-30" });
  const shift = parseModShiftForm({ staff_name: "Veri", starts_at: "2026-06-29", ends_at: "2026-06-30" });

  assert.equal(new Date(task.start_date).getHours(), 12);
  assert.equal(new Date(task.due_date).getHours(), 12);
  assert.equal(new Date(shift.starts_at).getHours(), 12);
  assert.equal(new Date(shift.ends_at).getHours(), 12);
});

test("shift planner accepts the overnight availability block", () => {
  const assignment = parseShiftPlannerAssignmentForm({
    staff_name: "Grimmie",
    day: "monday",
    block: "overnight",
  });

  assert.equal(assignment.block, "overnight");
});
