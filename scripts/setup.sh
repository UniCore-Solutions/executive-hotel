#!/usr/bin/env bash
# One-time machine setup: verifies prerequisites, creates .env (with generated
# secrets), prepares directories. Safe to re-run — never overwrites .env.
#
# Usage:
#   ./scripts/setup.sh          # dev/local: seeds .env from .env.example
#   ./scripts/setup.sh --prod   # prod server: seeds .env from .env.prod.example
set -euo pipefail
source "$(dirname "$0")/common.sh"

mode=base
while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod) mode=prod ;;
    *) die "Unknown option: $1 (use --prod)" ;;
  esac
  shift
done

banner "Hotel Collection — setup${mode:+ (${mode})}"

require_docker
command -v openssl >/dev/null 2>&1 || die "openssl is required to generate secrets."
command -v curl    >/dev/null 2>&1 || warn "curl not found — health checks will be limited."

# ---- port availability (warnings only) --------------------------------------
if command -v ss >/dev/null 2>&1; then
  # 5433/9092 (Postgres/Kafka) are never host-bound under --prod (the overlay
  # sets `ports: []` unconditionally), so checking them there would only warn
  # about a conflict that can't actually happen.
  if [[ "$mode" == "prod" ]]; then
    ports=(3100 3101 3102 8180)
  else
    ports=(3100 3101 3102 8180 5433 9092)
  fi
  for p in "${ports[@]}"; do
    if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${p}\$"; then
      warn "Host port ${p} is already in use — the matching service will fail to bind."
    fi
  done
fi

# ---- environment file --------------------------------------------------------
if [[ ! -f .env ]]; then
  if [[ "$mode" == "prod" ]]; then
    info "Creating .env from .env.prod.example"
    cp .env.prod.example .env
  else
    info "Creating .env from .env.example"
    cp .env.example .env
  fi
  JWT="$(openssl rand -hex 32)"
  PGPW="$(openssl rand -hex 16)"
  sed -i "s|^JWT_SECRET=$|JWT_SECRET=${JWT}|"            .env
  sed -i "s|^POSTGRES_PASSWORD=$|POSTGRES_PASSWORD=${PGPW}|" .env
  chmod 600 .env
  ok ".env created (JWT_SECRET and POSTGRES_PASSWORD generated, file chmod 600)"
else
  load_env
  if [[ -z "${JWT_SECRET:-}" ]]; then
    die ".env exists but JWT_SECRET is empty. Fill it manually: openssl rand -hex 32"
  fi
  if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
    die ".env exists but POSTGRES_PASSWORD is empty. Fill it manually: openssl rand -hex 16"
  fi
  ok ".env already exists — left untouched"
fi

# ---- directories -------------------------------------------------------------
mkdir -p backups/postgres backend-hotel/data/media

# ---- script permissions -------------------------------------------------------
chmod +x scripts/*.sh 2>/dev/null || true

if [[ "$mode" == "prod" ]]; then
  cat <<EOF

${B}Setup complete.${RST}
Still worth checking in .env before you start it:
  - MAIL_*        blank → emails are only logged, never sent (EMAIL_PROVIDER=simulated)
  - GOOGLE_*      left blank on purpose — Google rejects a bare IP as a redirect
                  URI, so sign-in stays email/password-only until there's a domain+TLS
  - the public IP baked into MEDIA_BASE_URL / FRONTEND_BASE_URL / NEXT_PUBLIC_APP_URL /
    CORS_ALLOWED_ORIGINS — confirm it's actually this server's address

Next steps:
  ./scripts/start.sh --prod --build   # build images, boot the hardened stack

Then bootstrap the first login (prod mode never auto-seeds):
  docker compose exec -T postgres psql -U hotel_app -d hotel_platform \\
    -v ON_ERROR_STOP=1 -q < backend-hotel/scripts/seed.sql

That creates admin@hotelcollection.test / admin123 (super_admin) — log in at
:3102 and rotate that password immediately, it's a publicly documented default.
EOF
else
  cat <<EOF

${B}Setup complete.${RST}
Next steps:
  ./scripts/build.sh     # build all application images (first run: several minutes)
  ./scripts/start.sh     # start PostgreSQL + Kafka + backend + both frontends

Documentation: docs/development.md
EOF
fi
