#!/usr/bin/env bash
# Lint both Next.js applications with their existing ESLint configs.
set -euo pipefail
source "$(dirname "$0")/common.sh"

failed=0
banner "ESLint: frontend-hotel"
( cd frontend-hotel && npm run lint ) || failed=$((failed + 1))

banner "ESLint: backoffice-hotel"
( cd backoffice-hotel && npm run lint ) || failed=$((failed + 1))

(( failed )) && die "${failed} lint run(s) failed"
ok "Lint clean"
