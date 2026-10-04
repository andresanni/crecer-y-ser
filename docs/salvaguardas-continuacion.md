# Continuación de salvaguardas — 4 de octubre de 2026

El usuario pidió terminar sólo la operación interrumpida y entregar el trabajo a otro asistente por límites semanales. No iniciar nuevas restauraciones ni cargas históricas sin su instrucción.

## Resultado verificado

- Salvaguardas publicadas. Hito histórico: B1 completo (83 visados), B2 vacío.
- La inscripción pendiente de Shantall fue creada en 2.º grado, ciclo 2026, estado Regular, ingreso administrativo confirmado por el usuario el 08/06/2026. Ahora está CONFIRMADA con rango B2–B4 y revisión 1. No necesita B1. Segundo grado conserva 10 visados de B1 y tiene 10 alumnos evaluables en B2; B2 tiene cero evaluaciones.
- La ficha completa de Shantall coincide con el respaldo del hito, excluyendo únicamente updated. El alcance B2–B4 ya estaba confirmado al reanudar: se verificó y no se volvió a guardar.
- El usuario viene confirmando manualmente los rangos: confirmó los regulares de 1.º y 2.º para B1–B4. No reutilizar el conteo antiguo de 81 pendientes como estado actual.

## Corrección resuelta del formulario segmentado

El fallo por el cual asignar curso desde la pestaña Inscripción de AlumnoFormModal dejaba vacíos campos no montados (`fecha_nacimiento`, `nacionalidad`, `sexo`, `domicilio`, `localidad`, `usuario_acadeu`, `clave_acadeu`) fue resuelto en código:
1. En `AlumnoFormModal.tsx`: se incorporó `forceRender: true` en todas las pestañas de edición (`alumno`, `inscripcion`, `responsable`) para garantizar el montaje inmediato y registro de todos los campos en el almacén del formulario Ant Design, se fusionó `form.getFieldsValue(true)` en `handleOk`, y se deshabilitó el guardado mientras cargan metadatos o responsables.
2. En `AlumnoList.tsx`: `handleSubmit` ahora cuenta con salvaguarda defensiva donde cualquier campo omitido o no modificado (`undefined`) preserva estrictamente el valor preexistente en `editingAlumno`, tanto para datos personales como de cursada/inscripción.
3. Se expuso el estado de cursada (`cursadaEstado`, `bimestreDesde`, `bimestreHasta`) en el modelo `Alumno` y se añadieron insignias de estado en la tabla, vista de tarjetas y formulario de alumnos.
4. La solución fue validada mediante `npm run lint`, `npm run build` y las suites de pruebas automatizadas aisladas (`test-evaluable-scope-http.cjs`, `test-document-adapter.cjs`, `test-batch-modal.cjs`, `test-school-calendar-dates.cjs`).

## Contexto para seguir

- Falta restaurar las otras dos altas tardías de 4.º, sólo cuando el usuario lo pida. Payloads históricos no son autoridad: contenían IDs y DNI incorrectos. Releer producción y confirmar fechas/rangos.
- Cuatro DNI faltantes bloquean sólo sus PDFs; notas y visados permanecen. El render de B4 sigue bloqueado por fuentes anuales pendientes.
- Base normal C:/pocketbase/pb_data vaciada y detenida intencionalmente: mantener intacta y usar pruebas temporales sintéticas.
- Respaldo del hito: /root/pb/milestones/20261003-b1-completo-b2-vacio. Tag: hito-b1-completo-2026-10-03.
- La sesión institucional estaba abierta en el navegador integrado; no extraer tokens ni credenciales. Las escrituras académicas deben pasar por gateways.
- Documentación funcional: docs/gradebook-pdf-emission.md, docs/pocketbase-api.md y docs/gradebook-workflow-test-plan.md.
- Rama dev limpia antes de este reporte; master y dev sincronizados en 72d609f. ux_ui_tweaks sincronizada con su remoto e incluye master, pero conserva cambios visuales separados de producción. Este reporte se guarda en dev como documentación; no hay despliegue nuevo.
