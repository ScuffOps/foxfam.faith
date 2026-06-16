import assert from "node:assert/strict";
import test from "node:test";
import { isPubliclyHiddenFeaturePost } from "./hiddenFeatures.js";

test("hides relic forge feature posts from public release surfaces", () => {
  assert.equal(isPubliclyHiddenFeaturePost({ title: "Relic Forge" }), true);
  assert.equal(isPubliclyHiddenFeaturePost({ title: "  relic   forge  " }), true);
  assert.equal(isPubliclyHiddenFeaturePost({ title: "Reliquary" }), false);
});
