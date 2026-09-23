# Guía personal de PocketBase: desarrollo, producción y recuperación

Actualizado: 20 de septiembre de 2026.

## Para qué sirve esta guía

Este documento explica cómo quedó organizada la base de datos de Crecer y Ser y qué hacer en los dos recorridos habituales:

1. Desarrollar cambios localmente y llevarlos de forma segura a producción.
2. Reconstruir el entorno local si se pierde el equipo o la carpeta `C:\pocketbase`.

La regla central es que existen dos bases independientes. No hay sincronización automática ni una réplica viva entre ellas.

## Modelo mental de la arquitectura

```text
PocketBase local                         Git                         PocketBase VPS
C:\pocketbase                           repositorio                 /root/pb
http://127.0.0.1:8090                                               https://alumnos-api.duckdns.org

datos de prueba          <- hooks, migraciones, frontend ->         datos reales
credenciales locales     <- documentación y configuración ->        secretos productivos

                  No se copia pb_data de desarrollo al VPS
```

| Elemento | Desarrollo | Producción | Cómo se transporta |
| --- | --- | --- | --- |
| Estructura de colecciones y campos | Se diseña y prueba primero | Se aplica después de validar | Migraciones versionadas en Git |
| Reglas, rutas y lógica del backend | `pb_hooks` del checkout | `pb_hooks` del VPS | Git y publicador controlado |
| Frontend | Vite local | Hosting productivo | Git y canal de publicación del frontend |
| Datos escolares | Ficticios, anonimizados o descartables | Reales | No se sincronizan automáticamente |
| Secretos | Exclusivos del equipo local | Exclusivos del VPS | Nunca se copian entre entornos ni se suben a Git |
| Snapshot legible del esquema | `pb_schema.json` | Referencia documental | Git; no ejecuta cambios |

Git es el puente para el código y la estructura. `pb_data` nunca es el mecanismo de despliegue.

## Ubicaciones importantes

### Desarrollo local

| Recurso | Ubicación |
| --- | --- |
| Ejecutable PocketBase | `C:\pocketbase\pocketbase.exe` |
| Base local | `C:\pocketbase\pb_data` |
| Credenciales locales | `C:\pocketbase\dev-credentials.txt` |
| Clave docente local | `C:\pocketbase\teacher-link-dev.key` |
| Configuración del frontend | `.env.development.local` dentro del proyecto, ignorado por Git |
| Backup cifrado | `OneDrive\Backups\Crecer-y-Ser\*.cysbackup` |

### Producción

| Recurso | Ubicación |
| --- | --- |
| Instalación PocketBase | `/root/pb` en el VPS |
| Base productiva | `/root/pb/pb_data` |
| Hooks productivos | `/root/pb/pb_hooks` |
| Migraciones productivas | `/root/pb/pb_migrations` |
| Clave productiva | `/root/pb/teacher-link.env` |
| Endpoint público | `https://alumnos-api.duckdns.org` |

La versión fijada para ambos entornos es PocketBase `0.22.17`.

## Tres conceptos que no deben mezclarse

### 1. Estructura

Son colecciones, campos, relaciones, índices y reglas de acceso. Viaja mediante archivos de `pb_migrations`.

### 2. Lógica de backend

Son hooks, gateways HTTP, autorizaciones y transacciones. Vive en `pb_hooks` y se despliega junto con las migraciones compatibles.

### 3. Datos

Son alumnos, responsables, cursos, inscripciones, evaluaciones y demás registros. Los datos reales pertenecen a producción. Los datos locales no se promueven al VPS.

Una migración puede transformar datos existentes de producción cuando una nueva estructura lo exige. Eso no significa copiar registros locales: significa ejecutar en producción una transformación determinista, revisada y versionada.

## Trabajo cotidiano en desarrollo

Desde la raíz del proyecto:

```powershell
git pull
.\deploy\start-pocketbase-dev.ps1
```

En otra terminal:

```powershell
npm run dev
```

La variable local obligatoria es:

