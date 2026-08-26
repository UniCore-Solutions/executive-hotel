#!/usr/bin/env bash
# One-time machine setup: verifies prerequisites, creates .env (with generated
# secrets), prepares directories. Safe to re-run — never overwrites .env.
set -euo pipefail
source "$(dirname "$0")/common.sh"

banner "Hotel Collection — setup"

require_docker
command -v openssl >/dev/null 2>&1 || die "openssl is required to generate secrets."
command -v curl    >/dev/null 2>&1 || warn "curl not found — health checks will be limited."

# ---- port availability (warnings only) --------------------------------------
if command -v ss >/dev/null 2>&1; then
  for p in 3000 3101 8180 5432 9092; do
    if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${p}\$"; then
      warn "Host port ${p} is already in use — the matching service will fail to bind."
    fi
  done
fi

# ---- environment file --------------------------------------------------------
if [[ ! -f .env ]]; then
  info "Creating .env from .env.example"
  cp .env.example .env
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
  ok ".env already exists — left untouched"
fi

# ---- directories -------------------------------------------------------------
mkdir -p backups/postgres backend-hotel/data/media

# ---- script permissions -------------------------------------------------------
chmod +x scripts/*.sh 2>/dev/null || true

cat <<EOF

${B}Setup complete.${RST}
Next steps:
  ./scripts/build.sh     # build all application images (first run: several minutes)
  ./scripts/start.sh     # start PostgreSQL + Kafka + backend + both frontends

Documentation: docs/development.md
EOF
