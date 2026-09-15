migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tokens_acceso_docente")
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tkcipher01",
    "name": "token_cifrado",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 1024,
      "pattern": ""
    }
  }))
  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tokens_acceso_docente")
  collection.schema.removeField("tkcipher01")
  return dao.saveCollection(collection)
})
