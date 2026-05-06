import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_CATEGORY_OPTIONS, getCategoryColor, getEventDayAccent } from "./categoryColors.js";

test("event categories expose stable swatch-backed colors", () => {
  const keys = EVENT_CATEGORY_OPTIONS.map((category) => category.key);
  assert.deepEqual(keys, ["stream", "community", "collabs", "birthdays", "personal"]);
  assert.equal(getCategoryColor("community").hex, "#3c5693");
  assert.equal(getCategoryColor("collabs").swatch, "Strikemaster");
  assert.equal(getCategoryColor("birthdays").swatch, "Charlotte");
});

test("calendar day accent is stable when a day has multiple event categories", () => {
  const accent = getEventDayAccent([
    { category: "community" },
    { category: "birthdays" },
    { category: "stream" },
  ]);

  assert.equal(accent.swatch, "Charlotte");
});
