#!/usr/bin/env bash
set -euo pipefail
umask 077

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <backup.tar.zst.enc> <key_file> [--apply-restore]" >&2
  exit 1
fi

ENC_ARCHIVE="$1"
KEY_FILE="$2"
ACTION_FLAG="${3:-}"
PB_ROOT="${PB_ROOT:-/root/pb}"

if [ ! -f "$ENC_ARCHIVE" ]; then
  echo "Backup archive not found: $ENC_ARCHIVE" >&2
  exit 1
fi

if [ ! -s "$KEY_FILE" ]; then
  echo "Encryption key file not found or empty: $KEY_FILE" >&2
  exit 1
fi

STAGE_DIR="$(mktemp -d /tmp/cys-restore-XXXXXX)"
trap 'rm -rf "$STAGE_DIR"' EXIT

PLAIN_ARCHIVE="$STAGE_DIR/bundle.tar.zst"
EXTRACT_DIR="$STAGE_DIR/extracted"
mkdir -p "$EXTRACT_DIR"

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
  -pass "file:$KEY_FILE" \
  -in "$ENC_ARCHIVE" \
  -out "$PLAIN_ARCHIVE"

tar --zstd -xf "$PLAIN_ARCHIVE" -C "$EXTRACT_DIR"

(
  cd "$EXTRACT_DIR"
  sha256sum -c sha256sums.txt >/dev/null
)

INTEGRITY="$(sqlite3 "$EXTRACT_DIR/pb_data/data.db" "PRAGMA integrity_check;")"
if [ "$INTEGRITY" != "ok" ]; then
  echo "Restored SQLite integrity check failed: $INTEGRITY" >&2
  exit 1
fi

echo "Manifest:"
cat "$EXTRACT_DIR/manifest.json"
echo "SQLite integrity_check: $INTEGRITY"

if [ "$ACTION_FLAG" != "--apply-restore" ]; then
  echo "Verification passed without modifying the host (pass --apply-restore to restore)."
  exit 0
fi

if systemctl is-active --quiet pocketbase 2>/dev/null; then
  echo "Stopping pocketbase service before restore..."
  systemctl stop pocketbase
fi

install -d -m 0755 "$PB_ROOT/pb_data" "$PB_ROOT/pb_hooks" "$PB_ROOT/pb_migrations"

rm -f "$PB_ROOT/pb_data/data.db-wal" "$PB_ROOT/pb_data/data.db-shm"
install -m 0644 "$EXTRACT_DIR/pb_data/data.db" "$PB_ROOT/pb_data/data.db"

if [ -d "$EXTRACT_DIR/pb_data/storage" ]; then
  rm -rf "$PB_ROOT/pb_data/storage"
  cp -a "$EXTRACT_DIR/pb_data/storage" "$PB_ROOT/pb_data/storage"
fi

if [ -d "$EXTRACT_DIR/pb_hooks" ]; then
  rm -rf "$PB_ROOT/pb_hooks"
  cp -a "$EXTRACT_DIR/pb_hooks" "$PB_ROOT/pb_hooks"
fi

if [ -d "$EXTRACT_DIR/pb_migrations" ]; then
  rm -rf "$PB_ROOT/pb_migrations"
  cp -a "$EXTRACT_DIR/pb_migrations" "$PB_ROOT/pb_migrations"
fi

if [ -f "$EXTRACT_DIR/secrets/teacher-link.env" ]; then
  install -m 0600 "$EXTRACT_DIR/secrets/teacher-link.env" "$PB_ROOT/teacher-link.env"
fi

if [ -f "$EXTRACT_DIR/infra/Caddyfile" ]; then
  install -d -m 0755 /etc/caddy
  install -m 0644 "$EXTRACT_DIR/infra/Caddyfile" /etc/caddy/Caddyfile
fi

if [ -f "$EXTRACT_DIR/infra/pocketbase.service" ]; then
  install -m 0644 "$EXTRACT_DIR/infra/pocketbase.service" /etc/systemd/system/pocketbase.service
fi

if [ -f "$EXTRACT_DIR/infra/cys-pdf.service" ]; then
  install -m 0644 "$EXTRACT_DIR/infra/cys-pdf.service" /etc/systemd/system/cys-pdf.service
fi

if [ -f "$EXTRACT_DIR/infra/cys-pdf.env" ]; then
  install -m 0600 "$EXTRACT_DIR/infra/cys-pdf.env" /etc/cys-pdf.env
fi

systemctl daemon-reload
echo "Restore files installed. Verify PocketBase binary, start services, and run publish-pdf-worker.ps1 if rebuilding from scratch."
