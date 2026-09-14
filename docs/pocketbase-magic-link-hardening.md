# Endurecimiento de enlaces mágicos en PocketBase

## Estado confirmado

El 14 de septiembre de 2026 se desplegaron en PocketBase 0.22.17 las migraciones `1789334557_hardened_teacher_access_tokens.js` y `1789338120_close_public_gradebook_rules.js`, los hooks de acceso docente y la unidad systemd con rutas explícitas para datos, hooks y migraciones. `pb_schema.json` refleja la colección migrada y todas las reglas resultantes.

Las rutas seguras disponibles son:

- `GET /api/cys/docente/contexto`
- `GET /api/cys/docente/alumnos/:inscripcionId`
- `PUT /api/cys/docente/alumnos/:inscripcionId`
- `POST /api/cys/enlaces-docentes`, restringida a usuarios institucionales autenticados
- `POST /api/cys/enlaces-docentes/:tokenId/rotar`, restringida a usuarios institucionales autenticados

Las rutas docentes reciben la credencial en `X-CYS-Teacher-Token`, revalidan su vigencia y alcance en cada solicitud y responden con `Cache-Control: no-store`. Todos los enlaces, incluidos los legados, guardan SHA-256 tanto en `token` como en `token_hash` y sólo muestran `token_prefijo` como referencia administrativa. Los enlaces legados conservan validez porque el gateway compara el hash del secreto presentado.

La verificación posterior al despliegue confirmó el servicio activo, el health check público, la lectura de contexto y de una ficha mediante un enlace legado convertido a hash, cero resultados anónimos en `alumnos` y `tokens_acceso_docente`, y respuestas `401` para una credencial inválida y una rotación sin sesión. La emisión autenticada y las escrituras transaccionales se validaron contra una instancia local de PocketBase 0.22.17 con una copia del esquema y las reglas cerradas.

### Estado de seguridad

Las colecciones académicas y `tokens_acceso_docente` exigen sesión institucional para listar, ver o escribir. La ruta docente sólo recibe los datos mínimos de su alcance mediante el gateway. El secreto no puede recuperarse desde PocketBase después de su emisión o rotación.

## Arquitectura vigente

La aplicación seguirá ofreciendo acceso docente sin usuario ni contraseña. El enlace será una credencial de capacidad: quien lo posee puede operar únicamente sobre el alcance concedido y mientras siga activo.

El navegador docente no debe consumir directamente las colecciones académicas. Debe usar rutas específicas de PocketBase implementadas en `pb_hooks`:

- Validar el secreto y devolver contexto mínimo del curso, período, materia y docente.
- Listar únicamente los alumnos y datos necesarios para esa planilla.
- Leer la libreta de un alumno dentro del alcance autorizado.
- Guardar únicamente calificaciones permitidas y, para enlaces generales, apoyos y cierre.
- Revalidar actividad, vencimiento y alcance en cada solicitud.

El hook consulta y persiste internamente mediante PocketBase, por lo que las reglas públicas de las colecciones pueden volver a cerrarse. Los guardados relacionados deben ejecutarse en una transacción.

## Tratamiento del secreto

- Generar al menos 256 bits aleatorios mediante una fuente criptográfica.
- Entregar el secreto completo sólo al crear el enlace.
- Guardar un hash SHA-256 y un prefijo corto identificable, no el enlace reutilizable en texto plano.
- Compartir nuevamente implica rotar o emitir un enlace nuevo.
- Usar el fragmento de URL, por ejemplo `/carga#token=...`, para evitar que el secreto llegue a logs HTTP y encabezados `Referer`.
- Enviar el secreto a las rutas de PocketBase mediante un header dedicado y responder siempre con `Cache-Control: no-store`.
- No incluir el secreto en logs de aplicación, auditoría ni mensajes de error.

## Despliegue gradual sin interrumpir la carga

### Etapa 0: inventario y respaldo

Responsabilidad manual en el VPS:

