migrate((db) => {
  const dao = new Dao(db)

  const alumnos = dao.findCollectionByNameOrId("alumnos")
  alumnos.schema.addField(new SchemaField({
    system: false,
    id: "alu_localidad",
    name: "localidad",
    type: "text",
    required: false,
    presentable: false,
    unique: false,
    options: {
      min: null,
      max: null,
      pattern: ""
    }
  }))
  alumnos.schema.removeField("alu_telefono")
  dao.saveCollection(alumnos)

  const responsables = dao.findCollectionByNameOrId("responsables")
  responsables.schema.addField(new SchemaField({
    system: false,
    id: "resp_dni_tipo",
    name: "dni_tipo",
    type: "text",
    required: false,
    presentable: false,
    unique: false,
    options: {
      min: null,
      max: null,
      pattern: ""
    }
  }))
  responsables.schema.addField(new SchemaField({
    system: false,
    id: "resp_dni_num",
    name: "dni_numero",
    type: "text",
    required: false,
    presentable: false,
    unique: false,
    options: {
      min: null,
      max: null,
      pattern: ""
    }
  }))
  dao.saveCollection(responsables)

  db.newQuery("UPDATE responsables SET dni_numero = dni, dni_tipo = 'DNI' WHERE dni IS NOT NULL AND dni != ''").execute()

  responsables.schema.removeField("j2xgm2gg")
  dao.saveCollection(responsables)
}, (db) => {
  const dao = new Dao(db)

  const alumnos = dao.findCollectionByNameOrId("alumnos")
  alumnos.schema.removeField("alu_localidad")
  alumnos.schema.addField(new SchemaField({
    system: false,
    id: "alu_telefono",
    name: "telefono",
    type: "text",
    required: false,
    presentable: false,
    unique: false,
    options: {
      min: null,
      max: null,
      pattern: ""
    }
  }))
  dao.saveCollection(alumnos)

  const responsables = dao.findCollectionByNameOrId("responsables")
  responsables.schema.addField(new SchemaField({
    system: false,
    id: "j2xgm2gg",
    name: "dni",
    type: "text",
    required: false,
    presentable: false,
    unique: false,
    options: {
      min: null,
      max: null,
      pattern: ""
    }
  }))
  dao.saveCollection(responsables)

  db.newQuery("UPDATE responsables SET dni = dni_numero WHERE dni_numero IS NOT NULL AND dni_numero != ''").execute()

  responsables.schema.removeField("resp_dni_tipo")
  responsables.schema.removeField("resp_dni_num")
  dao.saveCollection(responsables)
})
