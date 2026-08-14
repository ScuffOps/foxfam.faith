import assert from "node:assert/strict";
import test from "node:test";
import { RELIC_FORGE_GUEST_PREVIEW } from "./relicForgePreviewState.js";

test("guest Forge preview exposes representative relic and charm progression without persistence", () => {
  const preview = RELIC_FORGE_GUEST_PREVIEW;

  assert.equal(preview.relic.name, "Moonwater Promise");
  assert.equal(preview.relic.effects.length, 1);
  assert.ok(preview.forge.balances.favor > 0);
  assert.ok(preview.forge.balances.materials.length >= 4);
  assert.ok(new Set(preview.forge.charms.map((charm) => charm.rarity)).size >= 3);
  assert.ok(preview.forge.charms.some((charm) => charm.source === "achievement"));
  assert.ok(preview.forge.charms.some((charm) => charm.charmKey === "ash-thread"));
});
