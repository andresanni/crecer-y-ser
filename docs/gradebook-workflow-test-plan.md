# Plan de pruebas del workflow de boletines

## Objetivo

Validar en conjunto la persistencia progresiva docente, la transferencia exclusiva de control, la corrección institucional, la devolución a docente y el cierre del bimestre sin exponer las colecciones académicas a escrituras directas.

## Preparación

- Desplegar juntos `pb_migrations/1789342800_created_gradebook_workflows.js` y `pb_hooks`.
- Confirmar PocketBase activo, HTTPS correcto y un backup reciente.
- Usar un curso de prueba del ciclo vigente con materias, criterios, escala y al menos dos alumnos activos.
- Mantener una sesión institucional abierta y usar una ventana privada para la docente.
- Registrar el curso, período, instancia, revisión y prefijo de cada credencial utilizada. No registrar secretos completos.

## Última ejecución

El 14 de septiembre de 2026 se ejecutó el recorrido funcional completo contra el VPS con datos descartables. Quedaron verificados el rechazo `422` con cinco alumnos pendientes, el guardado progresivo, la completitud de cinco alumnos y diez materias, la transferencia a `CONTROL_DIRECTIVO`, la revocación del enlace, la edición institucional, el cierre y la reapertura, la devolución con rotación, el reingreso docente y el segundo envío. La ejecución terminó en `CONTROL_DIRECTIVO`, revisión 11, sin credenciales activas para el alcance probado, y la interfaz informó 100 % de avance para los cinco alumnos.

La matriz de concurrencia debe repetirse como prueba de regresión y automatizarse. El recorrido manual confirma las revalidaciones posteriores a cada transición, pero no sustituye todavía pruebas de carrera simultánea ni inyección de fallos transaccionales.

## Matriz funcional

### 1. Apertura de la instancia

1. Seleccionar un curso y bimestre sin instancia.
2. Confirmar que el editor institucional no se renderiza.
3. Emitir un enlace de curso completo.
4. Confirmar `BORRADOR_DOCENTE`, revisión inicial y una sola credencial activa.
5. Confirmar que no existe selector de materia.

### 2. Guardado progresivo

1. Abrir el enlace en una ventana privada.
2. Completar parcialmente un alumno y guardar.
3. Recargar y comprobar que el avance persiste.
4. Completar otro bloque en una sesión posterior.
5. Confirmar que cada guardado incrementa la revisión sin exigir completar el curso.

### 3. Exclusión del equipo directivo

1. Consultar el mismo curso y bimestre desde la aplicación.
2. Confirmar que se informa `Carga docente en curso` y no aparece el editor.
3. Intentar el endpoint de guardado institucional durante el borrador y comprobar `403`.
4. Intentar crear, actualizar y eliminar directamente evaluaciones y cierres con una sesión autenticada y comprobar el rechazo de las reglas.

### 4. Envío incompleto

1. Intentar enviar el bimestre con datos pendientes.
2. Confirmar `422`, detalle de alumnos o materias pendientes y permanencia en `BORRADOR_DOCENTE`.
3. Confirmar que el enlace continúa vigente después del rechazo.

### 5. Transferencia a dirección

1. Completar todas las materias, criterios y cierres de los alumnos activos.
2. Guardar cualquier cambio pendiente y enviar el bimestre.
3. Confirmar `CONTROL_DIRECTIVO`, fecha, docente y revisión incrementada.
4. Confirmar que el enlace queda revocado y las solicitudes posteriores reciben `401` o `403`.
5. Actualizar la pantalla institucional y comprobar que el editor se habilita con los datos enviados.

### 6. Corrección institucional

1. Modificar una calificación y un cierre desde la aplicación.
2. Guardar y recargar la ficha.
3. Confirmar persistencia conjunta e incremento de revisión.
4. Forzar un dato inválido en una solicitud controlada y comprobar que la transacción no deja bloques parciales.

### 7. Devolución a docente

1. Elegir `Solicitar correcciones` sin cambios locales pendientes.
2. Confirmar `BORRADOR_DOCENTE`, bloqueo inmediato del editor y entrega única de un enlace nuevo visible en una ventana aunque la copia automática al portapapeles falle.
3. Comprobar que todas las credenciales anteriores fallan.
4. Abrir el enlace nuevo, confirmar que conserva la carga previa, corregir y volver a enviar.
5. Confirmar el segundo traspaso a `CONTROL_DIRECTIVO`.

### 8. Cierre y reapertura

1. Cerrar el bimestre desde control directivo.
2. Confirmar `CERRADO`, auditoría de fecha y usuario y ausencia del editor.
3. Intentar guardados docentes e institucionales y comprobar su rechazo.
4. Reabrir la revisión.
5. Confirmar `CONTROL_DIRECTIVO`, editor institucional habilitado y ninguna credencial docente activa.

## Matriz de concurrencia

- Ejecutar un guardado docente al mismo tiempo que el envío. La serialización debe dejar el guardado incluido antes de transferir o rechazarlo después de la transferencia, nunca aceptarlo en `CONTROL_DIRECTIVO`.
- Intentar un guardado institucional mientras la instancia está en borrador y confirmar que el servidor lo rechaza aunque la interfaz estuviera desactualizada.
- Mantener dos pestañas docentes abiertas, revocar o devolver el control desde otra sesión y comprobar que el siguiente guardado revalida la credencial.
- Mantener el editor institucional abierto, cerrar la instancia desde otra sesión y comprobar que el siguiente guardado es rechazado por estado.

## Criterio de aprobación

El workflow se considera aprobado cuando todas las transiciones válidas conservan datos y auditoría, todas las transiciones inválidas son rechazadas, nunca existen dos roles con escritura simultánea y ningún fallo transaccional deja información parcial.
