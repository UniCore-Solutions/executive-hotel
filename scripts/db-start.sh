#!/usr/bin/env bash
# Start only the data services (PostgreSQL + Kafka).
# Usage: ./scripts/db-start.sh [--no-kafka]
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
load_env

services=(postgres kafka)
[[ "${1:-}" == "--no-kafka" ]] && services=(postgres)

info "Starting: ${services[*]}"
dc up -d "${services[@]}"

failed=0
[[ " ${services[*]} " == *" postgres "* ]] && { wait_healthy postgres hotel-platform-postgres 120 || failed=1; }
[[ " ${services[*]} " == *" kafka "* ]]    && { wait_healthy kafka    hotel-platform-kafka    180 || failed=1; }
(( failed )) && die "Data services failed to become healthy"
ok "Data services ready (postgres:${POSTGRES_HOST_PORT:-5432} kafka:${KAFKA_HOST_PORT:-9092})"
