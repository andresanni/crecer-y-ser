migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tokens_acceso_informe")

  const primaryField = collection.schema.getFieldByName("instancia_id")
  if (primaryField) {
    primaryField.required = false
    primaryField.options.cascadeDelete = false
    primaryField.options.minSelect = null
    primaryField.options.maxSelect = 1
  }

  const existingMulti = collection.schema.getFieldByName("instancia_ids")
  if (!existingMulti) {
    collection.schema.addField(
      new SchemaField({
        id: "rpttok_insts001",
        name: "instancia_ids",
        type: "relation",
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: "cysrptinst00001",
          cascadeDelete: false,
          minSelect: 1,
          maxSelect: 15,
          displayFields: null
        }
      })
    )
  }

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_tokens_acceso_informe_hash` ON `tokens_acceso_informe` (`token_hash`) WHERE `token_hash` != ''"
  ]

  dao.saveCollection(collection)

  const records = dao.findRecordsByFilter("tokens_acceso_informe", "id != ''", "", 500, 0) || []
  for (let i = 0; i < records.length; i += 1) {
    const rec = records[i]
    const slice = rec.getStringSlice("instancia_ids") || []
    const single = rec.getString("instancia_id")
    if (slice.length === 0 && single) {
      rec.set("instancia_ids", [single])
      dao.saveRecord(rec)
    }
  }
}, (db) => {
  const dao = new Dao(db)
  let collection = null
  try {
    collection = dao.findCollectionByNameOrId("tokens_acceso_informe")
  } catch (_) {
    collection = null
  }
  if (!collection) return

  const multiField = collection.schema.getFieldByName("instancia_ids")
  if (multiField) {
    collection.schema.removeField(multiField.id)
  }

  const primaryField = collection.schema.getFieldByName("instancia_id")
  if (primaryField) {
    primaryField.required = true
    primaryField.options.cascadeDelete = true
    primaryField.options.minSelect = 1
    primaryField.options.maxSelect = 1
  }

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_tokens_acceso_informe_instancia` ON `tokens_acceso_informe` (`instancia_id`)",
    "CREATE UNIQUE INDEX `idx_tokens_acceso_informe_hash` ON `tokens_acceso_informe` (`token_hash`) WHERE `token_hash` != ''"
  ]

  dao.saveCollection(collection)
})
