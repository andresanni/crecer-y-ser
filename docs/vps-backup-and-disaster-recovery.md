# Política canónica de respaldos y crisis del VPS

Actualizado: 28 de noviembre de 2026.

Este documento define la política oficial de copias de seguridad automatizadas, custodia de claves y recuperación ante desastres (DR) para el servidor de producción de **Crecer y Ser** (`https://alumnos-api.duckdns.org`). Es de cumplimiento obligatorio para todos los agentes y operadores que trabajen sobre el repositorio o el VPS.

## Reglas obligatorias para agentes

1. **Cifrado obligatorio fuera del VPS:** nunca subir `data.db`, `pb_data`, `teacher-link.env` ni snapshots sin cifrar a Google Drive ni a ningún otro servicio externo.
2. **Custodia de secretos:** `/etc/cys-backup.key`, `/etc/cys-backup-notify.env` y `/root/.config/rclone/rclone.conf` pertenecen exclusivamente al VPS (`root:root`, permisos `0600`). Nunca incorporarlos a Git, logs ni historiales de chat. La copia de recuperación de `/etc/cys-backup.key` vive únicamente en el gestor de contraseñas externo del titular.
3. **Restauración segura por defecto:** `deploy/vps-restore-dr.sh` opera en modo verificación (`read-only`) por defecto. Nunca ejecutar `--apply-restore` sobre producción sin autorización explícita del usuario y diagnóstico previo.
4. **Respaldo previo a cambios riesgosos:** antes de aplicar migraciones, limpiezas de disco, actualizaciones mayores o cambios de Caddy/systemd en producción, confirmar un backup reciente o disparar `systemctl start cys-backup.service`.
5. **Separación de entornos:** nunca restaurar ni copiar `C:\pocketbase\pb_data` de desarrollo sobre el VPS.
6. **Fuente canónica versionada:** cualquier ajuste a los scripts o timers de respaldo debe versionarse en `deploy/` (`vps-backup.sh`, `vps-backup-notify.py`, `vps-restore-dr.sh`, `cys-backup.service`, `cys-backup.timer`) antes de instalarse en `/usr/local/sbin/` y `/etc/systemd/system/`.

## Arquitectura del respaldo "todo-en-uno"

Cada corrida produce un archivo cifrado `cys-vps-backup-YYYYMMDD-HHMMSS.tar.zst.enc` junto con su archivo de verificación `cys-vps-backup-YYYYMMDD-HHMMSS.tar.zst.enc.sha256`.

### Contenido incluido

| Ruta interna | Contenido | Propósito ante catástrofe |
| --- | --- | --- |
| `pb_data/data.db` | Copia consistente en caliente vía `sqlite3 .backup` verificada con `PRAGMA integrity_check = ok` | Esquema completo, relaciones, índices, reglas, historial `_migrations`, SMTP, usuarios y datos escolares reales |
| `pb_data/storage/` | Archivos adjuntos de PocketBase | Consistencia con registros de `data.db` |
| `pb_hooks/` | Gateways y reglas de autorización vigentes en producción | Reconstrucción exacta sin depender del estado de ramas locales |
| `pb_migrations/` | Historial de migraciones aplicadas en producción | Continuidad de `--automigrate=true` |
| `infra/Caddyfile` | Proxy reverso y rutas HTTPS del backend y worker PDF | Recuperación inmediata de publicación HTTP/TLS |
| `infra/pocketbase.service` | Unidad systemd de PocketBase | Arranque reproducible |
| `infra/cys-pdf.service` | Unidad systemd del worker PDF | Arranque reproducible con límites y sandbox |
| `infra/cys-pdf.env` | Orígenes CORS permitidos del worker PDF | Continuidad de permisos de emisión PDF |
| `secrets/teacher-link.env` | Clave `CYS_TEACHER_LINK_KEY` (`0600`) | Permite seguir recuperando enlaces docentes ya generados |
| `manifest.json` | Timestamp, hostname, versión de PocketBase y algoritmo | Trazabilidad y auditoría |
| `sha256sums.txt` | Hash SHA-256 de todos los archivos del paquete | Validación integral antes de restaurar |

