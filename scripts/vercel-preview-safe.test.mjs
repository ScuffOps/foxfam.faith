import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const scriptUrl = new URL("./vercel-preview-safe.zsh", import.meta.url);

function runPreviewGuard(args = []) {
  return spawnSync("zsh", [scriptUrl.pathname, ...args], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      FOXFAM_VERCEL_PREVIEW_DRY_RUN: "1",
    },
  });
}

test("the game-hub branch is allowed to create preview deployments", () => {
  const result = runPreviewGuard();

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Preview-only Vercel deploy approved/);
});

test("production deployment and alias operations are always rejected", () => {
  for (const operation of ["--prod", "--production", "promote", "rollback", "alias"]) {
    const result = runPreviewGuard([operation]);

    assert.notEqual(result.status, 0, operation);
    assert.match(result.stderr, /production operation/);
  }
});
