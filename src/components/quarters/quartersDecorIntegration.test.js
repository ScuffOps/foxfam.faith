import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const hub = readFileSync(new URL("../../pages/QuartersHub.jsx", import.meta.url), "utf8");
const room = readFileSync(new URL("./IsometricRoom.jsx", import.meta.url), "utf8");

test("Quarters loads, previews, and saves decor without a placeholder action", () => {
  assert.match(hub, /loadQuartersDecor/);
  assert.match(hub, /saveQuartersDecor/);
  assert.match(hub, /<QuartersDecorPanel/);
  assert.doesNotMatch(hub, /Decoration placement is staged/);
  assert.match(hub, /Promise\.allSettled/);
  assert.match(hub, /decorStatus !== "ready"/);
  assert.match(hub, /enabled: !loading && !selectedStation/);
});

test("Quarters never converts a failed owner decor load into saveable defaults", () => {
  assert.match(hub, /if \(decorResult\.data\)/);
  assert.match(hub, /setDecorStatus\("error"\)/);
  assert.match(hub, /Saving is paused to protect it/);
  assert.doesNotMatch(hub, /decorResult\.data \|\| \{ \.\.\.DEFAULT_QUARTERS_DECOR \}/);
});

test("Quarters renders decor in an independent art layer", () => {
  assert.match(room, /<RoomDecor layout=\{decor\}/);
  assert.match(room, /data-decor-slot="rug"/);
  assert.match(room, /data-decor-slot="wall"/);
  assert.match(room, /data-decor-slot="shelf"/);
  assert.match(room, /data-decor-slot="nook"/);
});
