# Acceso docente por enlace mágico

## Decisión arquitectónica

La carga institucional y la carga docente comparten un único editor de boletín, `VistaPorAlumno`. No deben existir dos copias del formulario porque criterios, escalas, cálculo de avance y persistencia académica representan el mismo dominio y deben evolucionar juntos.

La bifurcación se resuelve en los bordes:

- La ruta institucional aporta un tablero unificado por curso y período, navegación privada y una política de acceso completa.
- La ruta pública valida el enlace, construye el contexto permitido y aporta una política de acceso docente.
- `GradebookAccessPolicy` declara capacidades; el editor no infiere permisos a partir de la URL ni de la presencia de una sesión.
- `accesoDocenteService` es el único responsable frontend de crear, listar, regenerar, recuperar, eliminar y validar enlaces.

## Alcance único

Cada enlace docente representa la carga completa de un curso y un período escolar. Incluye todas las materias, apoyos del alumno, asistencia y cierre. No se emiten accesos por materia porque la docente de grado es responsable de completar el bimestre como una unidad.

`materia_id` permanece físicamente en `tokens_acceso_docente` como deuda de compatibilidad de esquema. El gateway rechaza los enlaces legados que tengan ese campo informado y también rechaza intentos de emitir nuevos enlaces con `materiaId`. El campo no forma parte del contrato vigente y podrá retirarse en una migración posterior independiente.

El guardado persiste las materias y los apoyos modificados; el cierre numérico del alumno acompaña cada operación docente. Durante la etapa de borrador seguirá permitiendo que la docente avance en sesiones breves sin enviar el curso completo.

En el acceso docente, cada calificación seleccionada se presenta como un valor informativo con una acción `Modificar`; los campos todavía pendientes conservan el selector. Una materia modificada sólo puede guardarse cuando contiene todos sus criterios y, excepto en las materias formativas identificadas como conducta, la calificación general. El cierre del alumno acompaña cada guardado con asistencias, inasistencias y llegadas tarde numéricas; cero es un valor válido y observaciones es el único campo opcional de ese bloque.

Los datos anuales de integración se editan desde el boletín, pero pertenecen a la cursada. `posee_apoyos` se habilita en el primer bimestre y `promociono_con_acompanamiento` en el cuarto; cada selector activo usa `NO` como valor inicial y sólo admite `SI` o `NO`. Cuando `posee_apoyos` es `SI`, el detalle `cuales_apoyos` es obligatorio y el guardado se rechaza si está vacío. El editor incluye estos datos en cada guardado del bimestre correspondiente y el envío final normaliza registros históricos sin especificar a `NO` antes de transferir el control.

La emisión y la rotación muestran el enlace en una ventana de resultado. Mientras sea la llave vigente, dirección también puede recuperar el mismo secreto para copiarlo o compartirlo sin rotación.

Antes de guardar desde una sesión docente se vuelve a validar el enlace. Si fue reemplazado, eliminado o perdió el control por la entrega, el frontend descarta la operación y muestra que el acceso ya no está disponible. Los enlaces no tienen vencimiento calendario ni estado activo/inactivo.

### Ciclo de vida de la llave

| Operación | Efecto sobre la llave | Efecto sobre el borrador |
| --- | --- | --- |
| Copiar o compartir | Recupera el mismo secreto vigente; no crea ni rota registros | Ninguno |
| Regenerar | Sustituye el secreto del registro e invalida inmediatamente el enlace anterior | Conserva todo el avance |
| Emitir para un alcance que ya tiene llave | Elimina la llave anterior y crea una nueva dentro de la misma transacción | Conserva todo el avance |
| Eliminar | Elimina el registro y corta el acceso docente | Conserva el avance y el tablero deriva `Pausado` si existen respuestas |
| Entregar | Elimina la llave al transferir atómicamente a `CONTROL_DIRECTIVO` | Conserva las respuestas bajo control institucional |

`tokens_acceso_docente` no contiene `activo`, fecha de vencimiento ni una máquina de estados propia. Un índice único sobre `curso_id + periodo_id` refuerza en la base que sólo haya una llave. La existencia del registro, la coincidencia del hash y `BORRADOR_DOCENTE` son las tres condiciones de acceso.

