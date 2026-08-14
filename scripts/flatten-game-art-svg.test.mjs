import assert from "node:assert/strict";
import test from "node:test";
import { flattenSvgGradients } from "./flatten-game-art-svg.mjs";

test("linear and radial gradients become their first solid cel tone", () => {
  const source = `<svg viewBox="0 0 3 2"><defs>
    <linearGradient id="light"><stop offset="0%" style="stop-color: rgb(250, 240, 220)"/><stop offset="100%" style="stop-color: rgb(220, 190, 170)"/></linearGradient>
    <radialGradient id="shadow"><stop stop-color="#20324f"/><stop stop-color="#101827"/></radialGradient>
  </defs><path fill="url(#light)" d="M0 0h3v2H0z"/><path style="stroke: url(#shadow)" d="M0 0h1"/></svg>`;
  const flattened = flattenSvgGradients(source);
  assert.doesNotMatch(flattened, /Gradient|url\(#/);
  assert.match(flattened, /fill="rgb\(250, 240, 220\)"/);
  assert.match(flattened, /stroke: #20324f/);
});

test("unresolved paint servers and forbidden rendering features fail closed", () => {
  assert.throws(() => flattenSvgGradients('<svg><path fill="url(#missing)"/></svg>'), /unresolved/);
  assert.throws(() => flattenSvgGradients('<svg><filter id="blur"/></svg>'), /forbidden/);
  assert.throws(() => flattenSvgGradients('<svg><image href="texture.png"/></svg>'), /forbidden/);
});

test("gradient definitions require stable ids and solid stops", () => {
  assert.throws(() => flattenSvgGradients("<svg><linearGradient><stop stop-color=\"#fff\"/></linearGradient></svg>"), /missing an id/);
  assert.throws(() => flattenSvgGradients('<svg><linearGradient id="wash"><stop offset="0"/></linearGradient></svg>'), /no solid stop color/);
});
