import assert from "node:assert/strict";
import test from "node:test";
import { MAGICAL_PRAISE_TONES, PRAISE_BURST_DURATION_MS, PRAISE_REFRESH_DELAY_MS } from "./praiseEffects.js";

test("praise burst stays visible longer than delayed refreshes", () => {
  assert.ok(PRAISE_BURST_DURATION_MS > PRAISE_REFRESH_DELAY_MS);
  assert.ok(PRAISE_REFRESH_DELAY_MS >= 2000);
});

test("magical praise sound uses a rising sparkle chord", () => {
  assert.ok(MAGICAL_PRAISE_TONES.length >= 5);
  for (let index = 1; index < MAGICAL_PRAISE_TONES.length; index += 1) {
    assert.ok(MAGICAL_PRAISE_TONES[index].frequency > MAGICAL_PRAISE_TONES[index - 1].frequency);
    assert.ok(MAGICAL_PRAISE_TONES[index].delay > MAGICAL_PRAISE_TONES[index - 1].delay);
  }
});
