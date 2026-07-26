import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaSource = readFileSync(new URL("./CloisterDiorama.jsx", import.meta.url), "utf8");

test("Find Vezmir help distinguishes panning from depth controls", () => {
  assert.match(dioramaSource, /WASD \/ arrow keys to pan/);
  assert.match(dioramaSource, /Q \/ E changes depth/);
  assert.match(dioramaSource, /depth buttons move nearer or farther/);
  assert.doesNotMatch(dioramaSource, /arrows to change depth/);
});