### Contenido excluido a propósito

- `pb_data/logs.db` (logs HTTP descartables; su exclusión reduce el paquete a ~1–3 MB comprimido).
- Binarios reproducibles (`pocketbase 0.22.17`, `/opt/cys-node`, `/opt/cys-pdf`), que se descargan o reconstruyen desde Git con verificación de checksums.
- Certificados TLS de Caddy (se regeneran automáticamente al apuntar DuckDNS).

### Compresión y cifrado

- Compresión: `tar --zstd`.
- Cifrado: `openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -md sha256` utilizando `/etc/cys-backup.key`.

## Periodicidad, destinos y retención

- **Scheduler:** `cys-backup.timer` ejecuta `cys-backup.service` (`/usr/local/sbin/cys-vps-backup.sh`) **todos los días a las 03:30** (zona horaria del VPS `America/Sao_Paulo`, equivalente a UTC-3 Argentina), con `RandomizedDelaySec=300` y `Persistent=true`.
- **Capa 1 — Local en el VPS (`/root/pb/automated_backups/`):**
  - Permisos `0700` para el directorio y `0600` para los archivos.
  - Retención automática: **14 días**.
- **Capa 2 — Off-VPS en Google Drive (`gdrive:Crecer-y-Ser-Backups`):**
  - Transporte: `rclone` configurado con alcance mínimo `scope=drive.file` (el VPS únicamente accede a los archivos y carpetas creados por `rclone`, nunca al resto de la cuenta).
  - Nota de mantenimiento OAuth: `rclone` advierte que su `client_id` compartido de Google Drive se retirará progresivamente; se recomienda configurar un `client_id` propio gratuito en Google Cloud Console (`https://rclone.org/drive/#making-your-own-client-id`) para evitar interrupciones futuras.
  - `daily/`: copia diaria, retención **30 días**.
  - `monthly/`: copia adicional generada automáticamente el día `01` de cada mes, retención **365 días** (12 meses).

- **Notificaciones diarias por email (`[OK]` / `[ERROR]`):**
  - Al finalizar cada corrida (con éxito o ante cualquier fallo capturado por `trap ERR`), `/usr/local/sbin/cys-vps-backup-notify.py` envía un correo vía SMTP StartTLS usando las credenciales de `/etc/cys-backup-notify.env` (`0600`).
  - Incluye fecha, archivo generado, tamaño cifrado, resultado de `PRAGMA integrity_check` y estado de subida a Google Drive (o línea/código de error y comando de diagnóstico si falló).

## Línea base operativa del VPS

- **Swap de seguridad:** `/swapfile` de **2 GB** (`0600`, persistido en `/etc/fstab`) con `vm.swappiness=10` en `/etc/sysctl.d/99-cys-swap.conf`, evitando terminaciones OOM ante picos de memoria del worker `cys-pdf` (Chromium).
- **Acceso SSH:** alias local `crecer-vps` en `~/.ssh/config` (puerto `22022`, clave dedicada `ed25519`).

## Operación habitual y verificaciones

Comandos de diagnóstico y operación en el VPS (como `root`):

```bash
systemctl list-timers cys-backup.timer --no-pager
journalctl -u cys-backup.service -n 30 --no-pager
ls -lh /root/pb/automated_backups/
rclone ls gdrive:Crecer-y-Ser-Backups/daily
rclone ls gdrive:Crecer-y-Ser-Backups/monthly
```

Disparar una copia manual inmediata (local + Google Drive):

```bash
systemctl start cys-backup.service
```

Simulacro de verificación (descifra en `/tmp`, valida todos los SHA-256 y `PRAGMA integrity_check` sin tocar producción):

```bash
/usr/local/sbin/cys-vps-restore-dr.sh /root/pb/automated_backups/<archivo>.tar.zst.enc /etc/cys-backup.key
```

