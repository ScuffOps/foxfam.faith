import test from "node:test";
import assert from "node:assert/strict";
import { getCommunityActorKey } from "./communityActor.js";
import { getPublicDisplayName } from "./userIdentity.js";

function installLocalStorageMock(values = {}) {
  const store = new Map(Object.entries(values));
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

test("public display names never fall back to email handles", () => {
  installLocalStorageMock();

  assert.equal(
    getPublicDisplayName({ email: "vera@foxfam.faith" }),
    "Guest",
  );
  assert.equal(
    getPublicDisplayName({ display_name: "  ", username: "", email: "vera@foxfam.faith" }),
    "Guest",
  );
  assert.equal(
    getPublicDisplayName({ username: "shrinekeeper", email: "vera@foxfam.faith" }),
    "shrinekeeper",
  );
});

test("community actor keys do not expose raw emails", () => {
  installLocalStorageMock();

  const actorKey = getCommunityActorKey({ email: "vera@foxfam.faith" });

  assert.notEqual(actorKey, "vera@foxfam.faith");
  assert.equal(actorKey.includes("@"), false);
});
