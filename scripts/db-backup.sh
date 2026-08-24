#!/usr/bin/env bash
# Back up the PostgreSQL database to backups/postgres/.
# Usage: ./scripts/db-backup.sh [--gzip] [output-file]
# Existing files are never overwritten (timestamps guarantee unique names).
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
require_env_file

gzip_out=0; outfile=""
for arg in "$@"; do
  case "$arg" in
    --gzip) gzip_out=1 ;;
    -*) die "Unknown option: $arg" ;;
    *) outfile="$arg" ;;
  esac
done

service_running hotel-platform-postgres || die "postgres is not running — start it with ./scripts/db-start.sh"

ts="$(date +%Y-%m-%d-%H%M%S)"
ext="sql"; (( gzip_out )) && ext="sql.gz"
outfile="${outfile:-backups/postgres/backup-${ts}.${ext}}"
[[ -e "$outfile" ]] && die "Refusing to overwrite existing file: $outfile"

mkdir -p "$(dirname "$outfile")"
info "Dumping ${POSTGRES_DB:-hotel_platform} → $outfile"

dump_cmd=(pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-hotel_platform}" --no-owner --no-privileges)
if (( gzip_out )); then
  dc exec -T postgres "${dump_cmd[@]}" | gzip > "$outfile"
else
  dc exec -T postgres "${dump_cmd[@]}" > "$outfile"
fi

[[ -s "$outfile" ]] || { rm -f "$outfile"; die "Dump produced an empty file — aborted"; }

size="$(du -h "$outfile" | cut -f1)"
ok "Backup written: $outfile ($size)"

latest="$(ls -1t backups/postgres/ 2>/dev/null | head -5)"
[[ -n "$latest" ]] && { printf '%s\n' "${DIM}Recent backups:${RST}"; printf '   %s\n' $latest; }
