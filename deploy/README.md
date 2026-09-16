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
| Secreto de cifrado | `/root/pb/teacher-link.env` |
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
- `docs/gradebook-workflow-test-plan.md`: matriz funcional, de seguridad y concurrencia posterior al despliegue.
- `docs/concurrency-model.md`: protocolo reusable de revisión, transacción, Realtime y estado local.

`pb_data`, los backups, los certificados y cualquier `.env` son estado operativo o secretos y no deben incorporarse al repositorio.

`/root/pb/teacher-link.env` debe pertenecer a `root:root`, tener permisos `0600` y definir `CYS_TEACHER_LINK_KEY` con exactamente 32 caracteres. La unidad systemd lo carga mediante `EnvironmentFile`; perder esa clave impide recuperar enlaces existentes, aunque sus hashes continúan siendo válidos para autenticación.

## Despliegue

Crear un backup consistente antes de cada despliegue. Luego copiar los artefactos a un directorio temporal del VPS, comparar hashes y ejecutar como `root`:

Desde Windows, el flujo reproducible preferido es:

```powershell
.\deploy\publish-pocketbase.ps1
```

El publicador usa SSH en el puerto `22022`, crea un staging único, detiene PocketBase, respalda la base y los hooks vigentes en `/root/pb/deploy_backups/<fecha>`, instala exactamente las migraciones y los hooks del repositorio, reinicia el servicio y reintenta durante una ventana acotada hasta que el health check y la protección autenticada de las rutas nuevas respondan correctamente. Si el proceso se interrumpe mientras PocketBase está detenido, el script remoto intenta iniciarlo mediante su `trap` de salida.

El procedimiento manual equivalente es:

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

Además deben probarse la llave vigente, una llave reemplazada, una eliminada, una entrega completada y el rechazo de acceso anónimo a las colecciones protegidas. Nunca pegar secretos reales en logs, documentación o tickets.

La protección optimista puede verificarse sin escribir en producción ejecutando `deploy/test-pocketbase-concurrency.sh` como `root` en el VPS. El script copia `pb_data` a un directorio temporal validado, levanta una instancia aislada en `127.0.0.1:18091`, construye un fixture directivo en esa copia, suscribe Realtime y envía dos correcciones vacías con la misma revisión. La aprobación exige un resultado `200 409`, un único incremento de revisión y la recepción del evento realtime. La copia y los procesos temporales se eliminan al salir.

## Recuperación

Si falla el arranque, revisar primero el journal y conservar intacto el backup previo. `pocketbase migrate down 1` sólo debe usarse mientras el servicio está detenido y después de confirmar que la migración que se desea revertir es efectivamente la última aplicada. El rollback no recupera secretos en texto plano: los enlaces continúan autenticándose contra su hash. Restaurar un backup completo sólo cuando la reversión de migración no sea suficiente.
