# Contrato HTTP propio de PocketBase

## Principio de acceso

Las pantallas institucionales autenticadas leen las colecciones estándar mediante el SDK de PocketBase. Las escrituras de la planilla pasan por el gateway para aplicar el workflow y una transacción única. La ruta pública `/carga` no consume colecciones: usa exclusivamente el gateway definido en `pb_hooks`.

La credencial docente viaja en `X-CYS-Teacher-Token`. Las respuestas del gateway llevan `Cache-Control: no-store`. El secreto se entrega una sola vez al emitir o regenerar un enlace; PocketBase conserva SHA-256 y un prefijo administrativo.

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

Si la carga está incompleta responde `422` con totales y alumnos pendientes. Si está completa cambia la instancia a `CONTROL_DIRECTIVO`, registra fecha y docente, incrementa la revisión y desactiva todas las credenciales del curso y período en la misma transacción.

## Rutas institucionales para enlaces

Estas rutas exigen una sesión de la colección `users`.

### `POST /api/cys/enlaces-docentes`

Emite un enlace sin vencimiento calendario y devuelve el secreto sólo en esta respuesta. El acceso termina por desactivación, eliminación o entrega del bimestre.

### `POST /api/cys/enlaces-docentes/:tokenId/rotar`

Reemplaza el secreto, reactiva el acceso y devuelve el nuevo secreto sólo en esta respuesta. El enlace anterior queda invalidado inmediatamente.

### `PATCH /api/cys/enlaces-docentes/:tokenId/estado`

Activa o desactiva una credencial. La activación sólo es válida mientras la instancia esté en `BORRADOR_DOCENTE` y desactiva cualquier otra credencial vigente del mismo curso y período.

La lista y eliminación usan la colección estándar `tokens_acceso_docente` con sesión institucional. La activación y desactivación pasan por el gateway para respetar el workflow. Las respuestas posteriores sólo contienen el hash y el prefijo, nunca un enlace reutilizable.

## Rutas institucionales para la planilla

Estas rutas exigen una sesión de la colección `users`.

### `GET /api/cys/directivo/instancias/:cursoId/:periodoId`

Devuelve la instancia del curso y período, o `null` si la carga todavía no fue iniciada. El frontend usa el estado para montar el editor únicamente durante `CONTROL_DIRECTIVO`.

### `PUT /api/cys/directivo/alumnos/:inscripcionId`

Recibe `periodoId` junto con los mismos bloques `materias`, `cierre` y `apoyos` del guardado docente. Dentro de una única transacción valida que la instancia continúe en `CONTROL_DIRECTIVO`, comprueba curso y ciclo y persiste todos los bloques modificados. Una respuesta `403` obliga a retirar el editor y volver a consultar la instancia.

No existen rutas institucionales para devolver una entrega, cerrar la instancia o reabrirla. `CONTROL_DIRECTIVO` es terminal y sólo admite las correcciones realizadas mediante el endpoint de alumno.

## Respuestas de autorización

- `401`: enlace ausente, inválido, vencido o revocado.
- `403`: el registro o la operación está fuera del alcance concedido.
- `400`: referencias o valores inválidos.
- `422`: el bimestre todavía tiene alumnos, materias o cierres pendientes.

Los mensajes públicos son deliberadamente genéricos. El frontend debe retirar la planilla cuando recibe `401` o `403` y no debe reintentar una escritura automáticamente.
