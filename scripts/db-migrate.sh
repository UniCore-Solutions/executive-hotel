#!/usr/bin/env bash
# Run pending Flyway migrations by recreating the backend container
# (migrations execute automatically on backend startup — this script just makes
# that explicit and shows the resulting migration history).
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
require_env_file

if ! service_running hotel-platform-postgres; then
  info "PostgreSQL not running — starting data services"
  "$ROOT/scripts/db-start.sh"
fi

info "Recreating backend so Flyway applies pending migrations"
dc up -d --force-recreate backend >/dev/null
wait_healthy backend hotel-backend 300 || die "Backend failed — check ./scripts/logs.sh backend"

banner "Flyway history (latest 25)"
pg -c "SELECT installed_rank, version, description, success
       FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 25;"

ok "Database schema is up to date"
