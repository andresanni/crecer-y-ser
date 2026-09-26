# Contrato HTTP propio de PocketBase

## Principio de acceso

Las pantallas institucionales autenticadas leen las colecciones estándar mediante el SDK de PocketBase, excepto la instantánea editable de una libreta, que pasa por el gateway para asociar todos sus datos con una revisión coherente. Las escrituras de la planilla también pasan por el gateway para aplicar el workflow y una transacción única. La ruta pública `/carga` no consume colecciones: usa exclusivamente el gateway definido en `pb_hooks`.

La credencial docente viaja en `X-CYS-Teacher-Token`. Las respuestas del gateway llevan `Cache-Control: no-store`. PocketBase conserva SHA-256 para validación, un prefijo administrativo y una copia cifrada que sólo puede recuperar una sesión institucional.

## Ruta pública de contacto

### `POST /api/cys/contacto`

Recibe una consulta pública de la landing sin autenticación:

```json
{
  "nombre": "Persona de prueba",
  "email": "prueba@example.com",
  "telefono": "11 0000 0000",
  "nivel": "inicial",
  "mensaje": "Consulta sintética para validar el formulario.",
  "_hp": ""
}
```

`nombre`, `email`, `nivel` y `mensaje` son obligatorios. `nivel` admite `inicial` o `primario`; `telefono` es opcional y `_hp` es el honeypot del formulario. El cuerpo no puede superar 16 KB.

El servidor valida tipos y longitudes, escapa el contenido para HTML y envía el correo mediante la configuración SMTP privada de PocketBase. No persiste la consulta en colecciones. La limitación vigente admite cinco solicitudes cada diez minutos por IP y vive en memoria, por lo que se reinicia junto con el proceso. Loopback queda exceptuado para pruebas locales.

- `200`: el servidor aceptó y envió la consulta, o descartó silenciosamente un honeypot poblado.
- `400`: cuerpo o campos inválidos.
- `429`: límite temporal excedido.
- `500`: PocketBase no pudo despachar el correo.

El cliente sólo muestra éxito después de recibir `200`. Ante cualquier error conserva los campos para permitir un nuevo intento.

## Rutas docentes

### `GET /api/cys/docente/contexto`

Devuelve el alcance autorizado: referencia del acceso, instancia de carga, curso, período, materias, criterios, valores de escala y alumnos regulares. La instancia informa su identidad, estado, revisión y datos mínimos de envío. No devuelve DNI, legajo, credenciales escolares ni el secreto.

### `GET /api/cys/docente/alumnos/:inscripcionId`

Devuelve evaluaciones de todas las materias, cierre del período y apoyos del alumno dentro del curso autorizado.

### `PUT /api/cys/docente/alumnos/:inscripcionId`

Recibe únicamente bloques modificados:

```json
{
  "materias": [
    {
      "cursoMateriaId": "record_id",
      "ppi": false,
      "calificacionGeneralId": "record_id",
      "criterios": [
        {
          "criterioId": "record_id",
          "valorEscalaId": "record_id"
        }
      ]
    }
  ],
  "cierre": {
    "asistencias": 0,
    "inasistencias": 0,
    "llegadasTarde": 0,
    "observaciones": ""
  },
  "apoyos": {
    "promocionoConAcompanamiento": "-",
    "poseeApoyos": "-",
    "cualesApoyos": ""
  }
}
```

PocketBase vuelve a validar enlace, curso, período, inscripción, cada materia enviada, criterios y escala. El guardado completo se ejecuta en una transacción.

Cada materia incluida debe contener todos sus criterios configurados y, salvo las materias formativas identificadas como conducta, una calificación general. Cuando se incluye `cierre`, `asistencias`, `inasistencias` y `llegadasTarde` son enteros obligatorios entre 0 y 180; `0` representa ausencia de novedades. `observaciones` es opcional y puede enviarse como cadena vacía. El editor docente incluye el cierre en cada guardado para que esos tres valores siempre viajen explícitamente.

