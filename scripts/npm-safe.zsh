#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="${0:A:h:h}"
PNPM_BIN="${CODEX_PNPM_BIN:-/Users/scuffox/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm}"

if [[ ! -x "$PNPM_BIN" ]]; then
  print -u2 "Codex pnpm runtime not found at: $PNPM_BIN"
  print -u2 "Set CODEX_PNPM_BIN to a working pnpm binary, then retry."
  exit 1
fi

export PNPM_HOME="${PNPM_HOME:-/private/tmp/codex-pnpm-home}"
export PNPM_STORE_DIR="${PNPM_STORE_DIR:-/private/tmp/codex-pnpm-store}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/private/tmp/codex-cache-foxfam}"
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-/private/tmp/codex-npm-cache-foxfam}"

cd "$ROOT_DIR"
exec "$PNPM_BIN" dlx npm@latest "$@"
