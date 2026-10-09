migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("registros_asistencia_curso")
  collection.schema.addField(new SchemaField({ id: "attrevision001", name: "revision", type: "number", options: { min: 0, max: null, noDecimal: true } }))
  dao.saveCollection(collection)
  const cycle = dao.findCollectionByNameOrId("ciclos_lectivos")
  cycle.schema.addField(new SchemaField({ id: "attcalrev00001", name: "revision_calendario", type: "number", options: { min: 0, max: null, noDecimal: true } }))
  cycle.updateRule = '@request.auth.id != "" && (@request.data.revision_calendario:isset = false || @request.data.revision_calendario = revision_calendario)'
  cycle.createRule = '@request.auth.id != "" && @request.data.revision_calendario:isset = false'
  dao.saveCollection(cycle)
  for (const name of ["asistencias_diarias", "registros_asistencia_curso", "meses_calendario", "eventos_calendario"]) {
    const target = dao.findCollectionByNameOrId(name)
    target.createRule = null
    target.updateRule = null
    target.deleteRule = null
    dao.saveCollection(target)
  }
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("registros_asistencia_curso")
  collection.schema.removeField("attrevision001")
  dao.saveCollection(collection)
  const cycle = dao.findCollectionByNameOrId("ciclos_lectivos")
  cycle.schema.removeField("attcalrev00001")
  cycle.updateRule = '@request.auth.id != ""'
  cycle.createRule = '@request.auth.id != ""'
  dao.saveCollection(cycle)
  for (const name of ["asistencias_diarias", "registros_asistencia_curso", "meses_calendario", "eventos_calendario"]) {
    const target = dao.findCollectionByNameOrId(name)
    target.createRule = '@request.auth.id != ""'
    target.updateRule = '@request.auth.id != ""'
    target.deleteRule = '@request.auth.id != ""'
    dao.saveCollection(target)
  }
})
