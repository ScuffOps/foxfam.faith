#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_ROOT="${SCRIPT_DIR:h}"
cd "$PROJECT_ROOT"

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  print -u2 "Preview deploy refused: the checkout is not on a named branch."
  exit 2
fi

case "$BRANCH" in
  main|master|production|prod|deploy-login-fixed-c218)
    print -u2 "Preview deploy refused: $BRANCH is reserved for production."
    exit 2
    ;;
esac

case "$BRANCH" in
  codex/*|vercel/game-hub-*) ;;
  *)
    print -u2 "Preview deploy refused: $BRANCH is not an approved game-hub staging branch."
    exit 2
    ;;
esac

expect_target_value=0
for argument in "$@"; do
  normalized_argument="${argument:l}"

  if (( expect_target_value )); then
    if [[ "$normalized_argument" != "preview" ]]; then
      print -u2 "Preview deploy refused: deployment target '$argument' is not preview."
      exit 2
    fi

    expect_target_value=0
    continue
  fi

  case "$normalized_argument" in
    --prod|--prod=*|--production|--production=*|promote|rollback|alias)
      print -u2 "Preview deploy refused: production operation '$argument' is forbidden."
      exit 2
      ;;
    --target)
      expect_target_value=1
      ;;
    --target=preview)
      ;;
    --target=*)
      print -u2 "Preview deploy refused: deployment target '${argument#*=}' is not preview."
      exit 2
      ;;
    --build-env|--build-env=*|-b)
      print -u2 "Preview deploy refused: staging build variables are managed by the safe wrapper."
      exit 2
      ;;
  esac
done

if (( expect_target_value )); then
  print -u2 "Preview deploy refused: --target requires the value 'preview'."
  exit 2
fi

if [[ "${FOXFAM_VERCEL_PREVIEW_DRY_RUN:-0}" == "1" ]]; then
  print "Preview-only Vercel deploy approved for branch: $BRANCH"
  exit 0
fi

if [[ ! -f .vercel/project.json ]]; then
  print -u2 "Preview deploy needs an explicit local Vercel project link before it can run."
  exit 2
fi

VERCEL_BIN="$PROJECT_ROOT/node_modules/.bin/vercel"
if [[ ! -x "$VERCEL_BIN" ]]; then
  print -u2 "Preview deploy needs the project's installed Vercel CLI."
  exit 2
fi

"$VERCEL_BIN" env run -e preview --git-branch "$BRANCH" -- \
  node "$PROJECT_ROOT/scripts/game-hub-preview-preflight.mjs"

exec "$VERCEL_BIN" env run -e preview --git-branch "$BRANCH" -- \
  zsh "$PROJECT_ROOT/scripts/vercel-preview-deploy-inner.zsh" "$@"
