# Entornos y promoción de PocketBase

Actualizado: 9 de octubre de 2026.

## Decisión arquitectónica

Crecer y Ser opera con dos instancias independientes de PocketBase `0.22.17`:

| Entorno | Ubicación | URL | Datos |
| --- | --- | --- | --- |
| Desarrollo | Equipo Windows ARM64, `C:\pocketbase` | `http://127.0.0.1:8090` | Datos descartables y una copia anonimizada de producción |
| Producción | VPS, `/root/pb` | `https://alumnos-api.duckdns.org` | Datos escolares reales y boletines históricos; no descartables |

No existe replicación continua ni sincronización bidireccional. Git transporta esquema, reglas, hooks, frontend y documentación. Los archivos `pb_data` son estado propio de cada entorno y nunca se promueven desde desarrollo a producción. Desde la ingesta histórica de septiembre/octubre de 2026, producción contiene datos reales de alumnos, responsables, notas, visados y emisiones. La auditoría de sólo lectura del 3 de octubre confirmó ese estado. No tratar producción como un entorno descartable.

La evolución de visado y configuración anual agrega `visados_boletin` y `curso_materias.ciclo_id`. La migración asigna las materias anteriores al ciclo marcado como actual, o al más reciente si no hay uno marcado, y crea visados pendientes para las entregas existentes. No presupone aprobación de boletines históricos. Las dos migraciones se ensayaron sobre una copia aislada del VPS y se desplegaron allí el 26 de septiembre de 2026 junto con los hooks, sin reemplazar `pb_data`. El respaldo previo es `/root/pb/deploy_backups/20260926-094932`.

El frontend compatible se promovió desde `dev` a `master` mediante el pull request #6 el 27 de septiembre de 2026. El backend ya coincidía con los hooks y las migraciones versionados, por lo que esta publicación no requirió otro despliegue de PocketBase. Vercel sirve el bundle con el gateway curricular y las etapas de revisión; la configuración curricular publicada atraviesa el gateway institucional.

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

`src/core/pocketbase.ts` no tiene una URL alternativa. Si la variable falta o no contiene un origen HTTP válido, la aplicación se detiene antes de crear el cliente. Por lo tanto, iniciar Vite sin `.env.development.local` nunca conecta accidentalmente el frontend local al VPS.

El frontend productivo se publica en Vercel y recibe `VITE_POCKETBASE_URL=https://alumnos-api.duckdns.org` exclusivamente desde la configuración del entorno Production. La separación completa, la política de previews y el procedimiento de publicación están en `docs/vercel-deployment.md`.

La copia local inicial se creó desde un snapshot consistente del VPS, se anonimizó y se validó el 20 de septiembre de 2026. Se reemplazaron identidades y contactos, se vaciaron textos sensibles y credenciales Acadeu, se eliminaron usuarios, administradores y enlaces docentes de producción, y se crearon cuentas exclusivamente locales. Los logs, backups internos y copias crudas locales fueron eliminados después de la validación.

## Reconstrucción desde cero

Una instalación nueva ya no necesita copiar datos del VPS. El repositorio contiene una baseline condicional, las migraciones incrementales, un seed sintético y el instalador:

```powershell
.\deploy\setup-pocketbase-dev.ps1 -DownloadPocketBase
.\deploy\start-pocketbase-dev.ps1
```

`setup-pocketbase-dev.ps1` realiza estas operaciones:

1. Detecta Windows ARM64 o AMD64.
2. Descarga PocketBase desde el release oficial cuando se usa `-DownloadPocketBase`.
3. Verifica el SHA-256 definido en `deploy/pocketbase-version.json` y la versión ejecutable `0.22.17`.
4. Construye la base en un directorio temporal y no reemplaza un `pb_data` existente.
5. Aplica `pb_migrations` desde la baseline hasta el esquema vigente.
6. Genera administrador, usuario institucional y clave docente exclusivamente locales.
7. Aplica `deploy/pocketbase-dev-seed` con datos completamente sintéticos.
8. Protege credenciales y clave mediante ACL del usuario actual.
9. Crea `.env.development.local` cuando no existe.

El seed contiene seis alumnos y seis responsables ficticios, dos cursos, dos períodos, cinco materias, escalas y criterios suficientes para probar los flujos principales. No crea enlaces docentes ni registros académicos reales.

