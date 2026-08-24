#!/usr/bin/env bash
# Restore a PostgreSQL backup created by db-backup.sh.
# Usage: ./scripts/db-restore.sh backups/postgres/backup-2026-08-24-120000.sql [--yes]
#
# DESTRUCTIVE: the current database content is replaced. A safety dump of the
# current state is taken first (best effort) before anything is dropped.
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
require_env_file

file=""; assume_yes=0
for arg in "$@"; do
  case "$arg" in
    --yes) assume_yes=1 ;;
    -*) die "Unknown option: $arg" ;;
    *)
      [[ -z "$file" ]] || die "Provide exactly one backup file"
      file="$arg" ;;
  esac
done
[[ -n "$file" ]] || die "Usage: ./scripts/db-restore.sh <backup-file> [--yes]"
[[ -f "$file" ]] || die "Backup file not found: $file"
service_running hotel-platform-postgres || die "postgres is not running — start it with ./scripts/db-start.sh"

file="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"

cat <<EOF

${RED}${B}  WARNING — DESTRUCTIVE OPERATION ${RST}
  The current database ${B}${POSTGRES_DB:-hotel_platform}${RST} will be DROPPED and
  replaced with: ${B}${file}${RST}

EOF
if (( ! assume_yes )); then
  read -r -p "Type 'RESTORE' to continue: " reply
  [[ "$reply" == "RESTORE" ]] || { info "Aborted — database untouched."; exit 0; }
fi

# Safety dump of the current state (best effort — a broken DB may not be dumpable).
safety="backups/postgres/pre-restore-$(date +%Y-%m-%d-%H%M%S).sql"
mkdir -p backups/postgres
if dc exec -T postgres pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-hotel_platform}" --no-owner --no-privileges > "$safety" 2>/dev/null && [[ -s "$safety" ]]; then
  ok "Safety dump of previous state: $safety"
else
  rm -f "$safety"
  warn "Could not dump the current state (continuing — this is why you are restoring)."
fi

info "Dropping and recreating schema"
pg -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
SQL

info "Restoring from backup"
case "$file" in
  *.gz) gunzip -c "$file" | pg -v ON_ERROR_STOP=1 -q ;;
  *)    pg -v ON_ERROR_STOP=1 -q < "$file" ;;
esac

banner "Restore complete"
printf '   tables      : %s\n' "$(db_scalar "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
printf '   hotels      : %s\n' "$(db_scalar 'SELECT count(*) FROM hotels' || echo '?')"
ok "Done"
