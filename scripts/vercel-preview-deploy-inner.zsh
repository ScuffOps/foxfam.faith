#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_ROOT="${SCRIPT_DIR:h}"
VERCEL_BIN="$PROJECT_ROOT/node_modules/.bin/vercel"

for variable_name in VITE_GAME_HUB_STAGING VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY; do
  if [[ -z "${(P)variable_name:-}" ]]; then
    print -u2 "Preview deploy refused: $variable_name was not loaded."
    exit 2
  fi
done

exec "$VERCEL_BIN" deploy --target=preview \
  --build-env "VITE_GAME_HUB_STAGING=$VITE_GAME_HUB_STAGING" \
  --build-env "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" \
  --build-env "VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY" \
  "$@"
