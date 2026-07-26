import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profile = readFileSync(new URL("../pages/Profile.jsx", import.meta.url), "utf8");
const quarters = readFileSync(new URL("../pages/QuartersHub.jsx", import.meta.url), "utf8");

test("profile and Quarters prefer authoritative Favor and expose the live Forge", () => {
  assert.match(profile, /visibleProgression\?\.favorBalance/);
  assert.match(quarters, /visibleProgression\?\.favorBalance/);
  assert.match(profile, /to="\/relic-forge"/);
  assert.doesNotMatch(profile, /Forge Opens Soon/);
});

test("profile exposes a shareable privacy-safe Quarters visit path", () => {
  assert.match(profile, /to=\{`\/quarters\/\$\{ownerId\}`\}/);
  assert.match(profile, /Preview public Quarters/);
  assert.match(profile, /navigator\.clipboard\.writeText\(quartersUrl\)/);
  assert.match(profile, /Copy visit link/);
});

test("equipped cosmetic achievement charms have restrained profile hooks", () => {
  assert.match(profile, /effects\?\.profile_frame/);
  assert.match(profile, /effects\?\.profile_particle/);
  assert.doesNotMatch(profile, /radial-gradient|linear-gradient|drop-shadow/);
});
