import assert from "node:assert/strict";
import test from "node:test";

import {
  FOXFAM_GAME_ART_PALETTE,
  nearestPaletteColor,
  quantizeSvgPalette,
} from "./quantize-game-art-svg.mjs";

test("maps traced RGB and hex fills to the bounded Foxfam palette", () => {
  const source = '<svg><path fill="rgb(255, 255, 255)" stroke="#101722"/><path fill="#abc"/></svg>';
  const output = quantizeSvgPalette(source);
  const colors = [...output.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map((match) => match[1]);

  assert.equal(colors.length, 3);
  assert.ok(colors.every((color) => FOXFAM_GAME_ART_PALETTE.includes(color)));
  assert.equal(new Set(colors).size <= FOXFAM_GAME_ART_PALETTE.length, true);
});

test("preserves non-color paint values and maps dark lineart to navy", () => {
  const source = '<svg><path fill="none" stroke="rgb(10, 12, 18)"/></svg>';
  const output = quantizeSvgPalette(source);

  assert.match(output, /fill="none"/);
  assert.match(output, /stroke="#263b5a"/);
  assert.equal(nearestPaletteColor("#ffffff"), "#fff6e8");
});

test("fails closed until forbidden render constructs are flattened", () => {
  for (const source of [
    '<svg><linearGradient id="g"/></svg>',
    '<svg><path filter="url(#f)"/></svg>',
    '<svg><image href="data:image/png;base64,x"/></svg>',
  ]) {
    assert.throws(() => quantizeSvgPalette(source), /Flatten gradients/);
  }
});

test("rejects malformed custom palettes", () => {
  assert.throws(() => quantizeSvgPalette("<svg/>", ["red"]), /Palette must contain/);
});
