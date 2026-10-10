migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ciclos_lectivos")
  collection.schema.addField(new SchemaField({
    id: "cysfinitclases01",
    name: "fecha_inicio_clases",
    type: "date",
    required: false,
    presentable: false,
    unique: false,
    options: {
      min: "",
      max: ""
    }
  }))
  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ciclos_lectivos")
  collection.schema.removeField("cysfinitclases01")
  dao.saveCollection(collection)
})