La baseline `1789330000_created_initial_collections.js` representa el esquema inmediatamente anterior a la primera migración incremental. En una base vacía importa las colecciones iniciales y permite aplicar toda la historia posterior. En una base existente detecta `alumnos`, no modifica el esquema ni los datos y sólo queda registrada como aplicada. El 20 de septiembre de 2026 se validaron ambos recorridos: reconstrucción vacía y aplicación no destructiva sobre la copia local existente.

## Secretos y datos excluidos

Nunca se incorporan al repositorio:

- `pb_data`, snapshots o backups.
- `.env`, `.env.development.local` u otras variantes locales.
- `dev-credentials.txt` y contraseñas de usuarios o administradores.
- `teacher-link-dev.key`.
- `/root/pb/teacher-link.env` ni su valor `CYS_TEACHER_LINK_KEY`.
- Claves SSH, certificados o credenciales de despliegue.

La clave docente local es distinta de la clave del VPS. La clave de producción no se copia al equipo de desarrollo. Por ello, los registros de `tokens_acceso_docente` siempre se eliminan al preparar una copia local y se generan enlaces nuevos para las pruebas.

## Backup cifrado del entorno local

El entorno puede reconstruirse desde Git, pero también existe un backup de contingencia para conservar trabajo de prueba. PocketBase debe estar detenido:

```powershell
.\deploy\backup-pocketbase-dev.ps1
```

Por defecto el archivo `.cysbackup` se guarda en `OneDrive\Backups\Crecer-y-Ser`, fuera del proyecto. El script es compatible con Windows PowerShell 5.1 y PowerShell 7, solicita una frase de recuperación de al menos 16 caracteres y cifra mediante AES-256-CBC con autenticación HMAC-SHA256 y claves derivadas por PBKDF2-SHA256. La frase no se almacena; debe guardarse en un gestor de contraseñas independiente.

El contenedor cifrado incluye la base saneada, `storage`, las credenciales locales y `teacher-link-dev.key` para permitir una restauración funcional. No incluye logs, backups internos ni secretos de producción.

Para restaurar en otro equipo:

```powershell
.\deploy\setup-pocketbase-dev.ps1 -DownloadPocketBase -DownloadOnly
.\deploy\restore-pocketbase-dev.ps1 -BackupPath "D:\ruta\backup.cysbackup"
.\deploy\start-pocketbase-dev.ps1
```

La restauración exige un destino sin `pb_data`, autentica el contenido antes de escribir y restaura ACL restringidas. Una contraseña incorrecta o cualquier alteración del archivo cancela el proceso sin instalar datos.

El primer backup real cifrado se creó en OneDrive y su SHA-256 se verificó el 20 de septiembre de 2026. La frase de recuperación queda bajo custodia personal fuera del repositorio.

## Flujo diario de desarrollo

1. Actualizar el checkout y revisar `git status` antes de trabajar.
2. Ejecutar `npm run dev`. Este comando único realiza automáticamente:
   - Configuración de worktree: si faltan `node_modules` o archivos de entorno (`.env.development.local`, `.env`), crea el junction y copia las variables desde el repositorio principal o las sintetiza para loopback con las claves locales de `C:\pocketbase`.
   - Inicialización de PocketBase: comprueba si la base ya está activa en `http://127.0.0.1:8090`. Si no lo está, inicia `pocketbase.exe` con `pb_hooks` y `pb_migrations` del checkout actual y aguarda el health check.
   - Presentación de credenciales: muestra en consola las credenciales mock de `C:\pocketbase\dev-credentials.txt` (panel admin y usuario institucional de desarrollo).
   - Servidor frontend: inicia Vite en modo desarrollo. Al salir con `Ctrl+C`, detiene limpiamente el proceso de PocketBase si fue iniciado por dicha sesión.
3. De forma alternativa para pruebas sin frontend o diagnósticos independientes, PocketBase puede iniciarse de manera aislada con `deploy/start-pocketbase-dev.ps1`.
4. Usar únicamente cuentas y datos descartables del entorno local.

La verificación reproducible del backend local se ejecuta con:

```powershell
.\deploy\verify-pocketbase-dev.ps1
```

Después de una reconstrucción limpia se agrega `-ExpectSyntheticSeed` para comprobar también todas las cantidades del fixture.

