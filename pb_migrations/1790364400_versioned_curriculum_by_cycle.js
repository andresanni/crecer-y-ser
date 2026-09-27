migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("curso_materias")
  collection.schema.addField(new SchemaField({
    "id": "cmcycle0000001",
    "name": "ciclo_id",
    "type": "relation",
    "required": false,
    "options": { "collectionId": "qkdgtlebf3lt3mw", "cascadeDelete": false, "minSelect": 0, "maxSelect": 1 }
  }))
  collection.createRule = null
  collection.updateRule = null
  collection.deleteRule = null
  dao.saveCollection(collection)

  const criteriaCollection = dao.findCollectionByNameOrId("criterios_evaluacion")
  criteriaCollection.createRule = null
  criteriaCollection.updateRule = null
  criteriaCollection.deleteRule = null
  dao.saveCollection(criteriaCollection)

  const cycles = dao.findRecordsByFilter("ciclos_lectivos", "id != ''", "-ano", 0, 0, {})
  const current = cycles.find((cycle) => cycle.getBool("actual")) || cycles[0]
  if (current) {
    const materials = dao.findRecordsByFilter("curso_materias", "id != ''", "", 0, 0, {})
    materials.forEach((material) => {
      material.set("ciclo_id", current.getId())
      dao.saveRecord(material)
    })
  }
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("curso_materias")
  collection.schema.removeField("cmcycle0000001")
  collection.createRule = '@request.auth.id != ""'
  collection.updateRule = '@request.auth.id != ""'
  collection.deleteRule = '@request.auth.id != ""'
  dao.saveCollection(collection)

  const criteriaCollection = dao.findCollectionByNameOrId("criterios_evaluacion")
  criteriaCollection.createRule = '@request.auth.id != ""'
  criteriaCollection.updateRule = '@request.auth.id != ""'
  criteriaCollection.deleteRule = '@request.auth.id != ""'
  dao.saveCollection(criteriaCollection)
})
