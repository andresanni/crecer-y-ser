# Endurecimiento de enlaces mágicos en PocketBase

## Estado confirmado

Las migraciones de endurecimiento y workflow, los hooks de acceso docente e institucional y la unidad systemd con rutas explícitas para datos, hooks y migraciones están desplegados en PocketBase 0.22.17. La simplificación unidireccional, la recuperación cifrada y el modelo de llave única sin estado propio se aplicaron el 15 de septiembre de 2026; `pb_schema.json` refleja las colecciones, índices y reglas resultantes.

Las rutas seguras disponibles son:

- `GET /api/cys/docente/contexto`
- `GET /api/cys/docente/alumnos/:inscripcionId`
- `PUT /api/cys/docente/alumnos/:inscripcionId`
- `POST /api/cys/docente/enviar`
- `POST /api/cys/enlaces-docentes`, restringida a usuarios institucionales autenticados
- `POST /api/cys/enlaces-docentes/:tokenId/rotar`, restringida a usuarios institucionales autenticados
- `POST /api/cys/enlaces-docentes/:tokenId/recuperar`, restringida a usuarios institucionales autenticados
- `GET /api/cys/directivo/instancias/:cursoId/:periodoId`, restringida a usuarios institucionales autenticados
- `PUT /api/cys/directivo/alumnos/:inscripcionId`, restringida a usuarios institucionales autenticados

Las rutas docentes reciben la credencial en `X-CYS-Teacher-Token`, revalidan existencia, secreto, alcance y workflow en cada solicitud y responden con `Cache-Control: no-store`. Los enlaces nuevos guardan SHA-256 tanto en `token` como en `token_hash` y sólo muestran `token_prefijo` como referencia administrativa. Los enlaces legados de curso completo conservan validez por comparación de hash; los accesos legados limitados a una materia son rechazados por el gateway.

La verificación posterior al despliegue confirmó el servicio activo, el health check público, cero resultados anónimos en las colecciones protegidas y rechazo de credenciales inválidas o rutas institucionales sin sesión.

### Estado de seguridad

Las colecciones académicas y `tokens_acceso_docente` exigen sesión institucional para listar, ver o escribir. La ruta docente sólo recibe los datos mínimos de su alcance mediante el gateway. La recuperación del secreto exige sesión institucional, existencia de la llave, estado `BORRADOR_DOCENTE` y la clave externa del VPS.

### Workflow desplegado

La migración `1789342800_created_gradebook_workflows.js` incorporó `instancias_carga_boletin` y cerró la creación y actualización directa de `tokens_acceso_docente`. Los guardados docentes verifican `BORRADOR_DOCENTE` dentro de su transacción. `POST /api/cys/docente/enviar` valida el curso completo, transfiere el control y elimina su llave atómicamente.

La fase institucional agregó la consulta de estado y un guardado transaccional restringido a `CONTROL_DIRECTIVO`. La misma migración bloqueó creación, actualización y eliminación directa de evaluaciones, criterios evaluados y cierres. La interfaz no monta el editor institucional mientras la docente conserva el control.

La migración `1789346400_simplified_unidirectional_gradebook_workflow.js` convierte cualquier instancia histórica `CERRADO` en `CONTROL_DIRECTIVO`, elimina ese estado y sus campos de auditoría y deja `CONTROL_DIRECTIVO` como estado terminal. Se validó primero sobre una copia con un registro cerrado y luego se desplegó con el respaldo `/root/pb/deploy_backups/20260915-081914`. Los hooks ya no exponen rutas de devolución, cierre o reapertura, por lo que un envío docente nunca puede recuperar acceso docente.

La migración `1789471993_removed_teacher_access_expiration.js` retira `fecha_expiracion`. Fue validada sobre una copia y desplegada el 15 de septiembre de 2026 con el respaldo `/root/pb/deploy_backups/20260915-083545`.

La migración `1789474000_added_recoverable_teacher_links.js` incorpora `token_cifrado` y el gateway autenticado de recuperación. Se validó el cifrado y descifrado en PocketBase 0.22.17 sobre una copia aislada y se desplegó con el respaldo `/root/pb/deploy_backups/20260915-090348`. La clave externa se carga mediante systemd y el endpoint no altera el secreto ni el workflow.

La migración `1789477600_removed_teacher_link_state.js` elimina el booleano `activo`, depura credenciales inactivas y accesos legados por materia y agrega un índice único por curso y período. Desde ese punto la existencia del registro representa la llave vigente: emitir reemplaza, eliminar corta el acceso y entregar elimina la llave. Fue desplegada el 15 de septiembre de 2026 con el respaldo `/root/pb/deploy_backups/20260915-092724`.

El conjunto versionado completa la exclusión mutua entre roles y debe mantenerse sincronizado: migraciones, hooks y frontend compatibles.

## Arquitectura vigente

