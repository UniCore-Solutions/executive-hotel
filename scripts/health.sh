#!/usr/bin/env bash
# Health gate: exits non-zero if any required service is unhealthy.
# Usage: ./scripts/health.sh [--quiet]
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
load_env

quiet=0; [[ "${1:-}" == "--quiet" ]] && quiet=1

failures=0
record() {  # record <ok|fail> <label> <detail>
  if [[ "$1" == "ok" ]]; then
    (( quiet )) || ok " $2 — $3"
  else
    (( quiet )) || warn "$2 — $3"
    failures=$((failures + 1))
  fi
}

# --- PostgreSQL ---------------------------------------------------------------
if service_running hotel-platform-postgres; then
  if dc exec -T postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-hotel_platform}" >/dev/null 2>&1; then
    record ok "postgres" "accepting connections"
  else
    record fail "postgres" "container running but not accepting connections"
  fi
else
  record fail "postgres" "container not running"
fi

# --- Kafka ---------------------------------------------------------------------
if service_running hotel-platform-kafka; then
  if docker exec hotel-platform-kafka /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 >/dev/null 2>&1; then
    record ok "kafka" "broker responding"
  else
    record fail "kafka" "container running but broker not responding"
  fi
else
  record fail "kafka" "container not running"
fi

# --- Backend --------------------------------------------------------------------
code="$(http_status "http://localhost:${BACKEND_PORT:-8180}/actuator/health/readiness" 10)"
if [[ "$code" == 200 ]]; then
  record ok "backend" "readiness UP"
else
  record fail "backend" "HTTP ${code} on /actuator/health/readiness"
fi

# --- Frontend -------------------------------------------------------------------
code="$(http_status "http://localhost:${FRONTEND_PORT:-3100}/" 15)"
case "$code" in 2*|3*) record ok "frontend" "HTTP ${code}" ;; *) record fail "frontend" "HTTP ${code}" ;; esac

if (( failures > 0 )); then
  die "${failures} health check(s) failed"
fi
(( quiet )) || banner "All health checks passed"
exit 0
