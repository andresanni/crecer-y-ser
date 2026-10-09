migrate((db) => {
  const dao = new Dao(db)

  const mesesCalendario = new Collection({
    "id": "cyscalmonth0001",
    "name": "meses_calendario",
    "type": "base",
    "system": false,
    "schema": [
      new SchemaField({
        "id": "calm_ciclo0001",
        "name": "ciclo_id",
        "type": "relation",
        "required": true,
        "options": { "collectionId": "qkdgtlebf3lt3mw", "cascadeDelete": false, "minSelect": null, "maxSelect": 1 }
      }),
      new SchemaField({
        "id": "calm_mes0000001",
        "name": "mes",
        "type": "number",
        "required": true,
        "options": { "min": 1, "max": 12, "noDecimal": true }
      }),
      new SchemaField({
        "id": "calm_ano0000001",
        "name": "ano",
        "type": "number",
        "required": true,
        "options": { "min": 2020, "max": 2100, "noDecimal": true }
      }),
      new SchemaField({
        "id": "calm_tothab0001",
        "name": "total_dias_habiles",
        "type": "number",
        "required": false,
        "options": { "min": 0, "max": 31, "noDecimal": true }
      }),
      new SchemaField({
        "id": "calm_totacm0001",
        "name": "dias_habiles_acumulados",
        "type": "number",
        "required": false,
        "options": { "min": 0, "max": 365, "noDecimal": true }
      }),
      new SchemaField({
        "id": "calm_perbol0001",
        "name": "periodo_boletin_id",
        "type": "relation",
        "required": false,
        "options": { "collectionId": "per_col_0000002", "cascadeDelete": false, "minSelect": null, "maxSelect": 1 }
      })
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_meses_calendario_ciclo_mes` ON `meses_calendario` (`ciclo_id`, `mes`)"
    ],
    "listRule": '@request.auth.id != ""',
    "viewRule": '@request.auth.id != ""',
    "createRule": '@request.auth.id != ""',
    "updateRule": '@request.auth.id != ""',
    "deleteRule": '@request.auth.id != ""',
    "options": {}
  })
  dao.saveCollection(mesesCalendario)

  const eventosCalendario = new Collection({
    "id": "cyscalevent0001",
    "name": "eventos_calendario",
    "type": "base",
    "system": false,
    "schema": [
      new SchemaField({
        "id": "calev_mesid0001",
        "name": "mes_calendario_id",
        "type": "relation",
        "required": true,
        "options": { "collectionId": "cyscalmonth0001", "cascadeDelete": true, "minSelect": null, "maxSelect": 1 }
      }),
      new SchemaField({
        "id": "calev_fecha0001",
        "name": "fecha",
        "type": "date",
        "required": true,
        "options": { "min": "", "max": "" }
      }),
      new SchemaField({
        "id": "calev_dia000001",
        "name": "dia",
        "type": "number",
        "required": true,
        "options": { "min": 1, "max": 31, "noDecimal": true }
      }),
      new SchemaField({
        "id": "calev_tipo00001",
        "name": "tipo",
        "type": "select",
        "required": true,
        "options": { "maxSelect": 1, "values": ["FERIADO", "JORNADA_EMI", "RECESO", "ASUETO"] }
      }),
      new SchemaField({
        "id": "calev_vertxt001",
        "name": "texto_celda_vertical",
        "type": "text",
        "required": false,
        "options": { "min": null, "max": 200, "pattern": "" }
      }),
      new SchemaField({
        "id": "calev_obsdes001",
        "name": "descripcion_observaciones",
        "type": "text",
        "required": false,
        "options": { "min": null, "max": 500, "pattern": "" }
      })
    ],
    "indexes": [
      "CREATE INDEX `idx_eventos_calendario_mes` ON `eventos_calendario` (`mes_calendario_id`, `dia`)"
    ],
    "listRule": '@request.auth.id != ""',
    "viewRule": '@request.auth.id != ""',
    "createRule": '@request.auth.id != ""',
    "updateRule": '@request.auth.id != ""',
    "deleteRule": '@request.auth.id != ""',
    "options": {}
  })
  dao.saveCollection(eventosCalendario)

  const asistenciasDiarias = new Collection({
    "id": "cysdailyatt0001",
    "name": "asistencias_diarias",
    "type": "base",
    "system": false,
    "schema": [
      new SchemaField({
        "id": "attd_inucid0001",
        "name": "inscripcion_id",
        "type": "relation",
        "required": true,
        "options": { "collectionId": "wnp87hpjzmztwyk", "cascadeDelete": true, "minSelect": null, "maxSelect": 1 }
      }),
      new SchemaField({
        "id": "attd_fecha00001",
        "name": "fecha",
        "type": "date",
        "required": true,
        "options": { "min": "", "max": "" }
      }),
      new SchemaField({
        "id": "attd_estado0001",
        "name": "estado",
        "type": "select",
        "required": true,
        "options": { "maxSelect": 1, "values": ["A", "J", "E", "IT", "RA"] }
      }),
      new SchemaField({
        "id": "attd_obs0000001",
        "name": "observacion",
        "type": "text",
        "required": false,
        "options": { "min": null, "max": 500, "pattern": "" }
      })
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_asistencias_diarias_insc_fecha` ON `asistencias_diarias` (`inscripcion_id`, `fecha`)"
    ],
    "listRule": '@request.auth.id != ""',
    "viewRule": '@request.auth.id != ""',
    "createRule": '@request.auth.id != ""',
    "updateRule": '@request.auth.id != ""',
    "deleteRule": '@request.auth.id != ""',
    "options": {}
  })
  dao.saveCollection(asistenciasDiarias)

  const registrosAsistenciaCurso = new Collection({
    "id": "cyscoursatt0001",
    "name": "registros_asistencia_curso",
    "type": "base",
    "system": false,
    "schema": [
      new SchemaField({
        "id": "crsatt_croid001",
        "name": "curso_id",
        "type": "relation",
        "required": true,
        "options": { "collectionId": "vqrxx07qeuos8oo", "cascadeDelete": true, "minSelect": null, "maxSelect": 1 }
      }),
      new SchemaField({
        "id": "crsatt_mesid001",
        "name": "mes_calendario_id",
        "type": "relation",
        "required": true,
        "options": { "collectionId": "cyscalmonth0001", "cascadeDelete": true, "minSelect": null, "maxSelect": 1 }
      }),
      new SchemaField({
        "id": "crsatt_obs00001",
        "name": "observaciones_adicionales",
        "type": "text",
        "required": false,
        "options": { "min": null, "max": 1000, "pattern": "" }
      })
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_registros_curso_mes` ON `registros_asistencia_curso` (`curso_id`, `mes_calendario_id`)"
    ],
    "listRule": '@request.auth.id != ""',
    "viewRule": '@request.auth.id != ""',
    "createRule": '@request.auth.id != ""',
    "updateRule": '@request.auth.id != ""',
    "deleteRule": '@request.auth.id != ""',
    "options": {}
  })
  dao.saveCollection(registrosAsistenciaCurso)
}, (db) => {
  const dao = new Dao(db)
  dao.deleteCollection(dao.findCollectionByNameOrId("registros_asistencia_curso"))
  dao.deleteCollection(dao.findCollectionByNameOrId("asistencias_diarias"))
  dao.deleteCollection(dao.findCollectionByNameOrId("eventos_calendario"))
  dao.deleteCollection(dao.findCollectionByNameOrId("meses_calendario"))
})
