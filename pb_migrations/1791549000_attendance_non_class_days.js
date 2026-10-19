migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("eventos_calendario")
  const field = collection.schema.getFieldByName("tipo")
  field.options.values = [...field.options.values, "SIN_CLASES"]
  collection.schema.addField(field)
  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  if (dao.findRecordsByFilter("eventos_calendario", 'tipo = "SIN_CLASES"', "", 1, 0).length) {
    throw new Error("Retire los días sin clases del calendario antes de revertir esta migración.")
  }
  const collection = dao.findCollectionByNameOrId("eventos_calendario")
  const field = collection.schema.getFieldByName("tipo")
  field.options.values = field.options.values.filter(value => value !== "SIN_CLASES")
  collection.schema.addField(field)
  dao.saveCollection(collection)
})