Recomendación operativa: ejecutar un simulacro de verificación al menos una vez por trimestre descargando un archivo real desde Google Drive.

## Protocolo de crisis y recuperación ante desastres (DR)

### Escenario A — Corrupción lógica o reversión en el VPS actual

1. Confirmar con el usuario el punto de recuperación deseado (`daily/` o `monthly/`).
2. Resguardar el estado actual de `/root/pb/pb_data/data.db` en un directorio temporal de evidencia antes de sobrescribir.
3. Si el archivo elegido solo está en Google Drive, descargarlo junto con su `.sha256` y verificar integridad:

```bash
rclone copy "gdrive:Crecer-y-Ser-Backups/daily/<archivo>.tar.zst.enc" /tmp/
rclone copy "gdrive:Crecer-y-Ser-Backups/daily/<archivo>.tar.zst.enc.sha256" /tmp/
(cd /tmp && sha256sum -c "<archivo>.tar.zst.enc.sha256")
```

4. Ejecutar primero la verificación en modo seguro:

```bash
/usr/local/sbin/cys-vps-restore-dr.sh /tmp/<archivo>.tar.zst.enc /etc/cys-backup.key
```

5. Con aprobación explícita, aplicar la restauración y levantar servicios:

```bash
/usr/local/sbin/cys-vps-restore-dr.sh /tmp/<archivo>.tar.zst.enc /etc/cys-backup.key --apply-restore
systemctl start pocketbase
systemctl reload caddy
curl -fsS https://alumnos-api.duckdns.org/api/health
```

### Escenario B — Pérdida total del VPS (reconstrucción desde cero)

1. **Aprovisionar servidor nuevo:** Ubuntu 22.04/24.04 x86_64. Configurar SSH en puerto `22022` con clave pública, activar `fail2ban` e instalar herramientas base:

```bash
apt-get update && apt-get install -y caddy sqlite3 zstd openssl curl unzip
curl -fsS https://rclone.org/install.sh | bash
```

2. **Instalar binario oficial de PocketBase `0.22.17`:** descargar `pocketbase_0.22.17_linux_amd64.zip`, validar su SHA-256 contra `deploy/pocketbase-version.json` y ubicar el ejecutable en `/root/pb/pocketbase` (`chmod 0755`).
3. **Recuperar clave maestra y backup:**
   - Crear `/etc/cys-backup.key` (`chmod 0600`) con la clave resguardada en el gestor de contraseñas.
   - Descargar el último `cys-vps-backup-*.tar.zst.enc` y su `.sha256` desde Google Drive (`Crecer-y-Ser-Backups/daily/`) y validar `sha256sum -c`.
4. **Restaurar datos, hooks, migraciones e infraestructura:** copiar `deploy/vps-restore-dr.sh` del repositorio y ejecutar:

```bash
bash vps-restore-dr.sh <archivo>.tar.zst.enc /etc/cys-backup.key --apply-restore
systemctl enable --now pocketbase caddy
```

5. **Reconstruir worker PDF:** desde el equipo de desarrollo Windows, ejecutar `./deploy/publish-pdf-worker.ps1` (pasando `-RemoteHost <nueva_ip>` si cambió la IP).
6. **Actualizar DNS:** apuntar `alumnos-api.duckdns.org` en DuckDNS a la nueva IP para que Caddy emita el certificado TLS automáticamente.
7. **Validar producción:**
   - Ejecutar `npm run check:vps`.
   - Confirmar acceso administrativo/directivo, rechazo `401` anónimo, formulario de contacto SMTP y emisión de un PDF.
8. **Restablecer backups automáticos:** instalar `deploy/vps-backup.sh`, `deploy/vps-restore-dr.sh`, `deploy/cys-backup.service` y `deploy/cys-backup.timer`, vincular `rclone` (`rclone config create gdrive drive scope=drive.file`), habilitar `cys-backup.timer` y validar una corrida completa.
