# Contrato HTTP propio de PocketBase

## Principio de acceso

Las pantallas institucionales autenticadas leen las colecciones estándar mediante el SDK de PocketBase. Las escrituras de la planilla pasan por el gateway para aplicar el workflow y una transacción única. La ruta pública `/carga` no consume colecciones: usa exclusivamente el gateway definido en `pb_hooks`.

La credencial docente viaja en `X-CYS-Teacher-Token`. Las respuestas del gateway llevan `Cache-Control: no-store`. PocketBase conserva SHA-256 para validación, un prefijo administrativo y una copia cifrada que sólo puede recuperar una sesión institucional.

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

### `PUT /api/cys/directivo/alumnos/:inscripcionId`

Recibe `periodoId`, `expectedRevision` y los mismos bloques `materias`, `cierre` y `apoyos` del guardado docente. Dentro de una única transacción valida que la instancia continúe en `CONTROL_DIRECTIVO`, comprueba curso y ciclo, compara la revisión y persiste todos los bloques modificados. Si la revisión coincide, incrementa `revision` y devuelve la instancia resultante.

Si otra sesión confirmó una operación desde la lectura original, responde `409` con `currentRevision` y no modifica ningún registro. El cliente debe conservar el borrador local, informar el conflicto y exigir una relectura antes de volver a guardar. No se permite el reintento automático.

No existen rutas institucionales para devolver una entrega, cerrar la instancia o reabrirla. `CONTROL_DIRECTIVO` es terminal y sólo admite las correcciones realizadas mediante el endpoint de alumno.

## Respuestas de autorización

- `401`: enlace ausente, inválido, reemplazado o eliminado.
- `403`: el registro o la operación está fuera del alcance concedido.
- `400`: referencias o valores inválidos.
- `409`: la revisión esperada ya no es vigente; la operación no produjo escrituras.
- `422`: el bimestre todavía tiene alumnos, materias o cierres pendientes.

Los mensajes públicos son deliberadamente genéricos. El frontend debe retirar la planilla cuando recibe `401` o `403` y no debe reintentar una escritura automáticamente.
