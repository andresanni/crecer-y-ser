# Operación de PocketBase en el VPS

Esta carpeta conserva la configuración reproducible del proceso y del proxy. Los archivos aquí versionados reflejan la instancia de producción, pero no incluyen certificados, credenciales, bases de datos ni backups.

## Topología

| Componente | Ruta o destino |
| --- | --- |
| Dominio público | `https://alumnos-api.duckdns.org` |
| Caddy | `/etc/caddy/Caddyfile` |
| Unidad systemd | `/etc/systemd/system/pocketbase.service` |
| Ejecutable | `/root/pb/pocketbase` |
| Datos persistentes | `/root/pb/pb_data` |
| Hooks | `/root/pb/pb_hooks` |
| Migraciones | `/root/pb/pb_migrations` |
| Escucha interna | `127.0.0.1:8090` |

La versión confirmada de PocketBase es `0.22.17` y la de Caddy es `2.11.4`. PocketBase no escucha en una interfaz pública; Caddy termina HTTPS y reenvía al loopback.

## Fuente canónica

- `pb_migrations/`: evolución ejecutable y ordenada del esquema y las reglas.
- `pb_hooks/`: gateway HTTP y autorización de enlaces docentes.
- `pb_schema.json`: snapshot legible del esquema resultante.
- `deploy/pocketbase.service`: unidad systemd vigente.
- `deploy/Caddyfile`: proxy vigente.
- `docs/pocketbase-api.md`: contrato HTTP propio.
- `docs/pocketbase-magic-link-hardening.md`: seguridad, pruebas y secuencia de migración.

`pb_data`, los backups, los certificados y cualquier `.env` son estado operativo o secretos y no deben incorporarse al repositorio.

## Despliegue

Crear un backup consistente antes de cada despliegue. Luego copiar los artefactos a un directorio temporal del VPS, comparar hashes y ejecutar como `root`:

```bash
install -d -m 0755 /root/pb/pb_hooks/lib /root/pb/pb_migrations
install -m 0644 staging/pb_hooks/lib/teacherAccess.js /root/pb/pb_hooks/lib/teacherAccess.js
install -m 0644 staging/pb_hooks/teacher_access.pb.js /root/pb/pb_hooks/teacher_access.pb.js
install -m 0644 staging/pb_migrations/*.js /root/pb/pb_migrations/
install -m 0644 staging/deploy/pocketbase.service /etc/systemd/system/pocketbase.service
install -m 0644 staging/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl restart pocketbase
systemctl reload caddy
systemctl --no-pager --full status pocketbase
```

Las migraciones se aplican automáticamente al iniciar por `--automigrate=true`. No reemplazar `pb_data` durante un despliegue.

## Verificación

```bash
curl -fsS https://alumnos-api.duckdns.org/api/health
journalctl -u pocketbase -n 100 --no-pager
systemctl show pocketbase -p ActiveState -p SubState -p ExecMainStatus -p ExecStart -p WorkingDirectory
```

Además deben probarse un enlace vigente, uno revocado, uno expirado y el rechazo de acceso anónimo a las colecciones cerradas. Nunca pegar secretos reales en logs, documentación o tickets.

## Recuperación

Si falla el arranque, revisar primero el journal y conservar intacto el backup previo. La migración de cierre puede revertirse con `pocketbase migrate down 1` mientras el servicio está detenido, pero el rollback no recupera secretos en texto plano: los enlaces continúan autenticándose contra su hash. Restaurar un backup completo sólo cuando la reversión de migración no sea suficiente.
