# Acceso docente por enlace mágico

## Decisión arquitectónica

La carga institucional y la carga docente comparten un único editor de boletín, `VistaPorAlumno`. No deben existir dos copias del formulario porque criterios, escalas, cálculo de avance y persistencia académica representan el mismo dominio y deben evolucionar juntos.

La bifurcación se resuelve en los bordes:

- La ruta institucional aporta un tablero unificado por curso y período, navegación privada y una política de acceso completa.
- La ruta pública valida el enlace, construye el contexto permitido y aporta una política de acceso docente.
- `GradebookAccessPolicy` declara capacidades; el editor no infiere permisos a partir de la URL ni de la presencia de una sesión.
- `accesoDocenteService` es el único responsable frontend de crear, listar, activar, revocar, eliminar y validar enlaces.

## Alcance único

Cada enlace docente representa la carga completa de un curso y un período escolar. Incluye todas las materias, apoyos del alumno, asistencia y cierre. No se emiten accesos por materia porque la docente de grado es responsable de completar el bimestre como una unidad.

`materia_id` permanece físicamente en `tokens_acceso_docente` como deuda de compatibilidad de esquema. El gateway rechaza los enlaces legados que tengan ese campo informado y también rechaza intentos de emitir nuevos enlaces con `materiaId`. El campo no forma parte del contrato vigente y podrá retirarse en una migración posterior independiente.

El guardado persiste únicamente los bloques modificados. Durante la etapa de borrador seguirá permitiendo que la docente avance en sesiones breves sin enviar el curso completo.

La emisión y la rotación muestran el enlace en una ventana de resultado además de intentar copiarlo, evitando perder el secreto por una falsa confirmación del portapapeles.

Antes de guardar desde una sesión docente se vuelve a validar el enlace. Si fue desactivado, eliminado o perdió el control por la entrega, el frontend descarta la operación y muestra que el acceso ya no está disponible. Los enlaces no tienen vencimiento calendario.

## Frontera de seguridad

El gateway docente valida vigencia, revocación y alcance en cada lectura y escritura. La ruta `/carga` está implementada para consumir únicamente ese gateway mediante `GradebookDataSource`; nunca consulta colecciones académicas directamente. La migración final cierra las reglas anónimas generales y convierte los secretos legados a hash.

El código completo fue validado contra PocketBase 0.22.17 en una copia aislada. Las migraciones de endurecimiento y workflow están aplicadas en el VPS; la simplificación unidireccional se desplegó el 15 de septiembre de 2026. Las verificaciones remotas confirmaron el esquema de dos estados, la ausencia de campos de cierre y la eliminación de las rutas institucionales de retorno.

La estrategia de migración y las operaciones manuales del VPS se detallan en `docs/pocketbase-magic-link-hardening.md`.

## Contrato para próximas mejoras

- Mantener un solo editor y extraer piezas internas reutilizables cuando la densidad visual lo requiera.
- Mantener shells separados para el equipo directivo y las docentes.
- No incorporar condiciones visuales dispersas del tipo `esPublico`; toda diferencia funcional debe provenir de la política de acceso.
- No confiar en filtros de interfaz para autorizar escrituras.
- La revocación debe impedir el siguiente guardado aun cuando la página ya estuviera abierta.
- Un enlace siempre debe cubrir exactamente un curso y un período escolar completos.
- No convertir un enlace legado por materia en acceso de curso: debe permanecer rechazado hasta ser reemplazado.
- Mantener seguimiento, gestión de enlaces y revisión dentro de `Carga de notas`; no reintroducir una sección institucional de monitoreo separada.

## Workflow vigente

La carga usa una instancia única por curso y período con transferencia explícita de control:

1. `BORRADOR_DOCENTE`: permite guardados parciales mediante el enlace y mantiene oculto el editor institucional para evitar concurrencia.
2. `CONTROL_DIRECTIVO`: se alcanza mediante un envío completo y atómico, revoca el acceso docente y habilita de forma terminal la revisión y edición institucional.

Las calificaciones continúan en las colecciones académicas vigentes. El envío final valida integridad y cambia el estado de la instancia en una transacción; no duplica ni vuelve a copiar todas las respuestas.

