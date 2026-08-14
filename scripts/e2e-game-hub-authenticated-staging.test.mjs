import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { writeAuthenticatedStagingFailureReport } from "./e2e-game-hub-authenticated-staging.mjs";

const source = readFileSync(new URL("./e2e-game-hub-authenticated-staging.mjs", import.meta.url), "utf8");

test("authenticated game-hub smoke is pinned to isolated staging and a Vercel preview", () => {
  assert.match(source, /EXPECTED_PROJECT_REF = "drauxhhxlatvylzktuqq"/);
  assert.match(source, /Refusing a non-isolated Supabase target/);
  assert.match(source, /PREVIEW_HOST_PATTERN/);
  assert.match(source, /Refusing a non-preview Vercel host/);
  assert.match(source, /VITE_GAME_HUB_STAGING/);
});

test("authenticated smoke uses publishable signup and never logs credentials", () => {
  assert.match(source, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(source, /client\.auth\.signUp/);
  assert.match(source, /client\.auth\.signInWithPassword/);
  assert.match(source, /Existing staging-user mode requires id, email, and password together/);
  assert.match(source, /localStorage\.setItem\(storageKey, JSON\.stringify\(storedSession\)\)/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*(?:password|accessToken|refresh_token|storedSession)/s);
});

test("authenticated smoke drives a real Word Garden claim and verifies portal projections", () => {
  assert.match(source, /Start rewarded garden/);
  assert.match(source, /Skip onboarding/);
  assert.match(source, /wordGardenSmokeWordsForPuzzle/);
  assert.match(source, /click\(\{ trial: true \}\)/);
  assert.match(source, /word-flower__draft-wrap/);
  assert.match(source, /Current word:/);
  assert.match(source, /Latest found word/);
  assert.match(source, /Rest the garden/);
  assert.match(source, /Claim portal rewards/);
  assert.match(source, /produced no matching response on/);
  assert.match(source, /Blooming Ink/);
  assert.match(source, /Charm Reliquary/);
  assert.match(source, /Achievement Chronicle/);
  assert.match(source, /Trophy Shelf/);
  assert.match(source, /Owned charms/);
});

test("authenticated smoke reports one exact user for deterministic cleanup", () => {
  assert.match(source, /DELETE_EXACT_STAGING_USER_AFTER_RUN/);
  assert.match(source, /awaiting_exact_user_confirmation/);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /cleanupUserIds\.push\(disposableUser\.id\)/);
  assert.match(source, /cleanupUserIds: report\.cleanupUserIds/);
  assert.doesNotMatch(source, /delete_branch|DELETE_DISPOSABLE_PROJECT_AFTER_RUN/);
});

test("authenticated smoke failure diagnostics contain no session secrets", () => {
  assert.match(source, /collectAuthDiagnostics/);
  assert.match(source, /storedUserId/);
  assert.match(source, /failedResponses/);
  assert.doesNotMatch(source, /diagnostics.*(?:access_token|refresh_token|password)/s);
});

test("authenticated smoke writes a secret-free external prerequisite report on confirmation timeout", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "foxfam-auth-smoke-test-"));
  try {
    const error = new Error("Timed out waiting for exact staging-user confirmation.");
    error.cleanupUserIds = ["user-1", "user-1"];

    const reportPath = await writeAuthenticatedStagingFailureReport({
      cleanupUserIds: error.cleanupUserIds,
      error,
      outputDir,
      previewUrl: "https://foxfamfaith-example-scuffops.vercel.app",
    });
    const report = JSON.parse(await readFile(reportPath, "utf8"));

    assert.deepEqual(report, {
      status: "blocked_external_prerequisite",
      reason: "email_confirmation_required",
      projectRef: "drauxhhxlatvylzktuqq",
      previewHost: "foxfamfaith-example-scuffops.vercel.app",
      cleanupContract: "DELETE_EXACT_STAGING_USER_AFTER_RUN",
      cleanupUserIds: ["user-1"],
      message: "Timed out waiting for exact staging-user confirmation.",
    });
    assert.deepEqual(
      Object.keys(report).filter((key) => ["password", "access_token", "refresh_token", "email"].includes(key)),
      [],
    );
    assert.doesNotMatch(JSON.stringify(report), /game-browser-smoke|Ff!/i);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
