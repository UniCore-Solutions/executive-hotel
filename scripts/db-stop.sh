#!/usr/bin/env bash
# Stop only the data services (PostgreSQL + Kafka). Data volumes are preserved.
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
info "Stopping postgres and kafka"
dc stop postgres kafka
ok "Data services stopped (data persisted)"
