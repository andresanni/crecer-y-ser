#!/usr/bin/env bash
set -euo pipefail
umask 077

PB_ROOT="${PB_ROOT:-/root/pb}"
BACKUP_DIR="${BACKUP_DIR:-/root/pb/automated_backups}"
KEY_FILE="${KEY_FILE:-/etc/cys-backup.key}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:Crecer-y-Ser-Backups}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-14}"
REMOTE_DAILY_RETENTION_DAYS="${REMOTE_DAILY_RETENTION_DAYS:-30}"
REMOTE_MONTHLY_RETENTION_DAYS="${REMOTE_MONTHLY_RETENTION_DAYS:-365}"
SKIP_REMOTE="${SKIP_REMOTE:-0}"
NOTIFY_SCRIPT="${NOTIFY_SCRIPT:-/usr/local/sbin/cys-vps-backup-notify.py}"
STAGE_DIR=""

send_notification() {
  local status="$1"
  local body="$2"
  if [ -x "$NOTIFY_SCRIPT" ]; then
    "$NOTIFY_SCRIPT" "$status" "$body" || true
  fi
}

cleanup_stage() {
  if [ -n "$STAGE_DIR" ] && [ -d "$STAGE_DIR" ]; then
    rm -rf "$STAGE_DIR"
  fi
}

on_error() {
  local exit_code="$?"
  local line_no="$1"
  send_notification "ERROR" "Fallo el backup automatico del VPS Crecer y Ser.
Fecha: $(date -Is)
Host: $(hostname -f 2>/dev/null || hostname)
Linea: ${line_no}
Codigo de salida: ${exit_code}
Revisar logs: journalctl -u cys-backup.service -n 50 --no-pager"
  exit "$exit_code"
}

trap cleanup_stage EXIT
trap 'on_error $LINENO' ERR

if [ ! -s "$KEY_FILE" ]; then
  echo "Missing or empty encryption key file: $KEY_FILE" >&2
  exit 1
fi

if [ ! -f "$PB_ROOT/pb_data/data.db" ]; then
  echo "Missing PocketBase database: $PB_ROOT/pb_data/data.db" >&2
  exit 1
fi

install -d -m 0700 "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DAY_OF_MONTH="$(date +%d)"
BASENAME="cys-vps-backup-${TIMESTAMP}.tar.zst.enc"
STAGE_DIR="$(mktemp -d /tmp/cys-backup-XXXXXX)"
PAYLOAD_DIR="$STAGE_DIR/payload"

mkdir -p "$PAYLOAD_DIR/pb_data" "$PAYLOAD_DIR/infra" "$PAYLOAD_DIR/secrets"

sqlite3 "$PB_ROOT/pb_data/data.db" ".timeout 30000" ".backup '$PAYLOAD_DIR/pb_data/data.db'"

INTEGRITY="$(sqlite3 "$PAYLOAD_DIR/pb_data/data.db" "PRAGMA integrity_check;")"
if [ "$INTEGRITY" != "ok" ]; then
  echo "SQLite integrity check failed: $INTEGRITY" >&2
  exit 1
fi

if [ -d "$PB_ROOT/pb_data/storage" ]; then
  cp -a "$PB_ROOT/pb_data/storage" "$PAYLOAD_DIR/pb_data/storage"
fi

if [ -d "$PB_ROOT/pb_hooks" ]; then
  cp -a "$PB_ROOT/pb_hooks" "$PAYLOAD_DIR/pb_hooks"
fi

if [ -d "$PB_ROOT/pb_migrations" ]; then
  cp -a "$PB_ROOT/pb_migrations" "$PAYLOAD_DIR/pb_migrations"
fi

for infra_file in \
  /etc/caddy/Caddyfile \
  /etc/systemd/system/pocketbase.service \
  /etc/systemd/system/cys-pdf.service \
  /etc/cys-pdf.env; do
  if [ -f "$infra_file" ]; then
    cp -a "$infra_file" "$PAYLOAD_DIR/infra/$(basename "$infra_file")"
  fi
