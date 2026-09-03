#!/usr/bin/env bash
# Runs the database, documents and media backups together. Intended for
# unattended/cron use — a missing service or volume fails that one backup
# without aborting the others (best-effort, since a cron run has no one to
# retry it).
# Usage: ./scripts/backup-all.sh
set -uo pipefail
cd "$(dirname "$0")/.."

status=0
for step in "./scripts/db-backup.sh --gzip" "./scripts/documents-backup.sh" "./scripts/media-backup.sh"; do
  echo "=== $step ==="
  if ! $step; then
    echo "!! $step failed" >&2
    status=1
  fi
done

exit $status