No se realizan pruebas destructivas contra `https://alumnos-api.duckdns.org`. Una tarea que necesite producción debe identificarlo explícitamente y limitarse al procedimiento documentado de despliegue o diagnóstico.

## Monitoreo y diagnóstico de conectividad

Para asegurar el descarte rápido de fallas de infraestructura tanto en desarrollo como en producción, el sistema cuenta con dos mecanismos:

1. **Diagnóstico desde CLI / DevOps:**
   Permite comprobar en 1 segundo la resolución DNS de DuckDNS, el enlace HTTPS, el estado de `GET /api/health` de PocketBase y la disponibilidad del worker PDF de Caddy, sin depender del estado del navegador:

   ```powershell
   .\deploy\check-vps-status.ps1
   # o alternativamente:
   npm run check:vps
   ```

   Para auditar el entorno local se pasa `-Target Local` o `node scripts/check-vps-status.mjs local`.

2. **Indicador no invasivo en la interfaz (`MainLayout`):**
   - **Operación normal:** silenciosa y sin impacto para usuarios no técnicos. El menú del usuario incorpora un ítem discreto con el estado operativo y la latencia en milisegundos (`Servidor: Operativo (XX ms)`), permitiendo abrir un modal de diagnóstico técnico a demanda.
   - **Frecuencia:** chequeo en segundo plano cada 90 segundos o al reactivarse la pestaña (`visibilitychange`).
   - **Contingencia:** ante pérdida de conectividad o falla del backend, se presenta un banner sobrio de reintento (`Alert`) en la cabecera del contenido para evitar que los usuarios intenten operaciones sin enlace activo.

## Servicio de Correo (SMTP) y Formulario de Contacto

El formulario público de contacto de la landing despacha consultas hacia `secretariacreceryser@gmail.com` a través del endpoint privilegiado `POST /api/cys/contacto` (manejado por `pb_hooks/contacto.pb.js` y `pb_hooks/lib/contactService.js`). Este mecanismo utiliza `$app.newMailClient().send(...)` de PocketBase.

### Configuración en Desarrollo (Local)

Habilitada el 22 de septiembre de 2026:

1. **Panel:** `http://127.0.0.1:8090/_/` -> **Settings** -> **Mail settings**.
2. **Use SMTP mail server:** Activado.
3. **Host:** `smtp.gmail.com` | **Port:** `587` (StartTLS).
4. **Auth method:** PLAIN (default).
5. **Username:** `secretariacreceryser@gmail.com`.
6. **Password:** Contraseña de aplicación de Google de 16 caracteres (generada en la cuenta de Google con 2FA).
7. **Sender address:** `secretariacreceryser@gmail.com` | **Sender name:** `Colegio Crecer y Ser`.
8. **Prueba:** Verificada exitosamente con entrega de correo de prueba.

La configuración SMTP se guarda dentro de `pb_data` y no forma parte de Git. Una reconstrucción local desde cero requiere repetir esta configuración; una restauración del backup local cifrado conserva el estado incluido en la base respaldada.

### Replicación en Producción (VPS)

Configurada y verificada el 23 de septiembre de 2026:

1. **Panel:** `https://alumnos-api.duckdns.org/_/` -> **Settings** -> **Mail settings**.
2. **Use SMTP mail server:** Activado con credenciales de aplicación de Gmail para `secretariacreceryser@gmail.com` (StartTLS puerto 587).
3. **Prueba:** Confirmada la conectividad y recepción de prueba desde el VPS.
4. **Despliegue de hooks:** `deploy/publish-pocketbase.ps1` y `deploy/apply-pocketbase-workflow.sh` transfieren e instalan `contacto.pb.js` y `lib/contactService.js` en `/root/pb/pb_hooks/`, verificando que `POST /api/cys/contacto` responda adecuadamente tras el reinicio del servicio `pocketbase`.
5. La configuración SMTP queda persistida en `/root/pb/pb_data` sin requerir variables de entorno adicionales.

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

La cadena histórica dispone de una baseline completa y fue validada desde una base vacía. Las migraciones nuevas deben seguir siendo incrementales; no modificar la baseline ni las migraciones que ya hayan alcanzado producción.

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

## Diferencia local pendiente de promoción: elegibilidad PDF

