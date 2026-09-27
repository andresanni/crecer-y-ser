migrate((db) => {
  const dao = new Dao(db)
  const collection = new Collection({
    "id": "cysapproval0001",
    "name": "visados_boletin",
    "type": "base",
    "system": false,
    "schema": [
      new SchemaField({
        "id": "approvalflow01",
        "name": "instancia_id",
        "type": "relation",
        "required": true,
        "options": { "collectionId": "cysloadflow0001", "cascadeDelete": false, "minSelect": 1, "maxSelect": 1 }
      }),
      new SchemaField({
        "id": "approvalenroll1",
        "name": "inscripcion_id",
        "type": "relation",
        "required": true,
        "options": { "collectionId": "wnp87hpjzmztwyk", "cascadeDelete": false, "minSelect": 1, "maxSelect": 1 }
      }),
      new SchemaField({
        "id": "approvalstate01",
        "name": "estado",
        "type": "select",
        "required": true,
        "options": { "maxSelect": 1, "values": ["PENDIENTE_REVISION", "VISADO"] }
      }),
      new SchemaField({
        "id": "approvalrev001",
        "name": "revision_contenido",
        "type": "number",
        "required": true,
        "options": { "min": 0, "max": null, "noDecimal": true }
      }),
      new SchemaField({
        "id": "approvalokrev01",
        "name": "revision_visada",
        "type": "number",
        "required": false,
        "options": { "min": 0, "max": null, "noDecimal": true }
      }),
      new SchemaField({
        "id": "approvalat0001",
        "name": "visado_at",
        "type": "date",
        "required": false,
        "options": { "min": "", "max": "" }
      }),
      new SchemaField({
        "id": "approvalby0001",
        "name": "visado_por",
        "type": "relation",
        "required": false,
        "options": { "collectionId": "_pb_users_auth_", "cascadeDelete": false, "minSelect": 0, "maxSelect": 1 }
      })
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_visados_boletin_scope` ON `visados_boletin` (`instancia_id`, `inscripcion_id`)"
    ],
    "listRule": '@request.auth.id != ""',
    "viewRule": '@request.auth.id != ""',
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  })
  dao.saveCollection(collection)

  const workflows = dao.findRecordsByFilter("instancias_carga_boletin", "estado = 'CONTROL_DIRECTIVO'", "", 0, 0, {})
  workflows.forEach((workflow) => {
    const period = dao.findRecordById("periodos", workflow.getString("periodo_id"))
    const enrollments = dao.findRecordsByFilter(
      "inscripciones",
      "curso_id = {:courseId} && ciclo_id = {:cycleId} && estado != 'Baja'",
      "",
      0,
      0,
      { courseId: workflow.getString("curso_id"), cycleId: period.getString("ciclo_id") }
    )
    enrollments.forEach((enrollment) => {
      const approval = new Record(collection)
      approval.set("instancia_id", workflow.getId())
      approval.set("inscripcion_id", enrollment.getId())
      approval.set("estado", "PENDIENTE_REVISION")
      approval.set("revision_contenido", 0)
      dao.saveRecord(approval)
    })
  })
}, (db) => {
  const dao = new Dao(db)
  dao.deleteCollection(dao.findCollectionByNameOrId("cysapproval0001"))
})