```dotenv
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

Antes de ingresar o modificar datos, comprobar:

```powershell
.\deploy\verify-pocketbase-dev.ps1
```

El resultado esperado debe mostrar todos los controles en `true`, especialmente `loopbackOnly`, `anonymousDataHidden` y `authenticatedDataAvailable`.

No iniciar el frontend local si falta `.env.development.local`: el cliente ya no tiene fallback y se detendrá para impedir una conexión accidental a un entorno incorrecto.

## Caso 1: llevar una feature de desarrollo a producción

### Qué sí viaja

- La migración que describe el cambio estructural.
- Los hooks compatibles con ese cambio.
- Las modificaciones del frontend.
- El snapshot actualizado `pb_schema.json`.
- La documentación y las pruebas de aceptación.
- Transformaciones o catálogos mínimos que sean parte inseparable de la feature.

### Qué no viaja

- `C:\pocketbase\pb_data`.
- Alumnos, responsables, evaluaciones o inscripciones creados para probar.
- Credenciales locales, `.env`, claves docentes o backups.
- El seed de `deploy/pocketbase-dev-seed`.

### Paso a paso

1. Crear un backup local antes de una modificación delicada:

   ```powershell
   .\deploy\backup-pocketbase-dev.ps1
   ```

   PocketBase debe estar detenido.

2. Iniciar PocketBase local y hacer el cambio en desarrollo.

3. Crear o revisar la migración correspondiente en `pb_migrations`:

   ```powershell
   C:\pocketbase\pocketbase.exe migrate create nombre_descriptivo --dir=C:\pocketbase\pb_data --migrationsDir=.\pb_migrations --hooksDir=.\pb_hooks
   ```

4. Comprobar que la migración tenga estas propiedades:

   - Es compatible con PocketBase `0.22.17`.
   - Es determinista: el mismo estado de entrada produce el mismo resultado.
   - No contiene secretos ni registros reales.
   - Incluye un `down` razonable cuando revertir sea seguro.
   - No modifica migraciones que ya llegaron a producción.

5. Actualizar hooks, frontend, API y documentación si dependen de la nueva estructura.

6. Actualizar `pb_schema.json` para reflejar el resultado. Este archivo ayuda a leer el modelo, pero no reemplaza la migración.

7. Probar localmente la feature, permisos, casos de error y compatibilidad:

   ```powershell
   .\deploy\verify-pocketbase-dev.ps1
   npm run lint
   npm run build
   ```

8. Ensayar las migraciones candidatas sobre una copia reciente y aislada de producción. Esa copia debe sanearse antes de usarla: se eliminan usuarios, administradores, enlaces docentes, credenciales externas, textos sensibles y datos identificatorios.

9. Agregar toda migración nueva a la lista explícita de:

   - `deploy/publish-pocketbase.ps1`
   - `deploy/apply-pocketbase-workflow.sh`

10. Revisar y versionar el conjunto completo en Git.

11. Desplegar el backend sólo después de aprobar el ensayo:

    ```powershell
    .\deploy\publish-pocketbase.ps1
    ```

    El publicador crea staging, detiene PocketBase, genera un backup productivo, instala los artefactos, reinicia el servicio y verifica el health check y las protecciones principales.

12. Verificar producción y publicar después el frontend compatible. La salida del publicador informa la ruta del backup productivo que permite recuperar la release.

### Cómo se mueven los datos necesarios para una feature

| Situación | Procedimiento correcto |
| --- | --- |
| Nuevo campo vacío | Migración estructural |
| Nuevo campo calculado desde datos existentes | Migración con transformación determinista |
| Nuevo catálogo indispensable para la aplicación | Migración con registros canónicos y estables |
| Alumno o responsable usado en pruebas | No se promueve |
| Evaluaciones creadas para probar | No se promueven |
| Datos reales que deben cargarse | Se ingresan o importan directamente en producción mediante un proceso aprobado |
| Corrección masiva de datos reales | Script o migración específica, ensayada sobre copia productiva y respaldada |

No se realiza una combinación manual entre las dos bases SQLite.

## Caso 1B: actualizar desarrollo desde producción

Hay dos necesidades distintas y deben resolverse de forma diferente.

### Recibir cambios de código o estructura

Si producción fue actualizada mediante el repositorio, el entorno local recibe esos cambios con Git:

```powershell
git pull
.\deploy\start-pocketbase-dev.ps1
```

Al iniciar, `--automigrate=true` aplica en la base local únicamente las migraciones pendientes. Los hooks se cargan directamente desde el checkout.

Este recorrido no copia datos productivos y normalmente es suficiente para continuar desarrollando.

### Refrescar datos para representar mejor la realidad productiva

Esto es excepcional y reemplaza el estado local. No es una sincronización cotidiana.

```text
VPS detenido durante snapshot
    -> copia protegida
    -> copia temporal de trabajo
    -> anonimización completa
    -> eliminación de secretos y accesos
    -> validación
    -> reemplazo acordado de la base local
