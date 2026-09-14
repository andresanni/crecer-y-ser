migrate((db) => {
  const dao = new Dao(db)
  const authenticated = '@request.auth.id != ""'
  const readCollections = [
    "alumnos",
    "criterios_evaluacion",
    "curso_materias",
    "cursos",
    "escalas_calificacion",
    "evaluaciones_criterios",
    "evaluaciones_materia",
    "inscripciones",
    "materias",
    "periodos",
    "valores_escala",
    "cierres_periodo_alumno",
    "tokens_acceso_docente"
  ]
  const writeCollections = [
    "evaluaciones_criterios",
    "evaluaciones_materia",
    "inscripciones",
    "cierres_periodo_alumno"
  ]

  readCollections.forEach((name) => {
    const collection = dao.findCollectionByNameOrId(name)
    collection.listRule = authenticated
    collection.viewRule = authenticated
    dao.saveCollection(collection)
  })

  writeCollections.forEach((name) => {
    const collection = dao.findCollectionByNameOrId(name)
    collection.createRule = authenticated
    collection.updateRule = authenticated
    dao.saveCollection(collection)
  })

  const tokens = dao.findRecordsByFilter("tokens_acceso_docente", "token_hash = ''", "", 0, 0, {})
  tokens.forEach((record) => {
    const secret = record.getString("token")
    if (!secret) return
    const alreadyHashed = /^[a-f0-9]{64}$/.test(secret)
    const hash = alreadyHashed ? secret : $security.sha256(secret)
    record.set("token", hash)
    record.set("token_hash", hash)
    if (!record.getString("token_prefijo")) {
      record.set("token_prefijo", alreadyHashed ? `hash_${record.getId().slice(0, 7)}` : secret.slice(0, 12))
    }
    dao.saveRecord(record)
  })
}, (db) => {
  const dao = new Dao(db)
  const readCollections = [
    "alumnos",
    "criterios_evaluacion",
    "curso_materias",
    "cursos",
    "escalas_calificacion",
    "evaluaciones_criterios",
    "evaluaciones_materia",
    "inscripciones",
    "materias",
    "periodos",
    "valores_escala",
    "cierres_periodo_alumno",
    "tokens_acceso_docente"
  ]
  const writeCollections = [
    "evaluaciones_criterios",
    "evaluaciones_materia",
    "inscripciones",
    "cierres_periodo_alumno"
  ]

  readCollections.forEach((name) => {
    const collection = dao.findCollectionByNameOrId(name)
    collection.listRule = ""
    collection.viewRule = ""
    dao.saveCollection(collection)
  })

  writeCollections.forEach((name) => {
    const collection = dao.findCollectionByNameOrId(name)
    collection.createRule = ""
    collection.updateRule = ""
    dao.saveCollection(collection)
  })
})