El 28 de septiembre de 2026 se aplicó exclusivamente en desarrollo `1790553600_versioned_approval_authorization.js` y el hook de elegibilidad acumulativa. Se ensayó previamente en una copia aislada. Respaldo de base previo: `C:/pocketbase/backups/pdf-eligibility-20260928/data.db`. El esquema versionado refleja desarrollo; el VPS todavía no tiene este campo ni la elegibilidad en su respuesta. Los scripts de despliegue incluyen la migración para una futura promoción coordinada, no ejecutada.

## Diferencia local pendiente de promoción: almacenamiento PDF

Migración `1790625600_document_emissions.js` ensayada en copia aislada y aplicada a 8090. Respaldo previo con servicio detenido: `C:/pocketbase/backups/pdf-emissions-20260928/data.db`. Se conservan archivos en storage de PocketBase y metadatos en `emisiones_boletin`; el esquema nuevo se exportó desde la API local. La clave de worker vive fuera de Git y del código del navegador. `start-pocketbase-dev.ps1` carga `pdf-worker-dev.key` cuando existe. La promoción exige un worker desplegable y secreto propio del VPS; no basta con subir los hooks. No se ejecutó despliegue.


## Publicacion productiva de boletines PDF — 29 de septiembre de 2026

PocketBase productivo recibio las migraciones `1790553600_versioned_approval_authorization.js`, `1790625600_document_emissions.js` y `1790630000_second_cycle_grading_catalog.js`, junto con los hooks documentales. Respaldo consistente anterior: `/root/pb/deploy_backups/20260928-223816`. El publicador ahora conserva tambien todo `pb_migrations` y storage para recuperacion. Se ensayaron las migraciones sobre una copia remota aislada y saneada; no se trasladaron alumnos, notas ni bases de desarrollo al VPS. La migracion de catalogo crea los diez valores de segundo ciclo ausentes sin duplicar los existentes y vincula los cursos 4 a 7; no convierte calificaciones ya cargadas. Tambien se aplico en desarrollo, con respaldo `C:/pocketbase/backups/second-cycle-catalog-20260929/data.db`. No cambia el esquema de colecciones.

El motor ya no depende de un servidor Vite productivo. `scripts/build-pdf-worker.mjs` genera `dist-render` con la plantilla y assets estaticos. `scripts/pdf-worker.ts` sirve esos archivos exclusivamente por loopback y reutiliza `createPdfMiddleware`, compartido con desarrollo. `cys-pdf.service` ejecuta Node como usuario sin privilegios `cys-pdf` en 127.0.0.1:8093; Chromium conserva su sandbox. Node 24.21.0 fue instalado desde nodejs.org con comprobacion SHA-256 y Chromium desde Playwright. El servicio limita memoria a 900 MB y mantiene un solo trabajo activo; no incorpora una cola durable.

Caddy publica unicamente POST/OPTIONS `/api/cys/pdf/generar` y `/api/cys/pdf/lote` hacia el worker, conservando PocketBase para las demas rutas. El middleware restringe origen a `https://www.creceryser.edu.ar`, `https://creceryser.edu.ar` y `https://crecer-y-ser-ten.vercel.app`, valida la sesion con los gateways de PocketBase, no confia en HTML del cliente y no pasa credenciales al navegador de impresion. La clave privada vive solo en `/etc/cys-pdf.env`, permisos 0600, y la cargan ambos servicios; es independiente de la clave local. Los archivos de impresion internos y health del worker no se exponen por Caddy. El frontend productivo deriva la URL del servicio desde `VITE_POCKETBASE_URL`; desarrollo conserva los endpoints Vite locales.

Operacion reproducible: `deploy/publish-pocketbase.ps1` actualiza esquema/hooks, y `deploy/publish-pdf-worker.ps1` construye, empaqueta, instala una release, ejecuta impresion y ZIP sinteticos bajo el usuario del servicio y valida/re carga Caddy. Las releases viven en `/opt/cys-pdf/releases`, con symlink `/opt/cys-pdf/current`; el staging conserva el destino anterior y la configuracion anterior de Caddy. Para rollback del worker, restaurar ese symlink, reiniciar `cys-pdf` y restaurar el proxy si cambio; para PocketBase, usar el respaldo compatible y no revertir el catalogo borrando notas referenciadas. No publicar solo el frontend si el servicio PDF no supera sus pruebas.