```

El procedimiento debe hacerse con asistencia técnica porque contiene temporalmente datos reales y acciones destructivas:

1. Acordar que se perderán o archivarán los datos de prueba locales actuales.
2. Crear primero un backup cifrado de la base local vigente.
3. Crear en el VPS un snapshot consistente con PocketBase detenido durante la copia.
4. Reiniciar producción inmediatamente, incluso si la copia falla.
5. Transferir el snapshot por SSH a una ubicación temporal protegida.
6. Nunca copiar la clave productiva `/root/pb/teacher-link.env`.
7. Trabajar sobre una segunda copia y conservar el snapshot sólo como fuente temporal.
8. Anonimizar personas, contactos, textos libres y credenciales externas.
9. Eliminar usuarios, administradores, enlaces docentes, logs y backups internos.
10. Aplicar las migraciones del checkout y ejecutar las verificaciones locales.
11. Reemplazar la base local únicamente después de validar el saneamiento.
12. Eliminar todas las copias crudas del equipo.

La dirección inversa está prohibida: una base local nunca reemplaza ni se mezcla con la base del VPS.

### Si producción contiene un catálogo nuevo creado manualmente

No conviene copiar toda la base para recuperar ese catálogo. Primero se evalúa si ese registro es configuración canónica. Si lo es, se expresa mediante una migración nueva y se aplica en ambos entornos. Si es un dato operativo real, permanece únicamente en producción.

## Rollback de una release

Un rollback tampoco copia `pb_data` local al VPS.

El orden de preferencia es:

1. Crear una migración correctiva hacia adelante.
2. Usar `migrate down 1` sólo con PocketBase detenido, confirmando que la migración es la última y que su `down` no destruye datos necesarios.
3. Restaurar el backup productivo previo a la release cuando la reversión lógica no sea segura.
4. Volver también hooks y frontend a una versión compatible con la base restaurada.

## Caso 2: reconstruir un entorno local perdido

Hay dos caminos. Se elige uno, no se mezclan.

### Camino A: reconstrucción limpia desde Git

Usar este camino si no se necesita recuperar el contenido exacto de la antigua base local.

1. Instalar Git y clonar el repositorio:

   ```powershell
   git clone https://github.com/andresanni/crecer-y-ser.git
   cd crecer-y-ser
   ```

2. Confirmar que no existan estos elementos del intento anterior:

   - `C:\pocketbase\pb_data`
   - `C:\pocketbase\dev-credentials.txt`
   - `C:\pocketbase\teacher-link-dev.key`

   El instalador se detiene si los encuentra para no sobrescribir información. No eliminarlos a ciegas: moverlos primero a una ubicación de cuarentena si se desconoce su contenido.

3. Reconstruir PocketBase:

   ```powershell
   .\deploy\setup-pocketbase-dev.ps1 -DownloadPocketBase
   ```

   El instalador detecta ARM64 o AMD64, descarga PocketBase `0.22.17`, verifica su SHA-256, crea la base, aplica toda la cadena de migraciones, genera secretos locales y carga el seed sintético.

4. Instalar el frontend:

   ```powershell
   npm ci
   ```

5. Iniciar PocketBase:

   ```powershell
   .\deploy\start-pocketbase-dev.ps1
   ```

6. En otra terminal, validar la reconstrucción y las cantidades del seed:

   ```powershell
   .\deploy\verify-pocketbase-dev.ps1 -ExpectSyntheticSeed
   ```

7. Iniciar el frontend:

   ```powershell
   npm run dev
   ```

`setup-pocketbase-dev.ps1` crea `.env.development.local` cuando no existe. También genera nuevas credenciales y una nueva clave docente local; no intenta recuperar las anteriores.

### Camino B: restaurar el backup cifrado

Usar este camino para recuperar la base saneada, los datos de prueba, credenciales y clave local que existían al crear el backup.

1. Clonar el repositorio y entrar en su carpeta.

2. Tener disponible el archivo `.cysbackup` de OneDrive y la frase guardada en el gestor de contraseñas.

3. Confirmar que el destino no contenga `pb_data`, credenciales o clave local. La restauración nunca sobrescribe esos elementos.

4. Descargar y verificar únicamente el ejecutable:

   ```powershell
   .\deploy\setup-pocketbase-dev.ps1 -DownloadPocketBase -DownloadOnly
   ```

5. Restaurar el contenedor:

   ```powershell
   .\deploy\restore-pocketbase-dev.ps1 -BackupPath "C:\ruta\al\backup.cysbackup"
   ```

   El script solicita la frase sin mostrarla, autentica el archivo antes de instalar datos y restaura permisos restringidos. Una frase incorrecta o un archivo alterado no escribe la base.

6. Crear la configuración local del frontend si no existe:

   ```powershell
   Copy-Item .env.example .env.development.local
   ```

7. Instalar dependencias, iniciar y verificar:

   ```powershell
   npm ci
   .\deploy\start-pocketbase-dev.ps1
   ```

   En otra terminal:

   ```powershell
   .\deploy\verify-pocketbase-dev.ps1
   npm run dev
   ```

No usar `-ExpectSyntheticSeed` después de restaurar un entorno que ya tuvo modificaciones: esa opción exige las cantidades exactas del fixture inicial.

## Backup local: cuándo y cómo

Conviene crear un nuevo backup cifrado:

- Antes de una migración local delicada.
- Después de ingresar un conjunto de datos de prueba que costaría reconstruir.
- Antes de reemplazar la base local por una copia saneada más reciente.
- Antes de cambiar de equipo.

PocketBase debe estar detenido:

```powershell
.\deploy\backup-pocketbase-dev.ps1
```

El archivo se guarda por defecto fuera del repositorio en `OneDrive\Backups\Crecer-y-Ser`. La frase debe tener al menos 16 caracteres y permanecer únicamente en el gestor de contraseñas. El contenedor usa AES-256-CBC, HMAC-SHA256 y PBKDF2-SHA256.

El backup conserva la base local saneada, almacenamiento, credenciales locales y clave docente local. No conserva el ejecutable, el repositorio, logs, backups internos ni ningún secreto productivo.

## Lista de comprobación antes de ingresar datos locales

- PocketBase muestra `Server started at http://127.0.0.1:8090`.
- `.env.development.local` contiene `VITE_POCKETBASE_URL=http://127.0.0.1:8090`.
- `verify-pocketbase-dev.ps1` devuelve todos los controles en `true`.
- Los datos que se ingresarán son ficticios, descartables o están correctamente anonimizados.
- No se usarán credenciales, enlaces docentes ni secretos de producción.
- Se entiende que esos registros no serán enviados después al VPS.
- Existe un backup cifrado reciente si perder ese trabajo local sería costoso.

