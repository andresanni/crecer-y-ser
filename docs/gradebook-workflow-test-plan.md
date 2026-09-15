# Plan de pruebas del workflow de boletines

## Objetivo

Validar la persistencia progresiva docente, la transferencia unidireccional y exclusiva de control y la corrección institucional sin exponer las colecciones académicas a escrituras directas.

## Preparación

- Desplegar juntas las migraciones y `pb_hooks` versionados.
- Confirmar PocketBase operativo, HTTPS correcto y un backup reciente.
- Usar un curso de prueba del ciclo vigente con materias, criterios, escala y al menos dos alumnos activos.
- Mantener una sesión institucional abierta y usar una ventana privada para la docente.
- Registrar curso, período, instancia, revisión y prefijo de cada credencial. No registrar secretos completos.

## Última verificación técnica

El 15 de septiembre de 2026 se desplegaron en el VPS las migraciones unidireccionales, de recuperación cifrada y de eliminación del estado propio del enlace, siempre con backup previo. Se verificaron el health check, el selector limitado a `BORRADOR_DOCENTE` y `CONTROL_DIRECTIVO`, la ausencia de `cerrado_at`, `cerrado_por` y `activo`, el índice único de llave por curso y período, cero alcances duplicados y respuestas `404` en las rutas retiradas. El recorrido funcional de interfaz y la matriz de concurrencia permanecen como siguiente prueba de regresión.

## Matriz funcional

### 1. Apertura de la instancia

1. Seleccionar un curso y bimestre sin instancia.
2. Confirmar que el editor institucional no se renderiza.
3. Emitir un enlace de curso completo.
4. Confirmar `BORRADOR_DOCENTE`, revisión inicial y una sola llave para el alcance.
5. Confirmar que no existe selector de materia.

### 2. Guardado progresivo

1. Abrir el enlace en una ventana privada.
2. Completar parcialmente un alumno y guardar.
3. Recargar y comprobar que el avance persiste.
4. Completar otro bloque en una sesión posterior.
5. Confirmar que cada guardado incrementa la revisión sin exigir completar el curso.
6. Eliminar la credencial y confirmar que el curso aparece `Pausado`, conserva las respuestas y ofrece `Reanudar`.
7. Emitir un enlace nuevo y confirmar que reaparece `En progreso` con el avance anterior.
8. Copiar nuevamente el mismo enlace desde el gestor y confirmar que el secreto no cambia y que ambos accesos apuntan al mismo borrador.
9. Regenerar la llave, comprobar que el enlace anterior recibe `401` y que el nuevo conserva el mismo avance.
10. Confirmar que el gestor no muestra un interruptor activo/inactivo.

### 3. Exclusión del equipo directivo

1. Consultar el mismo curso y bimestre desde la aplicación.
2. Confirmar que se informa `Carga docente en curso` y no aparece el editor.
3. Intentar el endpoint de guardado institucional durante el borrador y comprobar `403`.
4. Intentar escribir directamente evaluaciones y cierres con una sesión autenticada y comprobar el rechazo de las reglas.

### 4. Envío incompleto

1. Intentar enviar el bimestre con datos pendientes.
2. Confirmar `422`, detalle de pendientes y permanencia en `BORRADOR_DOCENTE`.
3. Confirmar que el enlace continúa vigente después del rechazo.

### 5. Transferencia a dirección

1. Completar todas las materias, criterios y cierres de los alumnos activos.
2. Guardar cualquier cambio pendiente y enviar el bimestre.
3. Confirmar `CONTROL_DIRECTIVO`, fecha, docente y revisión incrementada.
4. Confirmar que la llave queda eliminada y que las solicitudes posteriores reciben `401` o `403`.
5. Actualizar la pantalla institucional y comprobar que aparece la revisión.

### 6. Corrección institucional

1. Confirmar que las respuestas se presentan como texto y no como controles editables.
2. Habilitar una materia, modificar una calificación y guardar dentro de su tarjeta.
3. Confirmar que no puede editarse una segunda materia al mismo tiempo.
4. Recargar y confirmar persistencia e incremento de revisión.
5. Forzar un dato inválido y comprobar que la transacción no deja bloques parciales.

### 7. Irreversibilidad

1. Confirmar que no aparecen acciones para solicitar correcciones, cerrar o reabrir el bimestre.
2. Comprobar que las antiguas rutas institucionales de transición y devolución responden `404`.
3. Intentar emitir una llave para el alcance entregado y comprobar que el gateway la rechaza.
4. Consultar el antiguo endpoint `PATCH /api/cys/enlaces-docentes/:tokenId/estado` y comprobar `404`.
5. Confirmar que el único estado posterior al envío es `CONTROL_DIRECTIVO`.

### 8. Compatibilidad de migración

1. Aplicar la migración sobre una copia que contenga una instancia histórica `CERRADO`.
2. Confirmar que queda en `CONTROL_DIRECTIVO` con revisión incrementada.
3. Confirmar que el selector de estado sólo admite `BORRADOR_DOCENTE` y `CONTROL_DIRECTIVO`.
4. Confirmar que `cerrado_at` y `cerrado_por` ya no existen.
5. Confirmar que `tokens_acceso_docente` no contiene `activo` y sí el índice único `idx_tokens_acceso_docente_scope`.

## Matriz de concurrencia

- Ejecutar un guardado docente al mismo tiempo que el envío. La serialización debe incluirlo antes de transferir o rechazarlo después, nunca aceptarlo en `CONTROL_DIRECTIVO`.
- Intentar un guardado institucional mientras la instancia está en borrador y confirmar el rechazo aunque la interfaz estuviera desactualizada.
- Mantener dos pestañas docentes abiertas, completar el envío desde una y comprobar que la siguiente lectura o escritura de la otra revalida la credencial.
- Mantener dos sesiones institucionales editando materias diferentes y comprobar que un conflicto no deja una escritura parcial.

## Criterio de aprobación

El workflow queda aprobado cuando el envío conserva todos los datos, invalida definitivamente el acceso docente, nunca existen dos roles con escritura simultánea, las rutas obsoletas no están disponibles y ningún fallo transaccional deja información parcial.