Verificaciones: health PocketBase local/productivo, migraciones registradas, permisos de endpoints sin sesion, preflight CORS 204, generacion con Chromium/Linux de 13 y 14 paginas, y prueba del middleware productivo con backend sintetico que obtiene un PDF de 14 paginas y comprueba bytes identicos dentro del ZIP. Las pruebas de persistencia/invalidation contra PocketBase habian sido verificadas en una copia aislada local. No se generaron notas ni visados ficticios en produccion. Queda la aceptacion con una sesion institucional y los datos operativos del colegio, ademas de las fuentes de cierre anual pendientes. Lint, build y las 15 pruebas automatizadas pasan; sigue el warning conocido de bundle.

## Evolución de campos de alumno y responsable — 29 de septiembre de 2026

Migración `1790640000_update_student_and_guardian_fields.js`:
- Incorpora `localidad` a la colección `alumnos` y retira `telefono` (centralizado exclusivamente en los datos de contacto familiar del responsable).
- Bifurca el documento de `responsables` en `dni_tipo` (con default `'DNI'`) y `dni_numero`, preservando la búsqueda unívoca por número de documento y evitando colisiones.
- Mantiene la columna `vinculo` en la relación M:N de `alumno_responable`, simplificando la carga con valor predeterminado `'Padre'`.
- Los artefactos de despliegue `deploy/publish-pocketbase.ps1` y `deploy/apply-pocketbase-workflow.sh` incluyen la migración para su promoción determinista al VPS.


## Autorización del generador PDF local

PocketBase carga `CYS_PDF_WORKER_KEY` desde `C:/pocketbase/pdf-worker-dev.key` mediante `deploy/start-pocketbase-dev.ps1`. Vite carga la misma clave privada desde `.env.development.local`, sin prefijo `VITE_`. Si se agrega o cambia esa configuración, reiniciar ambos procesos: editar el archivo no modifica el entorno de PocketBase ya iniciado. Un 403 «Generador no autorizado» en la publicación corresponde a esta autorización privada y no acredita un problema de visados. Comparar las claves sin imprimirlas ni guardarlas en logs. No deshabilitar el control para recuperar la descarga.


## Promoción del pulido PDF — 1 de octubre de 2026

Sin nuevas migraciones. Respaldo consistente /root/pb/deploy_backups/20261001-091649 y worker /opt/cys-pdf/releases/20261001-091744. Ensayo de hooks en copia aislada saneada del VPS y comparación posterior de 13 tablas de dominio/autorización, esquema e historial de migraciones sin diferencias. Se preservaron datos productivos. La publicación del frontend se realiza mediante PR #11 de dev a master. El detalle de validaciones y rollback está en gradebook-pdf-emission.md.


## Migración de cursada evaluable pendiente — 1 de octubre de 2026

1790850000_enrollment_evaluable_scope.js fue probada en una base sintética y en snapshot consistente de 8090. Conserva todos los datos existentes y marca las 84 matrículas del snapshot como PENDIENTE. La copia se obtuvo con backup de SQLite en modo lectura, con el servidor local encendido; archivos fuera del repositorio en C:/pocketbase/evaluable-scope-migration-trial. before.db conserva el esquema anterior y data.db el resultado del ensayo. No se modificó 8090 ni el VPS: el intento de parada/respaldo/migración local fue rechazado por revisión automática. Aplicar mediante el procedimiento de respaldo y migración de este documento antes de usar el frontend nuevo. El esquema versionado proviene de una instancia sintética migrada; no implica que 8090 ya esté actualizado. No promover el frontend sin el gateway y las reglas nuevos.


El 2 de octubre el usuario confirmó que la base habitual fue purgada intencionalmente tras una prueba de ingesta que apuntó por error a loopback, conservando estructura y catálogos. PocketBase se detuvo por reinicio de sesión. En ese momento indicó dejarla intacta y realizar las pruebas de cursada en instancias temporales. La autorización del 9 de octubre descrita abajo reemplaza esa indicación para la preparación del dataset de asistencia; no restaurar el snapshot de 84 matrículas automáticamente.

## Salvaguardas y alcance evaluable publicados — 3 de octubre de 2026

