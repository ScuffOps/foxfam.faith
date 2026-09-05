import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chooseFlavor,
  demoResult,
  dragProgress,
  motionAt,
  RARITIES,
  resultSchema,
  RollSession,
} from "./domain";

test("drag is bounded, cancels upward, and has a usable minimum distance", () => {
  assert.equal(dragProgress(100, 50, 400), 0);
  assert.equal(dragProgress(100, 164, 100), 1);
  assert.equal(dragProgress(100, 500, 500), 1);
});
test("flavor does not immediately repeat", () => {
  assert.equal(chooseFlavor(0, 0), 1);
  assert.equal(chooseFlavor(0.99999, 1), 4);
});
test("all rarities reveal and end with stationary whole-turn hands", () => {
  for (const rarity of Object.keys(RARITIES) as Array<keyof typeof RARITIES>) {
    const end = motionAt(RARITIES[rarity].frames - 1, rarity);
    assert.equal(end.reward, 1);
    assert.equal(end.lift, 1);
    assert.equal(end.hour, -1115);
    assert.equal(end.minute, 2225);
    assert.equal(end.burst, Math.sin(Math.PI));
  }
});
test("reduced motion never rotates the hands or emits rays", () => {
  for (let f = 0; f < 270; f++) {
    const m = motionAt(f, "mythic", true);
    assert.equal(m.hour, -35);
    assert.equal(m.minute, 65);
    assert.equal(m.burst, 0);
  }
});
test("result schema rejects invalid payload and external asset injection", () => {
  assert.equal(resultSchema.safeParse({}).success, false);
  assert.equal(
    resultSchema.safeParse({
      ...demoResult("rare"),
      charm: {
        ...demoResult("rare").charm,
        art: "https://tracker.test/item.png",
      },
    }).success,
    false,
  );
});
test("one pending request only, retries reuse key, next pull renews it", async () => {
  const session = new RollSession();
  const signal = new AbortController().signal;
  let resolve!: (value: unknown) => void;
  const first = session.request(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
    signal,
  );
  const key = session.requestId;
  await assert.rejects(
    () => session.request(async () => demoResult("epic"), signal),
    /already in progress/,
  );
  resolve(demoResult("mythic", key));
  await first;
  await assert.rejects(() =>
    session.request(async () => {
      throw Error("offline");
    }, signal),
  );
  assert.equal(session.requestId, key);
  await session.request(
    async ({ requestId }) => demoResult("mythic", requestId),
    signal,
  );
  assert.equal(session.requestId, key);
  session.next();
  await session.request(
    async ({ requestId }) => demoResult("rare", requestId),
    signal,
  );
  assert.notEqual(session.requestId, key);
});
