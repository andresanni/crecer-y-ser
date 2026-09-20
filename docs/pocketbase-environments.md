# Entornos y promoción de PocketBase

Actualizado: 20 de septiembre de 2026.

## Decisión arquitectónica

Crecer y Ser opera con dos instancias independientes de PocketBase `0.22.17`:

| Entorno | Ubicación | URL | Datos |
| --- | --- | --- | --- |
| Desarrollo | Equipo Windows ARM64, `C:\pocketbase` | `http://127.0.0.1:8090` | Datos descartables y una copia anonimizada de producción |
| Producción | VPS, `/root/pb` | `https://alumnos-api.duckdns.org` | Datos escolares reales |

No existe replicación continua ni sincronización bidireccional. Git transporta esquema, reglas, hooks, frontend y documentación. Los archivos `pb_data` son estado propio de cada entorno y nunca se promueven desde desarrollo a producción.

El repositorio continúa siendo la fuente canónica de:

- `pb_migrations/`: evolución ejecutable del esquema, índices, reglas y transformaciones controladas.
- `pb_hooks/`: gateway HTTP, autorización y transacciones.
- `pb_schema.json`: snapshot legible derivado del esquema resultante.
- `docs/pocketbase-api.md`: contrato HTTP propio.
- `deploy/`: operación local y despliegue del VPS.

## Entorno local vigente

La instalación local permanece fuera del repositorio y de OneDrive:

| Recurso | Ubicación |
| --- | --- |
| Ejecutable | `C:\pocketbase\pocketbase.exe` |
| Datos saneados | `C:\pocketbase\pb_data` |
| Credenciales locales | `C:\pocketbase\dev-credentials.txt` |
| Clave de enlaces docentes | `C:\pocketbase\teacher-link-dev.key` |
| Backups locales | `C:\pocketbase\backups` |

El ejecutable debe informar `pocketbase.exe version 0.22.17`. El servicio escucha exclusivamente en loopback; no debe exponerse a la red local ni a Internet. El panel administrativo está disponible en `http://127.0.0.1:8090/_/`.

El lanzador versionado se ejecuta desde PowerShell:

```powershell
.\deploy\start-pocketbase-dev.ps1
```

El lanzador usa `C:\pocketbase\pb_data`, carga directamente `pb_hooks` y `pb_migrations` desde el checkout actual, mantiene `--automigrate=true` y genera una clave local si todavía no existe. Se niega a iniciar cuando falta `data.db` para evitar aplicar la cadena incremental sobre una base vacía.

El frontend local debe definir en `.env.development.local`:

```dotenv
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

Los archivos `.env*`, salvo el ejemplo explícitamente permitido, están ignorados por Git. La URL no es secreta, pero el archivo local no se versiona para mantener una separación inequívoca por entorno.

`src/core/pocketbase.ts` conserva por ahora la URL productiva como fallback histórico. Hasta retirar esa compatibilidad después de confirmar la configuración del hosting, `.env.development.local` es obligatorio: iniciar Vite sin ese archivo puede conectar el frontend local al VPS.

La copia local inicial se creó desde un snapshot consistente del VPS, se anonimizó y se validó el 20 de septiembre de 2026. Se reemplazaron identidades y contactos, se vaciaron textos sensibles y credenciales Acadeu, se eliminaron usuarios, administradores y enlaces docentes de producción, y se crearon cuentas exclusivamente locales. Los logs, backups internos y copias crudas locales fueron eliminados después de la validación.

## Secretos y datos excluidos

Nunca se incorporan al repositorio:

- `pb_data`, snapshots o backups.
- `.env`, `.env.development.local` u otras variantes locales.
- `dev-credentials.txt` y contraseñas de usuarios o administradores.
- `teacher-link-dev.key`.
- `/root/pb/teacher-link.env` ni su valor `CYS_TEACHER_LINK_KEY`.
- Claves SSH, certificados o credenciales de despliegue.

La clave docente local es distinta de la clave del VPS. La clave de producción no se copia al equipo de desarrollo. Por ello, los registros de `tokens_acceso_docente` siempre se eliminan al preparar una copia local y se generan enlaces nuevos para las pruebas.

## Flujo diario de desarrollo

1. Actualizar el checkout y revisar `git status` antes de trabajar.
2. Iniciar PocketBase con `deploy/start-pocketbase-dev.ps1`.
3. Confirmar `GET http://127.0.0.1:8090/api/health` y que el listener sea `127.0.0.1`.
4. Iniciar Vite con `npm run dev` y comprobar que `VITE_POCKETBASE_URL` apunta a loopback.
5. Usar únicamente cuentas y datos descartables del entorno local.
6. Detener PocketBase con `Ctrl+C` al terminar si no se necesita mantenerlo activo.

No se realizan pruebas destructivas contra `https://alumnos-api.duckdns.org`. Una tarea que necesite producción debe identificarlo explícitamente y limitarse al procedimiento documentado de despliegue o diagnóstico.

## Creación de migraciones

Toda modificación de colecciones, campos, reglas o índices empieza y se valida en desarrollo.

