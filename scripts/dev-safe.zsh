#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="${0:A:h:h}"
NODE_BIN="${CODEX_NODE_BIN:-/Users/scuffox/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"
LOCAL_BIN="$ROOT_DIR/node_modules/.bin"

if [[ ! -x "$NODE_BIN" ]]; then
  print -u2 "Codex Node runtime not found at: $NODE_BIN"
  print -u2 "Set CODEX_NODE_BIN to a working node binary, then retry."
  exit 1
fi

if [[ ! -x "$LOCAL_BIN/vite" ]]; then
  print -u2 "Vite is not installed at: $LOCAL_BIN/vite"
  print -u2 "Run: zsh scripts/npm-safe.zsh install"
  exit 1
fi

export PATH="$LOCAL_BIN:${NODE_BIN:h}:$PATH"
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-/private/tmp/codex-npm-cache-foxfam}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/private/tmp/codex-cache-foxfam}"

exec "$NODE_BIN" "$LOCAL_BIN/vite" "$@"
