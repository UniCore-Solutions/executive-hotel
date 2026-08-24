#!/usr/bin/env bash
# Show aggregated or per-service logs.
# Usage:
#   ./scripts/logs.sh                 # all services, last 100 lines
#   ./scripts/logs.sh backend         # one service (postgres|kafka|backend|frontend|backoffice)
#   ./scripts/logs.sh backend -f      # follow
#   ./scripts/logs.sh --tail 500 -f   # options apply to all services
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker

declare -A alias=(
  [db]=postgres [postgres]=postgres [kafka]=kafka
  [api]=backend [backend]=backend
  [web]=frontend [frontend]=frontend
  [admin]=backoffice [backoffice]=backoffice
)

service=""; opts=(--timestamps --tail 100)
while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--follow) opts+=(--follow) ;;
    --tail) opts+=(--tail "$2"); shift ;;
    *) [[ -n "${alias[$1]:-}" ]] && service="${alias[$1]}" || die "Unknown service '$1' (use: postgres kafka backend frontend backoffice)" ;;
  esac
  shift
done

if [[ -n "$service" ]]; then
  dc logs "${opts[@]}" "$service"
else
  dc logs "${opts[@]}"
fi