## Frontera de seguridad

El gateway docente valida existencia, secreto, workflow y alcance en cada lectura y escritura. La ruta `/carga` está implementada para consumir únicamente ese gateway mediante `GradebookDataSource`; nunca consulta colecciones académicas directamente. La migración final cierra las reglas anónimas generales y convierte los secretos legados a hash.

El hash continúa siendo la fuente de validación pública. Una copia AES-256-GCM permite la recuperación operativa exclusivamente mediante sesión institucional y una clave de 32 caracteres almacenada fuera del repositorio en el VPS. Una filtración aislada de la base no revela los enlaces reutilizables.

El código completo fue validado contra PocketBase 0.22.17 en una copia aislada. Las migraciones de endurecimiento y workflow están aplicadas en el VPS; la simplificación unidireccional y la eliminación del estado propio del enlace se desplegaron el 15 de septiembre de 2026. Las verificaciones remotas confirmaron el esquema de dos estados del workflow, la ausencia de `activo`, la unicidad de la llave por alcance y la eliminación de las rutas obsoletas.

La estrategia de migración y las operaciones manuales del VPS se detallan en `docs/pocketbase-magic-link-hardening.md`.

## Contrato para próximas mejoras

- Mantener un solo editor y extraer piezas internas reutilizables cuando la densidad visual lo requiera.
- Mantener shells separados para el equipo directivo y las docentes.
- No incorporar condiciones visuales dispersas del tipo `esPublico`; toda diferencia funcional debe provenir de la política de acceso.
- No confiar en filtros de interfaz para autorizar escrituras.
- El reemplazo o eliminación de la llave debe impedir el siguiente guardado aun cuando la página ya estuviera abierta.
- Un enlace siempre debe cubrir exactamente un curso y un período escolar completos.
- No convertir un enlace legado por materia en acceso de curso: debe permanecer rechazado hasta ser reemplazado.
- Mantener seguimiento, gestión de enlaces y revisión dentro de `Carga de notas`; no reintroducir una sección institucional de monitoreo separada.

## Workflow vigente

La carga usa una instancia única por curso y período con transferencia explícita de control:

1. `BORRADOR_DOCENTE`: permite guardados parciales mediante el enlace y mantiene oculto el editor institucional para evitar concurrencia.
2. `CONTROL_DIRECTIVO`: se alcanza mediante un envío completo y atómico, elimina el acceso docente y habilita de forma terminal la revisión y edición institucional.

Las calificaciones continúan en las colecciones académicas vigentes. El envío final valida integridad y cambia el estado de la instancia en una transacción; no duplica ni vuelve a copiar todas las respuestas.

## Persistencia y exclusión mutua

`instancias_carga_boletin` contiene una fila única por `curso_id + periodo_id`, protegida para lectura institucional y sin escritura directa desde el cliente. Al emitir el primer enlace se crea en `BORRADOR_DOCENTE`; los enlaces existentes reciben su instancia durante la migración.

Cada guardado docente comprueba el estado dentro de la misma transacción e incrementa `revision`. Sólo puede existir una llave por curso y período; emitir una nueva elimina la anterior y rotar reemplaza el secreto del mismo registro.

Eliminar la última credencial no elimina respuestas ni la instancia. Si el borrador contiene datos, el tablero lo clasifica como `Pausado` y ofrece `Reanudar`; un enlace nuevo recupera el mismo avance. `Completado` se reserva para instancias entregadas en `CONTROL_DIRECTIVO`, aunque un borrador haya alcanzado localmente el 100 %.

Esta base está desplegada y validada contra PocketBase 0.22.17. La comprobación del estado ocurre dentro de la misma transacción que cada escritura, de modo que una interfaz desactualizada no puede conservar el control después de una transición.

## Envío docente implementado

La docente ve una única acción `Enviar bimestre completo`, habilitada cuando el progreso local informa que todos los alumnos están completos y no existen cambios sin guardar. Una confirmación explica que la acción transfiere el control y cierra el acceso.

El servidor vuelve a calcular la completitud usando alumnos activos del ciclo lectivo del período, todas las materias y criterios configurados y el cierre de cada alumno. Si encuentra diferencias responde con los pendientes y mantiene `BORRADOR_DOCENTE`. Si la validación es correcta, el cambio a `CONTROL_DIRECTIVO`, la auditoría mínima y la eliminación de la llave ocurren atómicamente.

