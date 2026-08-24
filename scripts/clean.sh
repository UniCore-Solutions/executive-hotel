#!/usr/bin/env bash
# Remove build artifacts. NEVER touches Docker volumes (use db-reset.sh for that).
# Usage: ./scripts/clean.sh [--images] [--all] [--yes]
#   --images  also remove the locally built application images
#   --all     also remove node_modules (reinstalled on next build)
set -euo pipefail
source "$(dirname "$0")/common.sh"

remove_images=0; remove_modules=0; assume_yes=0
for arg in "$@"; do
  case "$arg" in
    --images) remove_images=1 ;;
    --all)    remove_modules=1 ;;
    --yes)    assume_yes=1 ;;
    *) die "Unknown option: $arg" ;;
  esac
done

info "Removing build artifacts"
rm -rf backend-hotel/target
rm -rf frontend-hotel/.next frontend-hotel/test-results frontend-hotel/playwright-report \
       frontend-hotel/coverage frontend-hotel/*.tsbuildinfo
rm -rf backoffice-hotel/.next backoffice-hotel/test-results backoffice-hotel/playwright-report \
       backoffice-hotel/coverage backoffice-hotel/*.tsbuildinfo
ok "Artifacts removed"

if (( remove_images )); then
  info "Removing application images"
  docker rmi -f hotel-platform/backend:local hotel-platform/frontend:local hotel-platform/backoffice:local 2>/dev/null || true
  ok "Images removed (infra images and volumes untouched)"
fi

if (( remove_modules )); then
  if (( ! assume_yes )); then
    read -r -p "Remove node_modules in both frontends? Reinstalled automatically by build. [y/N] " reply
    [[ "${reply:-n}" =~ ^[Yy]$ ]] || { info "Skipped node_modules"; exit 0; }
  fi
  rm -rf frontend-hotel/node_modules backoffice-hotel/node_modules
  ok "node_modules removed"
fi

printf '%s\n' "${DIM}Note: database volumes are never touched by clean.sh — use ./scripts/db-reset.sh${RST}"
