migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("visados_boletin")
  collection.schema.addField(new SchemaField({
    id: "approvalgen001",
    name: "generacion_visado",
    type: "number",
    required: false,
    options: { min: 0, max: null, noDecimal: true }
  }))
  dao.saveCollection(collection)
  db.newQuery("UPDATE visados_boletin SET generacion_visado = CASE WHEN estado = 'VISADO' THEN 1 ELSE 0 END").execute()
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("visados_boletin")
  collection.schema.removeField("approvalgen001")
  dao.saveCollection(collection)
})
