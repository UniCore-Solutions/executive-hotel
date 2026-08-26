#!/usr/bin/env bash
# Start the full platform: PostgreSQL + Kafka + backend + frontend.
# Usage:
#   ./scripts/start.sh            # production-shaped images (default)
#   ./scripts/start.sh --dev      # bind-mounted sources, dev servers (hot iteration)
#   ./scripts/start.sh --prod     # hardened overlay (no DB/Kafka host ports, prod profile)
#   ./scripts/start.sh --build    # force image rebuild before starting
#   ./scripts/start.sh --no-seed  # skip automatic development seeding
set -euo pipefail
source "$(dirname "$0")/common.sh"

mode="$(current_mode)"; force_build=0; no_seed_flag=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev) mode=dev ;;
    --prod) mode=prod ;;
    --base) mode=base ;;
    --build) force_build=1 ;;
    --no-seed) no_seed_flag=1 ;;
    *) die "Unknown option: $1 (use --dev | --prod | --build | --no-seed)" ;;
  esac
  shift
done

require_docker
require_env_file

# Detect legacy containers from the old backend-hotel/docker-compose.yml that
# would collide with our fixed container names.
for legacy in hotel-platform-postgres hotel-platform-kafka; do
  # Skip containers that belong to THIS compose project (same fixed names).
  if docker container inspect "$legacy" >/dev/null 2>&1 \
     && [[ "$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$legacy" 2>/dev/null)" != "hotel-platform" ]]; then
    die "A leftover container named '$legacy' exists (from backend-hotel/docker-compose.yml).
    Remove it first — its data volume is NOT touched:  docker rm -f $legacy"
  fi
done

set_mode "$mode"
info "Starting platform (mode: ${mode})"

if (( force_build )) || ! images_built; then
  if (( force_build )); then
    info "Rebuilding images (--build)"
  else
    info "Application images missing — building them first"
  fi
  "$ROOT/scripts/build.sh"
fi

dc up -d

ok "Waiting for services to become healthy…"
failed=0
wait_healthy postgres hotel-platform-postgres 120  || failed=1
wait_healthy kafka    hotel-platform-kafka    180  || failed=1
wait_healthy backend  hotel-backend           300  || failed=1
(( failed )) && die "Core services failed to become healthy — check ./scripts/logs.sh backend"

wait_healthy frontend   hotel-frontend    90 || true

# ---------------------------------------------------------------- seeding ----
if [[ "$mode" == "prod" ]] || [[ "${SEED_ON_START:-true}" != "true" ]] || (( no_seed_flag )); then
  info "Automatic seeding skipped (mode=${mode}, SEED_ON_START=${SEED_ON_START:-true}${no_seed_flag:+, --no-seed})"
elif [[ "$(db_scalar 'SELECT count(*) FROM hotels')" == "0" ]]; then
  info "Database is empty — applying development seed"
  apply_seed
  ok "Seeded:"
  seed_summary | sed 's/^/   /'
else
  info "Database already contains data — seeding skipped"
fi

frontend_port="${FRONTEND_PORT:-3000}"
backend_port="${BACKEND_PORT:-8180}"

cat <<EOF

${B}Platform is up.${RST}
  Guest frontend : ${GREEN}http://localhost:${frontend_port}${RST}
  Backend API    : http://localhost:${backend_port}/graphql
  GraphiQL       : http://localhost:${backend_port}/graphiql (dev profile only)
  Health         : ./scripts/health.sh
EOF
