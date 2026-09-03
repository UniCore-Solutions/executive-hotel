#!/usr/bin/env bash
# Back up the uploaded-media volume (hotel/room-type images) to
# backups/media/.
# Usage: ./scripts/media-backup.sh [output-file]
# Existing files are never overwritten (timestamps guarantee unique names).
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_docker
volume_backup "hotel-platform_media_data" "media" "${1:-}"