## Persistencia y exclusión mutua

`instancias_carga_boletin` contiene una fila única por `curso_id + periodo_id`, protegida para lectura institucional y sin escritura directa desde el cliente. Al emitir el primer enlace se crea en `BORRADOR_DOCENTE`; los enlaces existentes reciben su instancia durante la migración.

Cada guardado docente comprueba el estado dentro de la misma transacción e incrementa `revision`. Emitir, rotar o reactivar una credencial desactiva las demás credenciales del mismo curso y período.

Eliminar la última credencial no elimina respuestas ni la instancia. Si el borrador contiene datos, el tablero lo clasifica como `Pausado` y ofrece `Reanudar`; un enlace nuevo recupera el mismo avance. `Completado` se reserva para instancias entregadas en `CONTROL_DIRECTIVO`, aunque un borrador haya alcanzado localmente el 100 %.

Esta base está desplegada y validada contra PocketBase 0.22.17. La comprobación del estado ocurre dentro de la misma transacción que cada escritura, de modo que una interfaz desactualizada no puede conservar el control después de una transición.

## Envío docente implementado

La docente ve una única acción `Enviar bimestre completo`, habilitada cuando el progreso local informa que todos los alumnos están completos y no existen cambios sin guardar. Una confirmación explica que la acción transfiere el control y cierra el acceso.

El servidor vuelve a calcular la completitud usando alumnos activos del ciclo lectivo del período, todas las materias y criterios configurados y el cierre de cada alumno. Si encuentra diferencias responde con los pendientes y mantiene `BORRADOR_DOCENTE`. Si la validación es correcta, el cambio a `CONTROL_DIRECTIVO`, la auditoría mínima y la revocación de credenciales ocurren atómicamente.

Después del envío la sesión actual muestra un comprobante y cualquier lectura o escritura posterior con el enlace queda rechazada.

## Control institucional implementado

La pantalla institucional consulta la instancia del curso y bimestre antes de montar la revisión. Sin instancia ofrece iniciar la carga mediante un enlace; en `BORRADOR_DOCENTE` muestra el estado del proceso sin un segundo formulario; en `CONTROL_DIRECTIVO` presenta las respuestas como texto y habilita la edición atómica desde cada materia. Sólo una materia puede desbloquearse por vez y sus acciones `Guardar` y `Descartar` permanecen dentro de su tarjeta.

Las escrituras institucionales de notas y cierre pasan por un único endpoint transaccional. El servidor vuelve a comprobar `CONTROL_DIRECTIVO`, la pertenencia del alumno al curso y ciclo y el alcance de materias, criterios y escala. Las colecciones `evaluaciones_materia`, `evaluaciones_criterios` y `cierres_periodo_alumno` quedan sin creación, actualización ni eliminación directa por API, incluso para sesiones autenticadas.

Los apoyos anuales continúan físicamente en `inscripciones`, pero toda modificación realizada desde la planilla se incluye en la misma transacción institucional. El resto de los flujos de matrícula conserva su acceso autenticado porque administra otros campos de la inscripción.

## Transferencia unidireccional

`CONTROL_DIRECTIVO` no tiene transición de salida. Una vez aceptado el envío, el servidor invalida las credenciales del alcance y ninguna operación institucional puede devolver la instancia a `BORRADOR_DOCENTE`, crear un acceso correctivo ni cerrar o reabrir el bimestre. Toda modificación posterior pertenece exclusivamente al equipo directivo.

## Aceptación

La migración se validó sobre una copia aislada con una instancia histórica `CERRADO` y después se desplegó con backup. El recorrido funcional debe seguir validando que un envío incompleto devuelve `422` sin perder el borrador, que el guardado progresivo persiste, que el curso completo pasa a `CONTROL_DIRECTIVO`, que el enlace queda revocado y que dirección puede revisar y corregir sin que exista una ruta de regreso al acceso docente.

La matriz reproducible y las pruebas de concurrencia pendientes de automatización están en `docs/gradebook-workflow-test-plan.md`.
