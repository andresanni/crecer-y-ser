migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tokens_acceso_docente")
  collection.schema.removeField("hczgvbce")
  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tokens_acceso_docente")
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hczgvbce",
    "name": "fecha_expiracion",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))
  return dao.saveCollection(collection)
})
