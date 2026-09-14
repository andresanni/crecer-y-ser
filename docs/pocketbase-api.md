# Contrato HTTP propio de PocketBase

## Principio de acceso

Las pantallas institucionales autenticadas consumen las colecciones estándar mediante el SDK de PocketBase. La ruta pública `/carga` no consume colecciones: usa exclusivamente el gateway definido en `pb_hooks`.

La credencial docente viaja en `X-CYS-Teacher-Token`. Las respuestas del gateway llevan `Cache-Control: no-store`. El secreto se entrega una sola vez al emitir o regenerar un enlace; PocketBase conserva SHA-256 y un prefijo administrativo.

## Rutas docentes

### `GET /api/cys/docente/contexto`

Devuelve el alcance autorizado: referencia del acceso, curso, período, materias, criterios, valores de escala y alumnos regulares. No devuelve DNI, legajo, credenciales escolares ni el secreto.

### `GET /api/cys/docente/alumnos/:inscripcionId`

Devuelve evaluaciones, cierre del período y apoyos del alumno. Para un enlace de materia, limita las evaluaciones a esa materia y omite cierre y apoyos.

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

PocketBase vuelve a validar enlace, curso, período, materia, inscripción, criterios y escala. El guardado completo se ejecuta en una transacción.

## Rutas institucionales para enlaces

Estas rutas exigen una sesión de la colección `users`.

### `POST /api/cys/enlaces-docentes`

Emite un enlace y devuelve el secreto sólo en esta respuesta.

### `POST /api/cys/enlaces-docentes/:tokenId/rotar`

Reemplaza el secreto, reactiva el acceso y devuelve el nuevo secreto sólo en esta respuesta. El enlace anterior queda invalidado inmediatamente.

La lista, activación, desactivación y eliminación usan la colección estándar `tokens_acceso_docente` con sesión institucional. Las respuestas posteriores sólo contienen el hash y el prefijo, nunca un enlace reutilizable.

## Respuestas de autorización

- `401`: enlace ausente, inválido, vencido o revocado.
- `403`: el registro o la operación está fuera del alcance concedido.
- `400`: referencias o valores inválidos.

Los mensajes públicos son deliberadamente genéricos. El frontend debe retirar la planilla cuando recibe `401` o `403` y no debe reintentar una escritura automáticamente.
