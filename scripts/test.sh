#!/usr/bin/env bash
# Run the platform's existing test suites.
# Usage: ./scripts/test.sh [--backend|--frontend|--backoffice|--e2e]  (default: all except e2e)
#
#   backend    : ./mvnw test            (JUnit + Testcontainers — needs Docker)
#   frontend   : tsc --noEmit + vitest  (frontend-hotel)
#   backoffice : tsc --noEmit + vitest  (backoffice-hotel)
#   --e2e      : Playwright suites (expect the stack to be running; browsers must be installed)
set -euo pipefail
source "$(dirname "$0")/common.sh"

run_backend=0; run_frontend=0; run_backoffice=0; run_e2e=0
if [[ $# -eq 0 ]]; then
  run_backend=1; run_frontend=1; run_backoffice=1
else
  for arg in "$@"; do
    case "$arg" in
      --backend) run_backend=1 ;;
      --frontend) run_frontend=1 ;;
      --backoffice) run_backoffice=1 ;;
      --e2e) run_e2e=1 ;;
      *) die "Unknown option: $arg" ;;
    esac
  done
fi

results=()
record() { results+=("$1|$2"); }

if (( run_backend )); then
  banner "Backend tests (mvnw test — unit, ArchUnit, Testcontainers integration)"
  require_docker
  if ( cd backend-hotel && ./mvnw -B test ); then record "ok" "backend"; else record "fail" "backend"; fi
fi

if (( run_frontend )); then
  banner "Frontend-hotel: typecheck + vitest"
  if ( cd frontend-hotel && npm run typecheck ); then record "ok" "frontend:typecheck"; else record "fail" "frontend:typecheck"; fi
  if ( cd frontend-hotel && npm test ); then record "ok" "frontend:vitest"; else record "fail" "frontend:vitest"; fi
fi

if (( run_backoffice )); then
  banner "Backoffice-hotel: typecheck + vitest"
  if ( cd backoffice-hotel && npm run typecheck ); then record "ok" "backoffice:typecheck"; else record "fail" "backoffice:typecheck"; fi
  if ( cd backoffice-hotel && npm test ); then record "ok" "backoffice:vitest"; else record "fail" "backoffice:vitest"; fi
fi

if (( run_e2e )); then
  banner "Playwright end-to-end suites"
  warn "E2E expects the stack to be running (./scripts/start.sh)."
  if ( cd frontend-hotel && npm run test:e2e ); then record "ok" "frontend:e2e"; else record "fail" "frontend:e2e"; fi
  if ( cd backoffice-hotel && npm run test:e2e ); then record "ok" "backoffice:e2e"; else record "fail" "backoffice:e2e"; fi
fi

banner "Test summary"
failed=0
for entry in "${results[@]}"; do
  status="${entry%%|*}"; name="${entry#*|}"
  if [[ "$status" == "ok" ]]; then ok "  $name"; else warn "$name"; failed=$((failed + 1)); fi
done

(( failed )) && die "${failed} suite(s) failed"
ok "All requested suites passed"