1. Informar la versión exacta con `./pocketbase --version`.
2. Crear un backup desde el panel de PocketBase o con una copia consistente de `pb_data` mientras el servicio está detenido.
3. Confirmar cómo se inicia el servicio y dónde están `pb_data`, `pb_hooks` y `pb_migrations`.
4. Confirmar el reverse proxy y los orígenes web autorizados.

No se cambian reglas en esta etapa.

### Etapa 1: rutas seguras paralelas — completada el 14 de septiembre de 2026

Los hooks compatibles con PocketBase 0.22.17 conviven temporalmente con las APIs públicas actuales. Se probaron validación, enlace legado y con hash, vencimiento, revocación, alcance por materia, escritura parcial y transacción.

Despliegue realizado en el VPS:

1. Se copiaron los archivos versionados de `pb_hooks` y la migración.
2. Se aplicó la migración y se reinició PocketBase mediante systemd.
3. Se verificaron el proceso, las rutas explícitas, HTTPS y las lecturas seguras.

### Etapa 2: migración del frontend — completada el 14 de septiembre de 2026

La ruta `/carga` usa `GradebookDataSource` para consumir exclusivamente el gateway docente. La pantalla institucional comparte `VistaPorAlumno`, pero conserva las APIs autenticadas normales mediante su propio origen de datos. Los enlaces nuevos usan fragmento de URL y los secretos sólo pueden copiarse al emitirlos o regenerarlos.

### Etapa 3: cierre de reglas — completada el 14 de septiembre de 2026

La migración `1789338120_close_public_gradebook_rules.js` aplica `@request.auth.id != ""` a las reglas de lectura y escritura abiertas para el magic link, convierte los secretos legados a hash y conserva su prefijo. Abarca:

- `alumnos`: lista y vista.
- `criterios_evaluacion`: lista y vista.
- `curso_materias`: lista y vista.
- `cursos`: lista y vista.
- `escalas_calificacion`: lista y vista.
- `evaluaciones_criterios`: lista, vista, creación y actualización.
- `evaluaciones_materia`: lista, vista, creación y actualización.
- `inscripciones`: lista, vista, creación y actualización.
- `materias`: lista y vista.
- `periodos`: lista y vista.
- `valores_escala`: lista y vista.
- `cierres_periodo_alumno`: lista, vista, creación y actualización.
- `tokens_acceso_docente`: lista y vista.

La migración fue probada con PocketBase 0.22.17 sobre una copia local y luego aplicada en el VPS. El gateway continuó leyendo, las colecciones dejaron de enumerar datos anónimos y las rutas administrativas rechazaron sesiones ausentes.

### Etapa 4: operación posterior

- Regenerar un enlace cuando sea necesario volver a compartirlo; la rotación invalida inmediatamente el anterior.
- Evaluar una colección de auditoría restringida antes de producción si se requiere trazabilidad por operación, sin almacenar secretos ni datos académicos completos.
- Habilitar rate limiting en PocketBase y, si corresponde, también en el reverse proxy.
- Limitar CORS a los orígenes de la aplicación como defensa adicional, sin considerarlo un mecanismo de autenticación.

## Gestión profesional del esquema

`pb_schema.json` seguirá siendo una fotografía legible para desarrollo y asistentes, pero no debe ser el mecanismo de despliegue.

PocketBase mantiene `pb_migrations`, que puede versionarse junto con el código. El primer paso será generar una migración base desde la instancia vigente y agregarla al repositorio. A partir de allí:

1. Cada cambio de colección o regla genera una migración versionada.
2. La migración se revisa junto con el frontend y los hooks.
3. Se crea un backup antes de aplicarla en el VPS.
4. Se aplica primero en una copia de prueba de `pb_data`.
5. Se despliega y se conserva una ruta de rollback.
6. `pb_schema.json` se actualiza como snapshot derivado, no mediante edición manual independiente.

La generación y sintaxis exactas de la migración dependen de la versión instalada en el VPS.
