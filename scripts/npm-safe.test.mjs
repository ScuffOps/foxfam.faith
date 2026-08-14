import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./npm-safe.zsh", import.meta.url), "utf8");

test("npm-safe resolves both current and fallback bundled pnpm locations", () => {
  assert.match(source, /CODEX_DEPENDENCIES_ROOT/);
  assert.match(source, /bin\/pnpm/);
  assert.match(source, /bin\/fallback\/pnpm/);
  assert.match(source, /CODEX_PNPM_BIN/);
});

test("npm-safe keeps package-manager caches outside the repository", () => {
  assert.match(source, /PNPM_CONFIG_CACHE_DIR=.*\/private\/tmp\/codex-pnpm-cache/);
  assert.match(source, /PNPM_STORE_DIR=.*\/private\/tmp\/codex-pnpm-store/);
  assert.match(source, /NPM_CONFIG_CACHE=.*\/private\/tmp\/codex-npm-cache-foxfam/);
});

test("npm-safe does not auto-install when pnpm inspects an npm worktree", () => {
  assert.match(source, /--config\.verify-deps-before-run=warn/);
  assert.match(source, /dlx npm@latest/);
});
