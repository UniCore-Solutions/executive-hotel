#!/usr/bin/env bash
# Restart every service, preserving the current mode (base/dev/prod).
set -euo pipefail
source "$(dirname "$0")/common.sh"

info "Restarting platform (mode: $(current_mode))"
exec "$ROOT/scripts/start.sh"
