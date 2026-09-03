#!/usr/bin/env bash
# Back up the generated-document volume (invoice/credit-note PDFs) to
# backups/documents/.
# Usage: ./scripts/documents-backup.sh [output-file]
# Existing files are never overwritten (timestamps guarantee unique names).
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
volume_backup "hotel-platform_documents_data" "documents" "${1:-}"
