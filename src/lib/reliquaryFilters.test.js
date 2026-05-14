import test from "node:test";
import assert from "node:assert/strict";
import { filterReliquaryEntries, getReliquaryCategories } from "./reliquaryFilters.js";

const entries = [
  {
    id: "1",
    title: "Moon Archive",
    subtitle: "quiet ritual notes",
    mood: "ritual",
    tags: ["moon", "field-note"],
    body: "<p>The glass shrine hums.</p>",
    comment_count: 4,
    created_date: "2026-05-02T10:00:00.000Z",
    is_published: true,
  },
  {
    id: "2",
    title: "Signal Fires",
    subtitle: "broadcast fragments",
    mood: "transmission",
    tags: ["stream", "field-note"],
    body: "<p>Static braided with foxlight.</p>",
    comment_count: 1,
    created_date: "2026-05-05T10:00:00.000Z",
    is_published: true,
  },
  {
    id: "3",
    title: "Hidden Draft",
    mood: "ritual",
    tags: ["moon"],
    body: "<p>not ready</p>",
    created_date: "2026-05-09T10:00:00.000Z",
    is_published: false,
  },
];

test("reliquary categories combine moods and tags from published entries", () => {
  assert.deepEqual(getReliquaryCategories(entries), [
    "field-note",
    "moon",
    "ritual",
    "stream",
    "transmission",
  ]);
});

test("reliquary filters search title, subtitle, mood, tags, and body text", () => {
  assert.deepEqual(
    filterReliquaryEntries(entries, { search: "glass shrine", category: "all", sort: "newest" }).map((entry) => entry.id),
    ["1"]
  );

  assert.deepEqual(
    filterReliquaryEntries(entries, { search: "broadcast", category: "transmission", sort: "newest" }).map((entry) => entry.id),
    ["2"]
  );
});

test("reliquary filters can sort by discussion count", () => {
  assert.deepEqual(
    filterReliquaryEntries(entries, { search: "", category: "field-note", sort: "discussed" }).map((entry) => entry.id),
    ["1", "2"]
  );
});