## Comandos de referencia rápida

| Objetivo | Comando |
| --- | --- |
| Iniciar backend local | `.\deploy\start-pocketbase-dev.ps1` |
| Verificar backend local | `.\deploy\verify-pocketbase-dev.ps1` |
| Verificar seed recién creado | `.\deploy\verify-pocketbase-dev.ps1 -ExpectSyntheticSeed` |
| Crear backup cifrado | `.\deploy\backup-pocketbase-dev.ps1` |
| Reconstruir limpio | `.\deploy\setup-pocketbase-dev.ps1 -DownloadPocketBase` |
| Descargar sólo PocketBase | `.\deploy\setup-pocketbase-dev.ps1 -DownloadPocketBase -DownloadOnly` |
| Restaurar backup | `.\deploy\restore-pocketbase-dev.ps1 -BackupPath "ruta.cysbackup"` |
| Iniciar frontend | `npm run dev` |
| Validar frontend | `npm run lint` y `npm run build` |
| Publicar backend aprobado | `.\deploy\publish-pocketbase.ps1` |

## Preguntas frecuentes

### ¿Debo crear otro repositorio para `C:\pocketbase`?

No. Esa carpeta contiene binarios, estado y secretos locales. El repositorio actual conserva únicamente lo necesario para reconstruirla.

### ¿Los cambios hechos en el panel local llegan solos a producción?

No. Deben producir una migración revisada y versionada. Luego esa migración se ensaya y despliega explícitamente.

### ¿Git guarda mis alumnos de prueba?

No. Git guarda migraciones y el seed sintético común, no el contenido de `pb_data`.

### ¿Puedo traer producción a local con frecuencia?

Técnicamente es posible, pero no es el flujo normal. Sólo debe hacerse cuando una prueba necesita representar la distribución real de datos y siempre con snapshot consistente, anonimización y eliminación posterior de las copias crudas.

### ¿Puedo llevar de local a producción un alumno o una evaluación que quedó bien?

No como copia de base. Los datos reales se cargan en producción mediante la aplicación o una importación específica aprobada. Sólo los catálogos y transformaciones canónicas pueden formar parte de una migración.

### ¿Qué archivo manda sobre el esquema?

La historia ejecutable de `pb_migrations`. `pb_schema.json` es una fotografía legible y debe mantenerse alineada, pero no despliega nada.

### ¿Qué ocurre si pierdo la frase del backup?

Ese backup no puede recuperarse. Todavía puede construirse un entorno nuevo desde Git con datos sintéticos, pero se perderán los datos locales particulares contenidos sólo en el backup.

### ¿Cuándo debo pedir asistencia antes de continuar?

Antes de refrescar local desde producción, ejecutar un despliegue al VPS, revertir una migración, restaurar una base productiva o manipular datos reales fuera de la aplicación.

## Documentación técnica relacionada

- `docs/pocketbase-environments.md`: contrato canónico de separación, promoción y rollback.
- `deploy/README.md`: operación del VPS y publicación del backend.
- `docs/pocketbase-api.md`: contrato de rutas propias.
- `docs/pocketbase-magic-link-hardening.md`: seguridad de enlaces docentes.
- `docs/gradebook-workflow-test-plan.md`: pruebas funcionales y de concurrencia.
- `pb_schema.json`: fotografía legible del modelo actual.
- `AGENTS.md`: reglas obligatorias para cualquier agente que trabaje en el repositorio.
