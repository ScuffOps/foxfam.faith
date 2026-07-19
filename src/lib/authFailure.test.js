import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyAuthFailure,
  isAuthUnavailable,
} from "./authFailure.js";

const here = dirname(fileURLToPath(import.meta.url));

test("401 auth failures are normal signed-out sessions", () => {
  assert.equal(classifyAuthFailure({ status: 401, message: "Authentication required" }), null);
  assert.equal(isAuthUnavailable(null), false);
});

test("network and non-401 auth failures remain durable service errors", () => {
  assert.deepEqual(classifyAuthFailure(new TypeError("Failed to fetch")), {
    type: "auth_unavailable",
    message: "Foxfam could not verify your session. Your saved data has not been changed.",
  });
  assert.deepEqual(classifyAuthFailure({ status: 503, message: "upstream unavailable" }), {
    type: "auth_unavailable",
    message: "Foxfam could not verify your session. Your saved data has not been changed.",
  });
  assert.equal(isAuthUnavailable({ type: "auth_unavailable" }), true);
  assert.equal(isAuthUnavailable({ type: "unknown" }), true);
  assert.equal(isAuthUnavailable({ type: "auth_required" }), false);
});

test("provider, app, Profile, and Quarters preserve unavailable auth distinctly", () => {
  const authSource = readFileSync(join(here, "AuthContext.jsx"), "utf8");
  const appSource = readFileSync(join(here, "../App.jsx"), "utf8");
  const profileSource = readFileSync(join(here, "../pages/Profile.jsx"), "utf8");
  const quartersSource = readFileSync(join(here, "../pages/QuartersHub.jsx"), "utf8");

  assert.match(authSource, /classifyAuthFailure\(error\)/);
  assert.match(authSource, /setAuthError\(classifyAuthFailure\(error\)\)/);
  assert.match(appSource, /isAuthUnavailable\(authError\)/);
  assert.match(appSource, /Foxfam service unavailable/);
  assert.match(appSource, /checkUserAuth/);
  assert.doesNotMatch(appSource, /isAuthUnavailable\(authError\)[\s\S]{0,300}navigateToLogin/);
  assert.match(profileSource, /isAuthUnavailable\(authError\)/);
  assert.match(profileSource, /Profile service unavailable/);
  assert.match(quartersSource, /isAuthUnavailable\(authError\)/);
  assert.match(quartersSource, /Quarters service unavailable/);
});
