migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tokens_acceso_docente")
  const tokens = dao.findRecordsByFilter("tokens_acceso_docente", "curso_id != '' && periodo_id != ''", "-created", 0, 0, {})
  const retainedScopes = {}

  tokens.forEach((token) => {
    const scope = `${token.getString("curso_id")}:${token.getString("periodo_id")}`
    const mustDelete = Boolean(token.getString("materia_id")) || !token.getBool("activo") || Boolean(retainedScopes[scope])
    if (mustDelete) {
      dao.deleteRecord(token)
      return
    }
    retainedScopes[scope] = true
  })

  collection.schema.removeField("wqajzq8l")
  collection.indexes.push("CREATE UNIQUE INDEX `idx_tokens_acceso_docente_scope` ON `tokens_acceso_docente` (`curso_id`, `periodo_id`) WHERE `curso_id` != '' AND `periodo_id` != ''")
  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tokens_acceso_docente")
  collection.indexes = collection.indexes.filter((index) => !index.includes("idx_tokens_acceso_docente_scope"))
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wqajzq8l",
    "name": "activo",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))
  dao.saveCollection(collection)

  const tokens = dao.findRecordsByFilter("tokens_acceso_docente", "curso_id != '' && periodo_id != ''", "", 0, 0, {})
  tokens.forEach((token) => {
    token.set("activo", true)
    dao.saveRecord(token)
  })
})
