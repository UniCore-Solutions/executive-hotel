#!/usr/bin/env bash
# Show containers, health, ports and service status.
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker

printf '%s\n' "${B}Hotel Collection — mode: $(current_mode)${RST}"
dc ps --format 'table {{.Name}}\t{{.Service}}\t{{.Status}}\t{{.Ports}}'

printf '\n%s\n' "${B}Health${RST}"
load_env
check() {   # check <label> <container> [url]
  local label="$1" name="$2" url="${3:-}"
  if ! service_running "$name"; then
    printf '  %-12s %s\n' "$label" "${RED}stopped${RST}"
    return
  fi
  local state
  state="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name")"
  if [[ -n "$url" ]]; then
    local code; code="$(http_status "$url" 5)"
    case "$code" in
      2*|3*) printf '  %-12s %s (HTTP %s)\n' "$label" "${GREEN}healthy${RST}" "$code" ;;
      *)     printf '  %-12s %s (HTTP %s)\n' "$label" "${YELLOW}degraded${RST}" "$code" ;;
    esac
  else
    case "$state" in
      healthy) printf '  %-12s %s\n' "$label" "${GREEN}healthy${RST}" ;;
      *)       printf '  %-12s %s\n' "$label" "${YELLOW}${state}${RST}" ;;
    esac
  fi
}

check postgres hotel-platform-postgres
check kafka    hotel-platform-kafka
check backend  hotel-backend           "http://localhost:${BACKEND_PORT:-8180}/actuator/health/readiness"
check frontend hotel-frontend          "http://localhost:${FRONTEND_PORT:-3100}/"
