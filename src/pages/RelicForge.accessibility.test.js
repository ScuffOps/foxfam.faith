import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./RelicForge.jsx", import.meta.url), "utf8");

test("Relic Forge announces loading and exposes the selected workshop step", () => {
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Loading Relic Forge/);
  assert.match(source, /aria-pressed=\{step === item\}/);
});

test("Relic Forge hides stale owner state and ignores late account responses", () => {
  assert.match(source, /const ownerId = isAuthenticated && authUser\?\.id \? authUser\.id : ""/);
  assert.match(source, /loadEpochRef/);
  assert.match(source, /activeOwnerRef\.current === ownerId/);
  assert.match(source, /loadedOwnerId === ownerId/);
  assert.match(source, /activeOwnerRef\.current !== actionOwnerId/);
});
