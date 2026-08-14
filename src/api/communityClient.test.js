import assert from "node:assert/strict";
import test from "node:test";

import { isProfileInsertConflict } from "./communityClient.js";

test("profile bootstrap retries only duplicate-key conflicts", () => {
  assert.equal(isProfileInsertConflict({ code: "23505" }), true);
  assert.equal(isProfileInsertConflict({ status: 409 }), true);
  assert.equal(isProfileInsertConflict({ statusCode: 409 }), true);
  assert.equal(isProfileInsertConflict({ code: "42501", status: 403 }), false);
  assert.equal(isProfileInsertConflict(new Error("network unavailable")), false);
  assert.equal(isProfileInsertConflict(null), false);
});