1. Crear un backup local recuperable de `C:\pocketbase\pb_data` con PocketBase detenido o mediante el mecanismo de backup de PocketBase.
2. Confirmar que el servidor local usa `pb_migrations` y `pb_hooks` del checkout actual.
3. Crear el cambio desde el panel administrativo local con `--automigrate=true` o generar una migración explícita:

   ```powershell
   C:\pocketbase\pocketbase.exe migrate create nombre_descriptivo --dir=C:\pocketbase\pb_data --migrationsDir=.\pb_migrations --hooksDir=.\pb_hooks
   ```

4. Revisar el archivo generado. Debe conservar compatibilidad con PocketBase `0.22.17`, incluir una reversión razonable y no contener secretos ni datos de prueba.
5. No editar ni renombrar una migración que ya haya sido aplicada en producción. Toda corrección posterior se expresa mediante una migración nueva.
6. Actualizar hooks, frontend y contrato HTTP en el mismo cambio cuando dependan del nuevo esquema.
7. Actualizar `pb_schema.json` como snapshot derivado del resultado final; no usarlo como mecanismo de despliegue.
8. Ejecutar las pruebas funcionales correspondientes, `npm run lint` y `npm run build`.

Las migraciones de estructura y datos deben ser deterministas. Los catálogos o transformaciones necesarios para una feature pueden viajar en una migración revisada. Los alumnos, responsables, inscripciones, evaluaciones y demás datos operativos no se copian desde desarrollo.

## Ensayo previo a producción

Antes de promover una migración, debe probarse también contra una copia reciente y aislada de `pb_data` de producción. Esta prueba detecta diferencias de datos que una base local evolucionada no representa.

El procedimiento es:

1. Crear un snapshot consistente con PocketBase detenido durante la copia y reinicio automático ante error.
2. Transferirlo por SSH a una ubicación protegida fuera del repositorio.
3. No copiar `/root/pb/teacher-link.env`.
4. Trabajar sobre una copia temporal, nunca sobre el snapshot de recuperación.
5. Eliminar enlaces docentes, usuarios y administradores reales; anonimizar datos personales, credenciales Acadeu y textos libres.
6. Excluir `logs.db` y backups internos al construir la base de desarrollo.
7. Aplicar las migraciones candidatas con los hooks compatibles y ejecutar pruebas de permisos, workflow, transacciones y concurrencia.
8. Eliminar las copias crudas locales cuando la base saneada haya sido validada.

La cadena histórica actual es incremental y no constituye todavía un bootstrap completo desde una base vacía. Hasta que exista una migración base validada, una instalación local nueva debe partir de una copia saneada o de una exportación completa controlada del esquema.

## Promoción a producción

Una release de backend se promueve en una sola dirección:

```text
desarrollo local
    -> migraciones + hooks + snapshot de esquema + frontend
    -> revisión y commit
    -> ensayo sobre copia reciente de producción
    -> backup del VPS
    -> despliegue de PocketBase
    -> verificaciones
    -> publicación del frontend compatible
```

Secuencia operativa:

1. Confirmar que cada migración nueva está versionada y que hooks, frontend, documentación y `pb_schema.json` son compatibles.
2. Revisar `deploy/publish-pocketbase.ps1` y `deploy/apply-pocketbase-workflow.sh`. Actualmente ambos enumeran migraciones de forma explícita; toda migración nueva debe agregarse a los dos hasta que el publicador adopte un manifiesto general.
3. Ensayar el cambio sobre una copia reciente de producción.
4. Crear un backup consistente del VPS antes de instalar artefactos.
5. Desplegar primero el backend cuando el cambio sea compatible con el frontend vigente.
6. Reiniciar PocketBase y comprobar servicio, journal, health check, reglas anónimas, autenticación y rutas propias.
7. Ejecutar las pruebas funcionales y de concurrencia relevantes.
8. Publicar el frontend compatible después de confirmar el backend.
9. Conservar el identificador del backup y la estrategia de rollback en la documentación de la feature.

`--automigrate=true` aplica una migración una sola vez y registra su historial dentro de cada base. Desarrollo puede contener migraciones todavía ausentes en producción; producción nunca debe contener una migración sin su archivo correspondiente en Git.

## Rollback

Un rollback no consiste en copiar `pb_data` local al VPS. La prioridad es desplegar una corrección hacia adelante. `pocketbase migrate down 1` sólo se considera con el servicio detenido, después de confirmar que la migración objetivo es la última aplicada y que su función `down` conserva los datos necesarios.

Si la reversión lógica no es segura, se restaura el backup productivo creado inmediatamente antes de la release. Los hooks y el frontend deben volver a una versión compatible con el esquema restaurado.

## Actualización de la copia local

La base local no recibe datos productivos de forma automática. Sólo se refresca cuando una prueba exige representar mejor el estado real:

```text
producción -> snapshot consistente -> copia temporal -> anonimización -> validación -> reemplazo local
```

El refresco reemplaza por completo el estado local y puede eliminar datos de prueba. Debe acordarse antes de ejecutarlo. La dirección inversa está prohibida: nunca se reemplaza ni mezcla la base del VPS con `C:\pocketbase\pb_data`.
