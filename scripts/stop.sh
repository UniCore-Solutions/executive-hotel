#!/usr/bin/env bash
# Stop the platform. NEVER deletes the database volume.
# Usage: ./scripts/stop.sh [--remove]
#   --remove  also delete containers/network (volumes are still preserved)
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
load_env

if [[ "${1:-}" == "--remove" ]]; then
  info "Stopping and removing containers (volumes preserved)"
  dc down
  ok "Containers removed. Database volume intact — run ./scripts/start.sh to come back."
else
  info "Stopping all services"
  dc stop
  ok "Platform stopped. Data persisted. Start again with ./scripts/start.sh"
fi
