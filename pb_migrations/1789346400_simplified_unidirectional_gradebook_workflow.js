migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cysloadflow0001")
  const closedWorkflows = dao.findRecordsByFilter(
    "instancias_carga_boletin",
    "estado = 'CERRADO'",
    "",
    0,
    0,
    {}
  )

  closedWorkflows.forEach((workflow) => {
    workflow.set("estado", "CONTROL_DIRECTIVO")
    workflow.set("revision", workflow.getInt("revision") + 1)
    dao.saveRecord(workflow)
  })

  collection.schema.addField(new SchemaField({
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
        "CONTROL_DIRECTIVO"
      ]
    }
  }))
  collection.schema.removeField("flowclosed001")
  collection.schema.removeField("flowclosedby1")

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cysloadflow0001")

  collection.schema.addField(new SchemaField({
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
  }))
  collection.schema.addField(new SchemaField({
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
  }))
  collection.schema.addField(new SchemaField({
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
  }))

  return dao.saveCollection(collection)
})