La aplicación ofrece acceso docente sin usuario ni contraseña. El enlace es una credencial de capacidad: quien lo posee puede operar únicamente sobre el alcance concedido mientras sea la llave vigente y el workflow continúe en borrador docente.

El navegador docente no debe consumir directamente las colecciones académicas. Debe usar rutas específicas de PocketBase implementadas en `pb_hooks`:

- Validar el secreto y devolver contexto mínimo del curso, período y docente.
- Listar únicamente los alumnos y datos necesarios para esa planilla.
- Leer la libreta de un alumno dentro del alcance autorizado.
- Guardar las calificaciones del curso, apoyos y cierre permitidos.
- Revalidar existencia de la llave, estado del workflow y alcance en cada solicitud.

El hook consulta y persiste internamente mediante PocketBase, por lo que las reglas públicas de las colecciones pueden volver a cerrarse. Los guardados relacionados deben ejecutarse en una transacción.

## Tratamiento del secreto

- Generar al menos 256 bits aleatorios mediante una fuente criptográfica.
- Entregar el secreto completo al crear, regenerar o recuperar el enlace desde una sesión institucional.
- Guardar un hash SHA-256, un prefijo corto y una copia AES-256-GCM; nunca guardar el enlace reutilizable en texto plano.
- Mantener `CYS_TEACHER_LINK_KEY` exclusivamente en `/root/pb/teacher-link.env`, con permisos `0600`, fuera del repositorio y de los backups públicos.
- Compartir nuevamente recupera la llave vigente; regenerar sólo es necesario cuando se desea invalidar la anterior.
- Usar el fragmento de URL, por ejemplo `/carga#token=...`, para evitar que el secreto llegue a logs HTTP y encabezados `Referer`.
- Enviar el secreto a las rutas de PocketBase mediante un header dedicado y responder siempre con `Cache-Control: no-store`.
- No incluir el secreto en logs de aplicación, auditoría ni mensajes de error.

## Historial del despliegue gradual

### Etapa 0: inventario y respaldo

Responsabilidad manual en el VPS:

1. Informar la versión exacta con `./pocketbase --version`.
2. Crear un backup desde el panel de PocketBase o con una copia consistente de `pb_data` mientras el servicio está detenido.
3. Confirmar cómo se inicia el servicio y dónde están `pb_data`, `pb_hooks` y `pb_migrations`.
4. Confirmar el reverse proxy y los orígenes web autorizados.

No se cambian reglas en esta etapa.

### Etapa 1: rutas seguras paralelas — completada el 14 de septiembre de 2026

Los hooks compatibles con PocketBase 0.22.17 conviven temporalmente con las APIs públicas actuales. Se probaron validación, enlace legado y con hash, reemplazo, escritura parcial y transacción. Los accesos por materia fueron retirados posteriormente del contrato y los enlaces legados de ese tipo son rechazados.

Despliegue realizado en el VPS:

1. Se copiaron los archivos versionados de `pb_hooks` y la migración.
2. Se aplicó la migración y se reinició PocketBase mediante systemd.
3. Se verificaron el proceso, las rutas explícitas, HTTPS y las lecturas seguras.

### Etapa 2: migración del frontend — completada el 14 de septiembre de 2026

La ruta `/carga` usa `GradebookDataSource` para consumir exclusivamente el gateway docente. La pantalla institucional comparte `VistaPorAlumno`, pero conserva las APIs autenticadas normales mediante su propio origen de datos. Los enlaces nuevos usan fragmento de URL y pueden copiarse nuevamente mediante el endpoint institucional sin rotación.

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

- Recuperar el enlace para volver a compartir la misma llave o regenerarlo cuando sea necesario invalidar inmediatamente la anterior.
- Evaluar una colección de auditoría restringida antes de producción si se requiere trazabilidad por operación, sin almacenar secretos ni datos académicos completos.
- Habilitar rate limiting en PocketBase y, si corresponde, también en el reverse proxy.
- Limitar CORS a los orígenes de la aplicación como defensa adicional, sin considerarlo un mecanismo de autenticación.

## Gestión profesional del esquema

`pb_schema.json` es una fotografía legible para desarrollo y asistentes, pero no es el mecanismo de despliegue.

PocketBase mantiene `pb_migrations`, versionado junto con el código. La evolución vigente ya está registrada en migraciones incrementales. A partir de ahora:

1. Cada cambio de colección o regla genera una migración versionada.
2. La migración se revisa junto con el frontend y los hooks.
3. Se crea un backup antes de aplicarla en el VPS.
4. Se aplica primero en una copia de prueba de `pb_data`.
5. Se despliega y se conserva una ruta de rollback.
6. `pb_schema.json` se actualiza como snapshot derivado, no mediante edición manual independiente.

La generación y sintaxis exactas de cada migración deben conservar compatibilidad con PocketBase 0.22.17 mientras esa sea la versión instalada en el VPS.
