import assert from "node:assert/strict";
import test from "node:test";
import { GAME_COLORS, GAME_WORLD_ACCENTS, getWorldAccent } from "./gameTheme.js";

test("game theme exposes the approved chalk palette", () => {
  assert.equal(GAME_COLORS.dreamLinen, "#FAF3EB");
  assert.equal(GAME_COLORS.malibuBlue, "#D9E6EC");
  assert.equal(GAME_COLORS.ink, "#364152");
  assert.equal(GAME_COLORS.outline, "#485365");
});

test("every playable world has a readable accent", () => {
  assert.equal(Object.keys(GAME_WORLD_ACCENTS).length, 6);

  for (const accent of Object.values(GAME_WORLD_ACCENTS)) {
    assert.match(accent.surface, /^#[0-9A-F]{6}$/i);
    assert.equal(accent.text, GAME_COLORS.ink);
  }

  assert.equal(getWorldAccent("missing").surface, GAME_COLORS.malibuBlue);
});
