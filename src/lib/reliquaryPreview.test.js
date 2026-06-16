import test from "node:test";
import assert from "node:assert/strict";
import { getReliquaryPreview } from "./reliquaryPreview.js";

test("reliquary preview keeps the first five meaningful lines", () => {
  const preview = getReliquaryPreview(`
    First signal.

    Second signal.
    Third signal.
    Fourth signal.
    Fifth signal.
    Sixth signal.
  `);

  assert.equal(preview.text, "First signal.\nSecond signal.\nThird signal.\nFourth signal.\nFifth signal.");
  assert.equal(preview.hasMore, true);
});

test("reliquary preview falls back to a short prose excerpt", () => {
  const preview = getReliquaryPreview("The shrine hums with a long field note that needs to stay compact.", 5, 24);

  assert.equal(preview.text, "The shrine hums with a...");
  assert.equal(preview.hasMore, true);
});
