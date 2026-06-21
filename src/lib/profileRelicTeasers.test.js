import assert from "node:assert/strict";
import test from "node:test";
import { getProfileRelicTeaser } from "./profileRelicTeasers.js";

test("profile relic teasers are deterministic per public user profile", () => {
  const user = { id: "user-1", display_name: "Veri" };

  assert.deepEqual(getProfileRelicTeaser(user), getProfileRelicTeaser(user));
});

test("profile relic teaser does not depend on email", () => {
  const base = { id: "user-1", display_name: "Veri" };

  assert.deepEqual(
    getProfileRelicTeaser({ ...base, email: "first@example.com" }),
    getProfileRelicTeaser({ ...base, email: "second@example.com" }),
  );
});