Los campos de integración son anuales aunque se completen desde el boletín. En el primer bimestre, `poseeApoyos` vacío o `-` se normaliza a `NO`; si su valor es `SI`, `cualesApoyos` es obligatorio y una cadena vacía produce `400`. En el cuarto se aplica la misma normalización a `promocionoConAcompanamiento`. El cliente envía el bloque `apoyos` en cada guardado docente de esos períodos y el envío final aplica la normalización a cualquier registro histórico que todavía permanezca sin especificar.

Los enlaces legados que tengan `materia_id` informado no pueden usar el gateway. La emisión rechaza `materiaId`; todo acceso nuevo abarca el curso y período completos.

### `POST /api/cys/docente/enviar`

Valida dentro de una transacción que el curso tenga alumnos y materias, que cada alumno activo del ciclo posea todas las materias completas y que tenga cierre del período. Las materias formativas identificadas como conducta no exigen calificación general, pero sí todos sus criterios configurados.

Si la carga está incompleta responde `422` con totales y alumnos pendientes. Si está completa cambia la instancia a `CONTROL_DIRECTIVO`, registra fecha y docente, incrementa la revisión y elimina la llave del curso y período en la misma transacción.

## Rutas institucionales para enlaces

Estas rutas exigen una sesión de la colección `users`.

### `POST /api/cys/enlaces-docentes`

Emite un enlace sin vencimiento calendario, reemplaza cualquier llave previa del mismo curso y período y devuelve el secreto. El acceso termina por reemplazo, eliminación o entrega del bimestre.

### `POST /api/cys/enlaces-docentes/:tokenId/rotar`

Reemplaza el secreto de la llave vigente y devuelve el nuevo secreto. El enlace anterior queda invalidado inmediatamente.

### `POST /api/cys/enlaces-docentes/:tokenId/recuperar`

Devuelve el secreto vigente sin rotarlo únicamente cuando el registro existe y la instancia continúa en `BORRADOR_DOCENTE`. Los enlaces creados antes de incorporar el cifrado requieren una única regeneración.

La lista y eliminación usan la colección estándar `tokens_acceso_docente` con sesión institucional. No existe un endpoint de activación ni un campo `activo`: la vigencia se representa mediante la existencia de una única llave por curso y período. El antiguo `PATCH /api/cys/enlaces-docentes/:tokenId/estado` fue retirado y debe responder `404`. Las respuestas posteriores sólo contienen el hash, el prefijo y la disponibilidad de recuperación, nunca el secreto en texto plano.

## Rutas institucionales para la planilla

Estas rutas exigen una sesión de la colección `users`.

### `GET /api/cys/directivo/instancias/:cursoId/:periodoId`

Devuelve la instancia del curso y período, o `null` si la carga todavía no fue iniciada. El frontend usa el estado para montar el editor únicamente durante `CONTROL_DIRECTIVO`.

### `GET /api/cys/directivo/alumnos/:inscripcionId?periodoId=:periodoId`

Devuelve una instantánea institucional coherente con `revision`, evaluaciones, criterios evaluados, PPI, cierre e integración escolar. La pertenencia de la inscripción, el ciclo y el estado `CONTROL_DIRECTIVO` se validan antes de responder.

Todos los bloques y la revisión se leen dentro de una misma transacción. Esa `revision` es la única precondición válida para el siguiente guardado; no debe sustituirse por una revisión recibida por Realtime ni combinarse con datos cacheados de otra consulta.

### `PUT /api/cys/directivo/alumnos/:inscripcionId`

Recibe `periodoId`, `expectedRevision` y los mismos bloques `materias`, `cierre` y `apoyos` del guardado docente. Dentro de una única transacción valida que la instancia continúe en `CONTROL_DIRECTIVO`, comprueba curso y ciclo, compara la revisión y persiste todos los bloques modificados. Si la revisión coincide, incrementa `revision` y devuelve la instancia resultante.

Si otra sesión confirmó una operación desde la lectura original, responde `409` con `currentRevision` y no modifica ningún registro. El cliente debe conservar el borrador local, informar el conflicto y exigir una relectura antes de volver a guardar. No se permite el reintento automático.

Ante un timeout, fallo de red o `5xx`, el resultado se considera incierto. El cliente conserva lo visible, bloquea nuevos guardados y exige consultar la instantánea autoritativa antes de continuar.

