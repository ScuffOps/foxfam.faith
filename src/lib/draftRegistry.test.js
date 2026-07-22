import assert from "node:assert/strict";
import test from "node:test";
import { discardSavedDraft, listSavedDrafts } from "./draftRegistry.js";

function withStorage(entries, callback) {
  const storage = new Map(Object.entries(entries));
  global.window = {
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      removeItem: (key) => storage.delete(key),
    },
  };
  try {
    callback(storage);
  } finally {
    delete global.window;
  }
}

test("draft center lists meaningful drafts and ignores empty shells", () => {
  withStorage({
    "foxfam.draft.community-post.new.v1": JSON.stringify({ title: "A saved thought", description: "", type: "idea" }),
    "foxfam.draft.suggestion.new.v1": JSON.stringify({ title: "", description: "", category: "other_feedback" }),
  }, () => {
    assert.deepEqual(listSavedDrafts().map((draft) => draft.label), ["Community post"]);
  });
});

test("draft center can discard a saved draft", () => {
  const key = "foxfam.draft.forum-thread.new.v1";
  withStorage({ [key]: JSON.stringify({ title: "Later", body: "A thread" }) }, (storage) => {
    discardSavedDraft(key);
    assert.equal(storage.has(key), false);
  });
});
