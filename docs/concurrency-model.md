# Modelo de concurrencia multiusuario

## Propósito

Este documento define el patrón obligatorio para operaciones mutables de Crecer y Ser. La primera aplicación es la corrección directiva de boletines, pero el protocolo debe evaluarse en cada feature que permita a más de una sesión leer y modificar el mismo agregado.

## Principios

1. PocketBase es la autoridad de consistencia. Zustand coordina la experiencia local, pero nunca decide si una escritura es válida.
2. Toda operación que modifica varios registros relacionados pasa por un gateway y una única transacción.
3. Las escrituras usan concurrencia optimista mediante una revisión monotónica del agregado.
4. Realtime es una señal de invalidación y actualización de interfaz, no una garantía de exclusión ni un reemplazo de la precondición del servidor.
5. Una respuesta de conflicto nunca se reintenta automáticamente. El usuario debe conocer el cambio remoto y partir de una lectura actual.
6. Los datos locales sin guardar nunca se reemplazan silenciosamente por un evento remoto.

## Agregado de boletines

La unidad de consistencia inicial es la instancia de curso y período representada por `instancias_carga_boletin`. Su campo `revision` cambia después de cada guardado docente, entrega o corrección directiva confirmada.

La granularidad es deliberadamente conservadora: dos correcciones concurrentes dentro del mismo curso y período compiten por la misma revisión aunque afecten alumnos o materias diferentes. Esto evita actualizaciones perdidas y simplifica la integridad entre calificaciones, criterios, apoyos, cierres y resúmenes. Si el uso real muestra conflictos frecuentes sobre datos independientes, la granularidad podrá reducirse mediante revisiones por alumno o bloque, manteniendo el mismo protocolo.

## Protocolo de escritura directiva

1. El cliente lee la instancia y conserva `revision` como versión base.
2. El formulario envía `expectedRevision` junto con los bloques modificados.
3. Dentro de la transacción, PocketBase vuelve a validar autenticación, estado `CONTROL_DIRECTIVO`, alcance y versión.
4. Si `expectedRevision` no coincide, el gateway responde `409` antes de modificar cualquier registro.
5. Si coincide, el gateway guarda todos los bloques, incrementa `revision` y devuelve la instancia resultante.
6. El cliente adopta la nueva revisión sólo después de la confirmación del servidor.

El chequeo y la escritura deben permanecer dentro de la misma transacción. Una comparación hecha únicamente en el navegador o antes de abrir la transacción presenta una ventana de carrera.

## Sincronización en el frontend

PocketBase Realtime publica cambios de `instancias_carga_boletin`. El store de concurrencia de Zustand conserva la última versión observada por curso y período y un contador de invalidación por período.

- El tablero de cursos vuelve a consultar sus resúmenes cuando cambia una instancia del período visible.
- La planilla adopta la nueva revisión y recalcula el resumen de alumnos.
- Si el alumno visible no tiene cambios locales, el detalle se vuelve a leer.
- Si existe una materia en edición o cambios locales, se marca conflicto y se bloquea el guardado. La interfaz conserva el borrador local hasta que la persona decide cargar la versión actual.
- Aunque Realtime llegue tarde, se desconecte o se pierda, `expectedRevision` mantiene la integridad en el servidor.

Zustand no replica la base completa ni mezcla respuestas optimistas. Almacena metadatos de coherencia; los datos académicos se vuelven a obtener desde PocketBase.

## Resúmenes y datos derivados

Los porcentajes y estados de curso no se escriben como una segunda fuente de verdad. Se calculan desde evaluaciones, criterios y cierres confirmados. El cambio de revisión invalida tanto el detalle como sus proyecciones para impedir que una pantalla continúe mostrando un resumen anterior después de una corrección realizada por otra sesión.

Una actualización visual inmediata posterior al guardado puede mejorar la respuesta percibida, pero siempre debe quedar respaldada por una relectura o invalidación basada en la revisión confirmada.

## Tratamiento de errores

- `400`: contrato o referencias inválidas; corregir la solicitud.
- `401` o `403`: retirar la capacidad de edición y volver a validar sesión o workflow.
- `409`: no se escribió nada; conservar el borrador local, informar el conflicto y exigir una lectura actual antes de otro guardado.
- Fallo de red o `5xx`: el resultado puede ser incierto; consultar la revisión y el estado antes de permitir repetir una operación no idempotente.

## Lista de diseño para nuevas features

Antes de implementar una escritura multiusuario se debe definir:

1. El agregado que debe mantenerse consistente.
2. La revisión o precondición que identifica la versión leída.
3. El gateway que valida alcance, versión e invariantes dentro de una transacción.
4. Qué evento realtime invalida cada detalle, lista y resumen derivado.
5. Qué estado mínimo conserva Zustand y cómo se descarta al cambiar de alcance o sesión.
6. La política para datos locales pendientes frente a cambios remotos.
7. La semántica de `409`, errores inciertos e idempotencia.
8. Las pruebas con dos sesiones, incluyendo escrituras simultáneas, eventos retrasados y reconexión.

No se considera resuelta la concurrencia sólo por usar Realtime, deshabilitar botones en una pestaña o actualizar Zustand. La aprobación requiere una precondición autoritativa en el servidor y una prueba que demuestre ausencia de actualizaciones perdidas.

## Evolución prevista

La siguiente capa, cuando el producto requiera trazabilidad, es una colección de auditoría escrita en la misma transacción con usuario, agregado, revisión anterior, revisión nueva, fecha y tipo de operación. No debe guardar secretos ni duplicar el contenido académico completo.
