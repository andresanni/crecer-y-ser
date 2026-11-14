migrate((db) => {
  const dao = new Dao(db)
  const specs = [
    {
      collection: "evaluaciones_materia",
      name: "idx_evaluaciones_materia_periodo_inscripcion",
      sql: "CREATE INDEX `idx_evaluaciones_materia_periodo_inscripcion` ON `evaluaciones_materia` (`periodo_id`, `inscripcion_id`)"
    },
    {
      collection: "evaluaciones_criterios",
      name: "idx_evaluaciones_criterios_eval_materia",
      sql: "CREATE INDEX `idx_evaluaciones_criterios_eval_materia` ON `evaluaciones_criterios` (`evaluacion_materia_id`)"
    },
    {
      collection: "cierres_periodo_alumno",
      name: "idx_cierres_periodo_alumno_periodo_inscripcion",
      sql: "CREATE INDEX `idx_cierres_periodo_alumno_periodo_inscripcion` ON `cierres_periodo_alumno` (`periodo_id`, `inscripcion_id`)"
    }
  ]

  specs.forEach((spec) => {
    const collection = dao.findCollectionByNameOrId(spec.collection)
    if (!collection.indexes.some((index) => index.includes(spec.name))) {
      collection.indexes.push(spec.sql)
      dao.saveCollection(collection)
    }
  })
}, (db) => {
  const dao = new Dao(db)
  const specs = [
    { collection: "evaluaciones_materia", name: "idx_evaluaciones_materia_periodo_inscripcion" },
    { collection: "evaluaciones_criterios", name: "idx_evaluaciones_criterios_eval_materia" },
    { collection: "cierres_periodo_alumno", name: "idx_cierres_periodo_alumno_periodo_inscripcion" }
  ]

  specs.forEach((spec) => {
    const collection = dao.findCollectionByNameOrId(spec.collection)
    collection.indexes = collection.indexes.filter((index) => !index.includes(spec.name))
    dao.saveCollection(collection)
  })
})
