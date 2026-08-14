#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="${0:A:h:h}"
CODEX_DEPENDENCIES_ROOT="${CODEX_DEPENDENCIES_ROOT:-/Users/scuffox/.cache/codex-runtimes/codex-primary-runtime/dependencies}"

if [[ -n "${CODEX_PNPM_BIN:-}" ]]; then
  PNPM_BIN="$CODEX_PNPM_BIN"
elif [[ -x "$CODEX_DEPENDENCIES_ROOT/bin/pnpm" ]]; then
  PNPM_BIN="$CODEX_DEPENDENCIES_ROOT/bin/pnpm"
else
  PNPM_BIN="$CODEX_DEPENDENCIES_ROOT/bin/fallback/pnpm"
fi

if [[ ! -x "$PNPM_BIN" ]]; then
  print -u2 "Codex pnpm runtime not found at: $PNPM_BIN"
  print -u2 "Set CODEX_PNPM_BIN to a working pnpm binary, then retry."
  exit 1
fi

export PNPM_HOME="${PNPM_HOME:-/private/tmp/codex-pnpm-home}"
export PNPM_STORE_DIR="${PNPM_STORE_DIR:-/private/tmp/codex-pnpm-store}"
export PNPM_CONFIG_CACHE_DIR="${PNPM_CONFIG_CACHE_DIR:-/private/tmp/codex-pnpm-cache}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/private/tmp/codex-cache-foxfam}"
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-/private/tmp/codex-npm-cache-foxfam}"

cd "$ROOT_DIR"
exec "$PNPM_BIN" --config.verify-deps-before-run=warn dlx npm@latest "$@"
