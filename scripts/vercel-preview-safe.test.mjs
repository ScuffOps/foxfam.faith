import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const scriptUrl = new URL("./vercel-preview-safe.zsh", import.meta.url);
const scriptSource = readFileSync(scriptUrl, "utf8");
const innerDeploySource = readFileSync(new URL("./vercel-preview-deploy-inner.zsh", import.meta.url), "utf8");

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
  for (const operation of [
    ["--prod"],
    ["--prod=true"],
    ["--production"],
    ["--target=production"],
    ["--target", "production"],
    ["promote"],
    ["rollback"],
    ["alias"],
    ["--build-env", "VITE_SUPABASE_URL=https://example.com"],
    ["--build-env=VITE_GAME_HUB_STAGING=0"],
    ["-b", "VITE_GAME_HUB_STAGING=0"],
  ]) {
    const result = runPreviewGuard(operation);

    assert.notEqual(result.status, 0, operation);
    assert.match(result.stderr, /production operation|not preview|managed by the safe wrapper/);
  }
});

test("only the preview deployment target is accepted", () => {
  for (const operation of [["--target=preview"], ["--target", "preview"]]) {
    const result = runPreviewGuard(operation);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Preview-only Vercel deploy approved/);
  }
});

test("a target flag without a value is rejected", () => {
  const result = runPreviewGuard(["--target"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires the value 'preview'/);
});

test("real deploys validate branch-scoped variables and force the preview target", () => {
  assert.match(scriptSource, /env run -e preview --git-branch "\$BRANCH"/);
  assert.match(scriptSource, /game-hub-preview-preflight\.mjs/);
  assert.match(scriptSource, /vercel-preview-deploy-inner\.zsh/);
  assert.match(innerDeploySource, /deploy --target=preview/);
  assert.match(innerDeploySource, /--build-env "VITE_GAME_HUB_STAGING=/);
  assert.match(innerDeploySource, /--build-env "VITE_SUPABASE_URL=/);
  assert.match(innerDeploySource, /--build-env "VITE_SUPABASE_PUBLISHABLE_KEY=/);
});
