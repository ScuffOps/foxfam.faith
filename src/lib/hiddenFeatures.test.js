import assert from "node:assert/strict";
import test from "node:test";
import { isPubliclyHiddenFeaturePost } from "./hiddenFeatures.js";

test("does not hide relic forge feature posts from public release surfaces", () => {
  assert.equal(isPubliclyHiddenFeaturePost({ title: "Relic Forge" }), false);
  assert.equal(isPubliclyHiddenFeaturePost({ title: "  relic   forge  " }), false);
  assert.equal(isPubliclyHiddenFeaturePost({ title: "Reliquary" }), false);
});