done

if [ -f "$PB_ROOT/teacher-link.env" ]; then
  cp -a "$PB_ROOT/teacher-link.env" "$PAYLOAD_DIR/secrets/teacher-link.env"
fi

PB_VERSION="$("$PB_ROOT/pocketbase" --version 2>/dev/null || echo unknown)"
cat > "$PAYLOAD_DIR/manifest.json" <<EOF
{
  "created_at_iso": "$(date -Is)",
  "created_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname -f 2>/dev/null || hostname)",
  "pocketbase_version": "$PB_VERSION",
  "format": "tar.zst.enc",
  "cipher": "aes-256-cbc-pbkdf2-sha256-200000"
}
EOF

(
  cd "$PAYLOAD_DIR"
  find . -type f ! -name 'sha256sums.txt' | sort | xargs sha256sum > sha256sums.txt
)

PLAIN_ARCHIVE="$STAGE_DIR/bundle.tar.zst"
ENC_ARCHIVE="$STAGE_DIR/$BASENAME"
SHA_FILE="$STAGE_DIR/${BASENAME}.sha256"

tar --zstd -cf "$PLAIN_ARCHIVE" -C "$PAYLOAD_DIR" .
openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -md sha256 \
  -pass "file:$KEY_FILE" \
  -in "$PLAIN_ARCHIVE" \
  -out "$ENC_ARCHIVE"

(
  cd "$STAGE_DIR"
  sha256sum "$BASENAME" > "$SHA_FILE"
)

install -m 0600 "$ENC_ARCHIVE" "$BACKUP_DIR/$BASENAME"
install -m 0600 "$SHA_FILE" "$BACKUP_DIR/${BASENAME}.sha256"

find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'cys-vps-backup-*.tar.zst.enc' -o -name 'cys-vps-backup-*.tar.zst.enc.sha256' \) \
  -mtime +"$LOCAL_RETENTION_DAYS" -delete

if [ "$SKIP_REMOTE" != "1" ]; then
  rclone mkdir "$RCLONE_REMOTE/daily"
  rclone mkdir "$RCLONE_REMOTE/monthly"
  rclone copy "$BACKUP_DIR/$BASENAME" "$RCLONE_REMOTE/daily"
  rclone copy "$BACKUP_DIR/${BASENAME}.sha256" "$RCLONE_REMOTE/daily"
  if [ "$DAY_OF_MONTH" = "01" ]; then
    rclone copy "$BACKUP_DIR/$BASENAME" "$RCLONE_REMOTE/monthly"
    rclone copy "$BACKUP_DIR/${BASENAME}.sha256" "$RCLONE_REMOTE/monthly"
  fi
  rclone delete --min-age "${REMOTE_DAILY_RETENTION_DAYS}d" "$RCLONE_REMOTE/daily"
  rclone delete --min-age "${REMOTE_MONTHLY_RETENTION_DAYS}d" "$RCLONE_REMOTE/monthly"
fi

ARCHIVE_SIZE="$(du -h "$BACKUP_DIR/$BASENAME" | awk '{print $1}')"
REMOTE_STATUS="omitido (SKIP_REMOTE=1)"
if [ "$SKIP_REMOTE" != "1" ]; then
  REMOTE_STATUS="subido a ${RCLONE_REMOTE}/daily"
  if [ "$DAY_OF_MONTH" = "01" ]; then
    REMOTE_STATUS="${REMOTE_STATUS} y monthly"
  fi
fi

send_notification "OK" "Backup diario del VPS Crecer y Ser completado correctamente.
Fecha: $(date -Is)
Host: $(hostname -f 2>/dev/null || hostname)
Archivo: ${BASENAME}
Tamano cifrado: ${ARCHIVE_SIZE}
SQLite integrity_check: ok
Google Drive: ${REMOTE_STATUS}"

echo "Backup completed: $BACKUP_DIR/$BASENAME ($ARCHIVE_SIZE)"
