#!/usr/bin/env bash
# Shared helpers for Hotel Collection platform scripts. Sourced, never executed.
# Every script resolves paths from the repository root regardless of CWD.

set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE_FILE="$ROOT/.docker-mode"

# ---------------------------------------------------------------- output ----
if [[ -t 1 ]]; then
  B=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RST=$'\033[0m'
else
  B=""; DIM=""; RED=""; GREEN=""; YELLOW=""; CYAN=""; RST=""
fi

info()  { printf '%s\n' "${CYAN}==> ${RST}${B}$*${RST}"; }
ok()    { printf '%s\n' "${GREEN} ok ${RST} $*"; }
warn()  { printf '%s\n' "${YELLOW} !! ${RST}$*" >&2; }
die()   { printf '%s\n' "${RED}FAIL${RST} $*" >&2; exit 1; }
banner(){ printf '\n%s--- %s ---%s\n' "$B" "$*" "$RST"; }

# ------------------------------------------------------------ environment ---
load_env() {
  [[ -f "$ROOT/.env" ]] && { set -a; source "$ROOT/.env"; set +a; }
  return 0
}

require_env_file() {
  [[ -f "$ROOT/.env" ]] || die ".env not found — run ./scripts/setup.sh first."
  # shellcheck disable=SC1091
  load_env
  [[ -n "${JWT_SECRET:-}" ]] || die "JWT_SECRET is empty in .env — generate one: openssl rand -hex 32"
}

# ------------------------------------------------------------- prerequisites -
require_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker is not installed. See docs/development.md."
  docker info >/dev/null 2>&1 || die "Docker daemon is not running. Start Docker and retry."
  docker compose version >/dev/null 2>&1 || die "Docker Compose v2 plugin not available ('docker compose')."
}

# ------------------------------------------------------- compose invocation --
current_mode() { cat "$MODE_FILE" 2>/dev/null || echo base; }

set_mode() { echo "$1" > "$MODE_FILE"; }

dc() {
  case "$(current_mode)" in
    dev)  docker compose -f "$ROOT/docker-compose.yml" -f "$ROOT/docker-compose.dev.yml" "$@" ;;
    prod) docker compose -f "$ROOT/docker-compose.yml" -f "$ROOT/docker-compose.prod.yml" "$@" ;;
    *)    docker compose -f "$ROOT/docker-compose.yml" "$@" ;;
  esac
}

APP_IMAGES=(hotel-platform/backend:local hotel-platform/frontend:local hotel-platform/backoffice:local)

images_built() {
  local img
  for img in "${APP_IMAGES[@]}"; do
    docker image inspect "$img" >/dev/null 2>&1 || return 1
  done
  return 0
}

# -------------------------------------------------------------- containers ---
service_running() {
  [[ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null || echo false)" == "true" ]]
}

container_exists() {                   # true if the container exists in any state
  docker inspect "$1" >/dev/null 2>&1
}

wait_healthy() {                       # wait_healthy <service> <host-container-name> [timeout]
  local svc="$1" name="$2" timeout="${3:-180}"
  local elapsed=0 state
  printf '  %-11s ' "$svc"
  while (( elapsed < timeout )); do
    state="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo gone)"
    case "$state" in
      healthy) printf '%s\n' "${GREEN}healthy${RST}"; return 0 ;;
      none)
        if service_running "$name"; then printf '%s\n' "${GREEN}running${RST}"; return 0; fi ;;
    esac
    printf '.'
    sleep 3
    elapsed=$((elapsed + 3))
  done
  printf '%s\n' "${RED}timeout after ${timeout}s${RST}"
  return 1
}

# ---------------------------------------------------------------- database ---
pg() {
  dc exec -T postgres psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-hotel_platform}" "$@"
}

db_scalar() {                           # db_scalar "<sql>" -> single value
  pg -tAc "$1" 2>/dev/null || echo ""
}

apply_seed() {
  local seed="$ROOT/backend-hotel/scripts/seed.sql"
  [[ -f "$seed" ]] || die "Seed file not found: $seed"
  pg -v ON_ERROR_STOP=1 -q < "$seed"
}

seed_summary() {
  pg -tA <<'SQL'
SELECT 'hotels        : ' || count(*) FROM hotels
UNION ALL SELECT 'room_types    : ' || count(*) FROM room_types
UNION ALL SELECT 'users         : ' || count(*) FROM users
UNION ALL SELECT 'promotions    : ' || count(*) FROM promotions
UNION ALL SELECT 'platforms     : ' || count(*) FROM platforms;
SQL
}

# -------------------------------------------------------------------- http ---
http_status() {                         # http_status <url> [timeout]
  curl -sS -o /dev/null -w '%{http_code}' -m "${2:-5}" "$1" 2>/dev/null || echo 000
}
