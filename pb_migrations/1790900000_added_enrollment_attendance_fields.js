migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("inscripciones")
  collection.schema.addField(new SchemaField({ id: "cysprocing000001", name: "procedencia_ingreso", type: "text", options: { min: null, max: null, pattern: "" } }))
  collection.schema.addField(new SchemaField({ id: "cysdestegr000001", name: "destino_egreso", type: "text", options: { min: null, max: null, pattern: "" } }))
  collection.schema.addField(new SchemaField({ id: "cysresapo0000001", name: "resolucion_apoyo", type: "text", options: { min: null, max: null, pattern: "" } }))
  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("inscripciones")
  ;["cysprocing000001", "cysdestegr000001", "cysresapo0000001"].forEach((id) => collection.schema.removeField(id))
  dao.saveCollection(collection)
})