No existen rutas institucionales para devolver una entrega, cerrar la instancia o reabrirla. `CONTROL_DIRECTIVO` es terminal y sólo admite las correcciones realizadas mediante el endpoint de alumno.

## Configuración curricular anual

`curso_materias` incluye `ciclo_id`. Las escrituras directas de `curso_materias` y `criterios_evaluacion` están cerradas para sesiones autenticadas. El constructor usa estas rutas institucionales:

| Ruta | Operación |
| --- | --- |
| `GET /api/cys/directivo/configuracion/estado/:cursoId/:cicloId` | Informa si la malla anual continúa editable. |
| `POST /api/cys/directivo/configuracion/materias` | Asignar una materia a `cursoId` y `cicloId`, con `materiaId` y `ordenVisual`. |
| `DELETE /api/cys/directivo/configuracion/materias/:cursoMateriaId` | Quitar la materia y sus criterios en una transacción. |
| `PUT /api/cys/directivo/configuracion/materias/orden` | Actualizar conjuntamente el orden de materias del mismo curso y ciclo. |
| `PUT /api/cys/directivo/configuracion/materias/:cursoMateriaId/criterios` | Reemplazar los criterios de una materia en una transacción; admite hasta cinco. |

Cada operación revalida dentro de la transacción que ningún bimestre del curso y ciclo haya iniciado su workflow. La emisión del enlace exige escala con valores, al menos una materia y exactamente cinco criterios por materia. El catálogo global de materias conserva la creación autenticada; sus nombres no se editan desde el constructor.

## Etapas y visado de boletines

`GET /api/cys/directivo/etapas/:periodoId` devuelve, para cada curso, `etapa`, `revision`, `totalBoletines` y `visados`. Las etapas son `PENDIENTE_CONFIGURACION`, `PENDIENTE_EMISION`, `CARGA_DOCENTE`, `CARGA_PAUSADA`, `REVISION_DIRECTIVA` y `LISTO_PARA_PDF`. Son una proyección del servidor: el estado persistido de control sigue siendo `BORRADOR_DOCENTE` o `CONTROL_DIRECTIVO`.

`GET /api/cys/directivo/revision/:cursoId/:periodoId` devuelve desde una transacción la instancia, su revisión, el conteo y la lista de boletines con `estado`, `revisionContenido`, fecha y usuario de visado. `alumnosSinIncorporar` informa altas activas posteriores a la entrega. Los boletines históricos se migran como `PENDIENTE_REVISION`; ningún registro se visa por inferencia.

`POST /api/cys/directivo/revision/:cursoId/:periodoId/sincronizar-matricula` recibe `{ "expectedRevision": 7 }`. Agrega las matrículas activas ausentes como pendientes, conserva las filas existentes e incrementa la revisión sólo si hubo incorporaciones. Un `409` indica que se debe releer el curso antes de repetir la operación.

`POST /api/cys/directivo/boletines/:inscripcionId/visar` y `POST /api/cys/directivo/boletines/:inscripcionId/retirar-visado` reciben `periodoId`, `expectedRevision` y `expectedContentRevision`. Comparan ambas revisiones en la transacción. El visado exige que el boletín individual tenga todas sus materias, criterios y cierre completos. Una operación repetida sobre el mismo estado no incrementa la revisión. La corrección directiva de ese alumno incrementa `revision_contenido` y retira su visado en la misma transacción.

`visados_boletin` es legible para usuarios institucionales y rechaza creación, edición y eliminación directas. La generación de PDF no está implementada; `LISTO_PARA_PDF` expresa únicamente la condición necesaria para la siguiente fase.

## Respuestas de autorización

- `401`: enlace ausente, inválido, reemplazado o eliminado.
- `403`: el registro o la operación está fuera del alcance concedido.
- `400`: referencias o valores inválidos.
- `409`: la revisión esperada ya no es vigente; la operación no produjo escrituras.
- `422`: el bimestre todavía tiene alumnos, materias o cierres pendientes.

Los mensajes públicos son deliberadamente genéricos. El frontend debe retirar la planilla cuando recibe `401` o `403` y no debe reintentar una escritura automáticamente.
