#!/usr/bin/env bash
# Build all application Docker images (backend, frontend, backoffice).
# Usage: ./scripts/build.sh [--no-cache] [--pull] [--backend|--frontend|--backoffice]
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
load_env

args=(build)
targets=(backend frontend backoffice)
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache) args+=(--no-cache) ;;
    --pull)     args+=(--pull) ;;
    --backend)   targets=(backend);;
    --frontend)  targets=(frontend);;
    --backoffice) targets=(backoffice);;
    *) die "Unknown option: $1" ;;
  esac
  shift
done

mode="$(current_mode)"
info "Building images (mode: ${mode}) — this can take several minutes on first run"
dc "${args[@]}" "${targets[@]}"

ok "All images built successfully:"
for img in "${APP_IMAGES[@]}"; do
  printf '   %-40s %s\n' "$img" "$(docker image inspect -f '{{.Size}}' "$img" 2>/dev/null | awk '{printf "%.0f MB", $1/1024/1024}' || echo 'n/a')"
done
