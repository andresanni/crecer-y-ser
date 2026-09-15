migrate((db) => {
  const dao = new Dao(db)
  const authenticated = '@request.auth.id != ""'
  const collection = new Collection({
    "id": "cysloadflow0001",
    "created": "2026-09-14 13:00:00.000Z",
    "updated": "2026-09-14 13:00:00.000Z",
    "name": "instancias_carga_boletin",
    "type": "base",
    "system": false,
    "schema": [
      new SchemaField({
        "system": false,
        "id": "flowcourse01",
        "name": "curso_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "vqrxx07qeuos8oo",
          "cascadeDelete": false,
          "minSelect": 1,
          "maxSelect": 1,
          "displayFields": null
        }
      }),
      new SchemaField({
        "system": false,
        "id": "flowperiod01",
        "name": "periodo_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "per_col_0000002",
          "cascadeDelete": false,
          "minSelect": 1,
          "maxSelect": 1,
          "displayFields": null
        }
      }),
      new SchemaField({
        "system": false,
        "id": "flowstate001",
        "name": "estado",
        "type": "select",
        "required": true,
        "presentable": true,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "BORRADOR_DOCENTE",
            "CONTROL_DIRECTIVO",
            "CERRADO"
          ]
        }
      }),
      new SchemaField({
        "system": false,
        "id": "flowrevision1",
        "name": "revision",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": true
        }
      }),
      new SchemaField({
        "system": false,
        "id": "flowsentat001",
        "name": "enviado_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      }),
      new SchemaField({
        "system": false,
        "id": "flowsentby001",
        "name": "enviado_por",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 120,
          "pattern": ""
        }
      }),
      new SchemaField({
        "system": false,
        "id": "flowclosed001",
        "name": "cerrado_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      }),
      new SchemaField({
        "system": false,
        "id": "flowclosedby1",
        "name": "cerrado_por",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 120,
          "pattern": ""
        }
      })
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_instancias_carga_curso_periodo` ON `instancias_carga_boletin` (`curso_id`, `periodo_id`)"
    ],
    "listRule": authenticated,
    "viewRule": authenticated,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  })

  dao.saveCollection(collection)

  const tokenCollection = dao.findCollectionByNameOrId("tokens_acceso_docente")
  tokenCollection.createRule = null
  tokenCollection.updateRule = null
  dao.saveCollection(tokenCollection)

  ;["evaluaciones_materia", "evaluaciones_criterios", "cierres_periodo_alumno"].forEach((name) => {
    const protectedCollection = dao.findCollectionByNameOrId(name)
    protectedCollection.createRule = null
    protectedCollection.updateRule = null
    protectedCollection.deleteRule = null
    dao.saveCollection(protectedCollection)
  })

  const tokens = dao.findRecordsByFilter("tokens_acceso_docente", "curso_id != '' && periodo_id != ''", "created", 0, 0, {})
  const created = {}
  tokens.forEach((token) => {
    const courseId = token.getString("curso_id")
    const periodId = token.getString("periodo_id")
    const key = courseId + ":" + periodId
    if (created[key]) return
    const workflow = new Record(collection)
    workflow.set("curso_id", courseId)
    workflow.set("periodo_id", periodId)
    workflow.set("estado", "BORRADOR_DOCENTE")
    workflow.set("revision", 0)
    dao.saveRecord(workflow)
    created[key] = true
  })
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cysloadflow0001")
  dao.deleteCollection(collection)
  const tokenCollection = dao.findCollectionByNameOrId("tokens_acceso_docente")
  const authenticated = '@request.auth.id != ""'
  tokenCollection.createRule = authenticated
  tokenCollection.updateRule = authenticated
  dao.saveCollection(tokenCollection)
  ;["evaluaciones_materia", "evaluaciones_criterios", "cierres_periodo_alumno"].forEach((name) => {
    const protectedCollection = dao.findCollectionByNameOrId(name)
    protectedCollection.createRule = authenticated
    protectedCollection.updateRule = authenticated
    protectedCollection.deleteRule = authenticated
    dao.saveCollection(protectedCollection)
  })
})
