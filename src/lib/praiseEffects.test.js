import assert from "node:assert/strict";
import test from "node:test";
import {
  getPraiseBurstOverlayStyle,
  MAGICAL_PRAISE_TONES,
  PRAISE_BURST_DURATION_MS,
  PRAISE_OVERLAY_Z_INDEX,
  PRAISE_REFRESH_DELAY_MS,
} from "./praiseEffects.js";

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

test("praise burst overlay anchors to the trigger while staying above the page", () => {
  const style = getPraiseBurstOverlayStyle(
    { left: 92, top: 140, width: 84, height: 36 },
    { width: 360, height: 240 }
  );

  assert.deepEqual(style, {
    left: "134px",
    top: "158px",
    zIndex: PRAISE_OVERLAY_Z_INDEX,
  });
  assert.ok(PRAISE_OVERLAY_Z_INDEX >= 9000);
});

test("praise burst overlay keeps edge triggers inside the viewport", () => {
  assert.deepEqual(
    getPraiseBurstOverlayStyle({ left: -20, top: 4, width: 20, height: 16 }, { width: 320, height: 200 }),
    {
      left: "16px",
      top: "16px",
      zIndex: PRAISE_OVERLAY_Z_INDEX,
    }
  );
});
