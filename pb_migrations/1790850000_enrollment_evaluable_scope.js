migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("inscripciones")
  collection.schema.addField(new SchemaField({ id: "cysfirstterm001", name: "bimestre_desde", type: "number", options: { min: 0, max: 4, noDecimal: true } }))
  collection.schema.addField(new SchemaField({ id: "cyslastterm0001", name: "bimestre_hasta", type: "number", options: { min: 0, max: 4, noDecimal: true } }))
  collection.schema.addField(new SchemaField({ id: "cysscopestate01", name: "cursada_estado", type: "select", options: { maxSelect: 1, values: ["PENDIENTE", "CONFIRMADA", "SIN_CURSADA"] } }))
  collection.schema.addField(new SchemaField({ id: "cysscoperev0001", name: "revision_cursada", type: "number", options: { min: 0, max: null, noDecimal: true } }))
  const protectedFields = ["bimestre_desde", "bimestre_hasta", "cursada_estado", "revision_cursada"]
  collection.createRule = '@request.auth.id != "" && (@request.data.estado:isset = false || @request.data.estado != "Baja") && ' + protectedFields.map((field) => '@request.data.' + field + ':isset = false').join(' && ')
  collection.updateRule = '@request.auth.id != "" && ' + protectedFields.concat(["alumno_id", "curso_id", "ciclo_id"]).map((field) => '(@request.data.' + field + ':isset = false || @request.data.' + field + ' = ' + field + ')').join(' && ') + ' && (@request.data.estado:isset = false || @request.data.estado = estado || (estado != "Baja" && @request.data.estado != "Baja")) && (@request.data.fecha_egreso:isset = false || @request.data.fecha_egreso = fecha_egreso || estado != "Baja")'
  dao.saveCollection(collection)
  db.newQuery("UPDATE inscripciones SET cursada_estado = 'PENDIENTE'").execute()
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("inscripciones")
  ;["cysfirstterm001", "cyslastterm0001", "cysscopestate01", "cysscoperev0001"].forEach((id) => collection.schema.removeField(id))
  collection.createRule = '@request.auth.id != ""'
  collection.updateRule = '@request.auth.id != ""'
  dao.saveCollection(collection)
})
