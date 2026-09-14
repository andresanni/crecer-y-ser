migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("q9zvsilyj8ibimy")

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tkhash01",
    "name": "token_hash",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 64,
      "pattern": "^[a-f0-9]{64}$"
    }
  }))

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tkpref01",
    "name": "token_prefijo",
    "type": "text",
    "required": false,
    "presentable": true,
    "unique": false,
    "options": {
      "min": null,
      "max": 16,
      "pattern": ""
    }
  }))

  collection.indexes.push("CREATE UNIQUE INDEX `idx_tokens_acceso_docente_token_hash` ON `tokens_acceso_docente` (`token_hash`) WHERE `token_hash` != ''")

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("q9zvsilyj8ibimy")

  collection.schema.removeField("tkhash01")
  collection.schema.removeField("tkpref01")
  collection.indexes = collection.indexes.filter((index) => !index.includes("idx_tokens_acceso_docente_token_hash"))

  return dao.saveCollection(collection)
})