La migración 1790850000, los hooks compatibles y el worker documental se publicaron después del ensayo aislado de producción. Respaldo previo: `/root/pb/deploy_backups/20261003-093440`; worker vigente: `/opt/cys-pdf/releases/20261003-093546`. El entorno local normal permanece intacto. La comparación previa/posterior conservó los registros académicos existentes. El hito de regularización de B1 y los pendientes de documentación/confirmación están en `docs/gradebook-pdf-emission.md`.

## Dataset habitual para asistencia — 9 de octubre de 2026

El usuario autorizó expresamente limpiar los datos operativos locales y cargar alumnos reales de un CSV externo para contrastar registros de asistencia con la realidad, prohibiendo cualquier acceso al VPS. Esta excepción de pruebas con identidades reales se limita a la base habitual local: no cambia el requisito de anonimizar snapshots productivos ni el carácter exclusivamente sintético de `deploy/pocketbase-dev-seed` y las pruebas automatizadas.

`scripts/prepare-attendance-local.mjs` fija `http://127.0.0.1:8090`, ignora variables de URL/credenciales y rechaza opciones externas. Antes de autenticar verifica el proceso Windows, su escucha loopback y sus rutas a `C:/pocketbase/pb_data`, hooks y migraciones del checkout. Usa exclusivamente `C:/pocketbase/dev-credentials.txt` y rechaza redirecciones HTTP. El CSV debe permanecer fuera del repositorio.

El modo predeterminado valida sin escribir registros. `--execute` valida primero todo el CSV, esquema y catálogos, confirma un respaldo de PocketBase en disco local y limpia, en orden referencial, alumnos, responsables, vínculos, matrículas, evaluaciones, criterios evaluados, cierres, novedades diarias, registros mensuales de curso, instancias, enlaces, visados y emisiones. Conserva usuarios, estructura curricular, escalas, períodos, calendarios y eventos institucionales. No borra ni sustituye colecciones. La preparación requiere 3.º y 4.º del ciclo 2026, alumnos regulares con ingreso hasta mayo y las mallas completas existentes.

```powershell
node scripts/prepare-attendance-local.mjs --csv "C:\ruta\dataset-externo.csv" --dry-run
node scripts/prepare-attendance-local.mjs --csv "C:\ruta\dataset-externo.csv" --execute
```

La ejecución del 9 de octubre dejó 11 alumnos de 3.º y 19 de 4.º, 29 responsables, 30 vínculos y 30 matrículas. Conservó las fechas originales de ingreso, incluidas dos altas de mayo en 4.º. Para la prueba de ambos bimestres se confirmó el rango evaluable 1..4 por gateway institucional, independiente de esas fechas administrativas. Los campos de procedencia, destino y resolución ausentes del CSV no se inventan. El esquema de alumnos no incluye teléfono; esa columna adicional del CSV no se importa.

Las notas de B1/B2 son ficticias por autorización del usuario. Se escribieron 638 evaluaciones de materia y 3190 criterios mediante el gateway docente, sin escrituras directas académicas. Los cuatro workflows quedan en `BORRADOR_DOCENTE`, sin enlaces vigentes, cierres, entregas ni visados. Esto permite leer notas en mayo/julio sin simular asistencia ni aprobar boletines. Las escalas abarcan todos los valores calificativos salvo No corresponde; PPI permanece falso. La elección reproducible y el orden curricular se documentan en el reporte local y en `docs/gradebook-dataset-ingestion.md`.

Respaldo previo confirmado: `C:/pocketbase/pb_data/backups/attendance-reset-1791548176193.zip`. Reporte sin identidades personales: `C:/pocketbase/audits/attendance-local-1791548179254.json`. La preparación no es una transacción global: si falla después de empezar, conservar ese respaldo y revisar el estado antes de repetir `--execute`, que vuelve a limpiar la base. No ejecutarlo después de comenzar pruebas manuales si se desea conservarlas.

La verificación leyó los cuatro registros mediante el servicio TypeScript real: nóminas de 11/19, ocho/nueve notas curriculares por alumno, criterios completos y cero novedades persistidas. Mayo de 4.º refleja 17 alumnos al inicio y 19 al cierre. Se conservaron los calendarios existentes de mayo, julio, septiembre y octubre. La ausencia de novedades se presenta como Presente por la regla del dominio; no implica datos de asistencia cargados. `npm run lint` y `npm run build` finalizaron correctamente, con el warning de bundle conocido. No hubo solicitudes a producción ni modificaciones del seed.
