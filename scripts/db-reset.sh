#!/usr/bin/env bash
# DESTRUCTIVE: recreate the database from scratch (fresh volume), run Flyway
# migrations via a backend boot, and (by default) apply the development seed.
#
# Usage:
#   ./scripts/db-reset.sh            # asks for confirmation
#   ./scripts/db-reset.sh --yes      # no prompt
#   ./scripts/db-reset.sh --no-seed  # migrations only, empty business tables
#
# Normal stop/start NEVER deletes data — only this command does.
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
require_env_file

assume_yes=0; seed=1
for arg in "$@"; do
  case "$arg" in
    --yes) assume_yes=1 ;;
    --no-seed) seed=0 ;;
    *) die "Unknown option: $arg" ;;
  esac
done

cat <<EOF

${RED}${B}  WARNING — DESTRUCTIVE OPERATION ${RST}
  This permanently deletes the ${B}${POSTGRES_DB:-hotel_platform}${RST} database volume
  and recreates it with Flyway migrations${seed:+ plus development demo data}.

  Back up first if needed: ./scripts/db-backup.sh

EOF
if (( ! assume_yes )); then
  read -r -p "Type 'RESET' to continue: " reply
  [[ "$reply" == "RESET" ]] || { info "Aborted — database untouched."; exit 0; }
fi

# Remember which app containers existed so we can restore them (existence, not
# running-state — a previously aborted reset leaves them stopped and must heal).
was_frontend=0; was_backoffice=0
container_exists hotel-frontend   && was_frontend=1
container_exists hotel-backoffice && was_backoffice=1

info "Stopping application containers"
dc stop backend frontend backoffice >/dev/null 2>&1 || true

info "Removing PostgreSQL container and its data volume"
dc rm -sf postgres >/dev/null
docker volume ls -q --filter name=hotel-platform_postgres_data | xargs -r docker volume rm >/dev/null
ok "Volume removed"

info "Starting fresh PostgreSQL"
dc up -d postgres >/dev/null
wait_healthy postgres hotel-platform-postgres 120

info "Starting backend to run Flyway migrations"
dc up -d backend >/dev/null
wait_healthy backend hotel-backend 300 || die "Backend failed during migration — check ./scripts/logs.sh backend"

migrations="$(db_scalar 'SELECT count(*) FROM flyway_schema_history')"
ok "Flyway history rows: ${migrations}"

if (( seed )); then
  info "Applying development seed"
  apply_seed
  ok "Seeded:"
  seed_summary | sed 's/^/   /'
else
  info "Skipping seed (--no-seed)"
fi

(( was_frontend ))   && dc start frontend   >/dev/null 2>&1 || true
(( was_backoffice )) && dc start backoffice >/dev/null 2>&1 || true

banner "Database reset complete"
