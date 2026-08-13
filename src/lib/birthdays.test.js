import test from "node:test";
import assert from "node:assert/strict";
import { BIRTHDAY_WISH_MAX_LENGTH, isBirthdayToday, validateBirthdayWish } from "./birthdays.js";

test("birthday matching ignores the year", () => {
  assert.equal(isBirthdayToday("1999-08-13", new Date("2026-08-13T12:00:00")), true);
  assert.equal(isBirthdayToday("1999-08-14", new Date("2026-08-13T12:00:00")), false);
});

test("birthday wishes are trimmed and capped", () => {
  assert.equal(validateBirthdayWish("  Happy birthday  "), "Happy birthday");
  assert.throws(() => validateBirthdayWish("x".repeat(BIRTHDAY_WISH_MAX_LENGTH + 1)));
});