Después del envío la sesión actual muestra un comprobante y cualquier lectura o escritura posterior con el enlace queda rechazada.

## Control institucional implementado

La pantalla institucional comienza con una selección explícita de bimestre. Ese período permanece fijo durante el tablero, la gestión del curso y la revisión; no se ofrece un selector persistente para cambiarlo y la acción `Cambiar bimestre` vuelve al inicio del flujo. El curso también se elige desde el tablero y queda fijo durante su revisión: la pantalla interior no ofrece selectores divergentes ni acceso al gestor de enlaces, muestra una única cabecera destacada con curso, turno y bimestre, y exige volver al tablero para cambiar de curso. Después consulta la instancia del curso seleccionado. Sin instancia indica volver al tablero; en `BORRADOR_DOCENTE` muestra el estado del proceso sin un segundo formulario; en `CONTROL_DIRECTIVO` abre primero un resumen del curso para que dirección elija explícitamente un alumno y recién entonces monta su libreta. El regreso institucional se ofrece en una única ubicación del encabezado y siempre retrocede una etapa: desde la libreta vuelve al listado del curso y desde el listado vuelve al tablero. En la libreta directiva el alumno actual es informativo, sin selector ni acceso a la Guía del Curso; los únicos cambios rápidos de alumno son `Anterior` y `Siguiente`. El formulario docente por enlace conserva su selector de alumnos y la Guía del Curso. El detalle presenta las respuestas como texto y habilita editores atómicos para cada materia, para la integración escolar del bimestre habilitado y para el cierre compuesto por asistencias y observaciones. Sólo una sección puede desbloquearse por vez y sus acciones `Guardar` y `Descartar` permanecen junto al bloque editado.

Las escrituras institucionales de notas y cierre pasan por un único endpoint transaccional. El servidor vuelve a comprobar `CONTROL_DIRECTIVO`, la pertenencia del alumno al curso y ciclo y el alcance de materias, criterios y escala. Las colecciones `evaluaciones_materia`, `evaluaciones_criterios` y `cierres_periodo_alumno` quedan sin creación, actualización ni eliminación directa por API, incluso para sesiones autenticadas.

Los apoyos anuales continúan físicamente en `inscripciones`, pero toda modificación realizada desde la planilla se incluye en la misma transacción institucional. El resto de los flujos de matrícula conserva su acceso autenticado porque administra otros campos de la inscripción.

## Transferencia unidireccional

`CONTROL_DIRECTIVO` no tiene transición de salida. Una vez aceptado el envío, el servidor elimina la llave del alcance y ninguna operación institucional puede devolver la instancia a `BORRADOR_DOCENTE`, crear un acceso correctivo ni cerrar o reabrir el bimestre. Toda modificación posterior pertenece exclusivamente al equipo directivo.

## Aceptación

La migración se validó sobre una copia aislada con una instancia histórica `CERRADO` y después se desplegó con backup. El recorrido funcional debe seguir validando que un envío incompleto devuelve `422` sin perder el borrador, que el guardado progresivo persiste, que el curso completo pasa a `CONTROL_DIRECTIVO`, que la llave queda eliminada y que dirección puede revisar y corregir sin que exista una ruta de regreso al acceso docente.

La matriz reproducible y las pruebas de concurrencia pendientes de automatización están en `docs/gradebook-workflow-test-plan.md`.

Después de la entrega, las sesiones institucionales comparten el control pero no escriben a ciegas. Cada libreta se lee mediante un gateway que devuelve materias, PPI, integración, cierre y revisión desde una misma transacción. Cada corrección lleva esa revisión, el gateway la compara dentro de la transacción y rechaza versiones vencidas sin modificar datos. Realtime invalida el tablero, el resumen y el detalle; Zustand nunca acepta una revisión menor. Si existe una edición local, la interfaz la conserva y exige cargar la versión actual. Un resultado de red incierto también bloquea nuevos guardados hasta reconciliar la instantánea confirmada. El protocolo general está en `docs/concurrency-model.md`.
