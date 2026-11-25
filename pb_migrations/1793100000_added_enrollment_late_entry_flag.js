migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("inscripciones")

  if (!collection.schema.getFieldByName("es_alta_tardia")) {
    collection.schema.addField(new SchemaField({
      id: "cyslateentry001",
      name: "es_alta_tardia",
      type: "bool",
      required: false,
      presentable: false,
      unique: false,
      options: {}
    }))
  }

  const protectedFields = [
    "bimestre_desde",
    "bimestre_hasta",
    "cursada_estado",
    "revision_cursada",
    "es_alta_tardia"
  ]

  collection.createRule =
    '@request.auth.id != "" && (@request.data.estado:isset = false || @request.data.estado != "Baja") && ' +
    protectedFields.map((field) => '@request.data.' + field + ':isset = false').join(' && ')

  collection.updateRule =
    '@request.auth.id != "" && ' +
    protectedFields
      .concat(["alumno_id", "curso_id", "ciclo_id"])
      .map((field) => '(@request.data.' + field + ':isset = false || @request.data.' + field + ' = ' + field + ')')
      .join(' && ') +
    ' && (@request.data.estado:isset = false || @request.data.estado = estado || (estado != "Baja" && @request.data.estado != "Baja"))' +
    ' && (@request.data.fecha_egreso:isset = false || @request.data.fecha_egreso = fecha_egreso || estado != "Baja")'

  dao.saveCollection(collection)

  db.newQuery("UPDATE inscripciones SET cursada_estado = 'CONFIRMADA', bimestre_desde = 1, bimestre_hasta = 4 WHERE (cursada_estado = '' OR cursada_estado = 'PENDIENTE') AND estado != 'Baja'").execute()
  db.newQuery("UPDATE inscripciones SET es_alta_tardia = true WHERE cursada_estado = 'CONFIRMADA' AND bimestre_desde > 1").execute()
  db.newQuery("UPDATE inscripciones SET es_alta_tardia = true WHERE estado != 'Baja' AND id IN (SELECT inscripcion_id FROM nomina_informe_alumno WHERE evaluable = false)").execute()
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("inscripciones")
  collection.schema.removeField("cyslateentry001")
  const protectedFields = ["bimestre_desde", "bimestre_hasta", "cursada_estado", "revision_cursada"]
  collection.createRule =
    '@request.auth.id != "" && (@request.data.estado:isset = false || @request.data.estado != "Baja") && ' +
    protectedFields.map((field) => '@request.data.' + field + ':isset = false').join(' && ')
  collection.updateRule =
    '@request.auth.id != "" && ' +
    protectedFields
      .concat(["alumno_id", "curso_id", "ciclo_id"])
      .map((field) => '(@request.data.' + field + ':isset = false || @request.data.' + field + ' = ' + field + ')')
      .join(' && ') +
    ' && (@request.data.estado:isset = false || @request.data.estado = estado || (estado != "Baja" && @request.data.estado != "Baja"))' +
    ' && (@request.data.fecha_egreso:isset = false || @request.data.fecha_egreso = fecha_egreso || estado != "Baja")'
  dao.saveCollection(collection)
})
