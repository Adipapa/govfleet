#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/govfleet-$STAMP.sql.gz"
pg_dump "$DATABASE_URL" | gzip -9 > "$FILE"

find "$BACKUP_DIR" -type f -name 'govfleet-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
printf 'Backup created: %s\n' "$FILE"
