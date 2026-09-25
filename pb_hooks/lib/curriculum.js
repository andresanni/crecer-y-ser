function requireRecord(dao, collection, id) {
  if (!id || !/^[a-z0-9]{15}$/.test(id)) throw new BadRequestError("La referencia no es válida.")
  try {
    return dao.findRecordById(collection, id)
  } catch (_) {
    throw new BadRequestError("La referencia no existe.")
  }
}

function findRecords(dao, collection, filter, params) {
  return dao.findRecordsByFilter(collection, filter, "", 0, 0, params)
}

function configurationLocked(dao, courseId, cycleId) {
  requireRecord(dao, "cursos", courseId)
  requireRecord(dao, "ciclos_lectivos", cycleId)
  var periods = findRecords(dao, "periodos", "ciclo_id = {:cycleId}", { cycleId: cycleId })
  return periods.some((period) => {
    var workflows = findRecords(
      dao,
      "instancias_carga_boletin",
      "curso_id = {:courseId} && periodo_id = {:periodId}",
      { courseId: courseId, periodId: period.getId() }
    )
    return workflows.length > 0
  })
}

function requireEditable(dao, courseId, cycleId) {
  if (configurationLocked(dao, courseId, cycleId)) {
    throw new ForbiddenError("La configuración anual está cerrada porque comenzó la carga de un bimestre.")
  }
}

function configurationStatus(c) {
  var dao = $app.dao()
  var locked = configurationLocked(dao, c.pathParam("cursoId"), c.pathParam("cicloId"))
  return c.json(200, { editable: !locked })
}

function materialDto(dao, material) {
  var subject = requireRecord(dao, "materias", material.getString("materia_id"))
  return {
    id: material.getId(),
    cursoId: material.getString("curso_id"),
    cicloId: material.getString("ciclo_id"),
    materiaId: material.getString("materia_id"),
    materiaNombre: subject.getString("nombre"),
    ordenVisual: material.getInt("orden_visual")
  }
}

function criterionDto(criterion) {
  return {
    id: criterion.getId(),
    cursoMateriaId: criterion.getString("curso_materia_id"),
    nombre: criterion.getString("nombre"),
    ordenVisual: criterion.getInt("orden_visual")
  }
}

function assignMaterial(c) {
  var body = new DynamicModel({ cursoId: "", cicloId: "", materiaId: "", ordenVisual: 0 })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  var result
  $app.dao().runInTransaction((txDao) => {
    requireEditable(txDao, data.cursoId, data.cicloId)
    requireRecord(txDao, "materias", data.materiaId)
    var existing = findRecords(
      txDao,
      "curso_materias",
      "curso_id = {:courseId} && ciclo_id = {:cycleId} && materia_id = {:subjectId}",
      { courseId: data.cursoId, cycleId: data.cicloId, subjectId: data.materiaId }
    )
    if (existing.length > 0) throw new BadRequestError("La materia ya pertenece a este curso y ciclo.")
    var material = new Record(txDao.findCollectionByNameOrId("curso_materias"))
    material.set("curso_id", data.cursoId)
    material.set("ciclo_id", data.cicloId)
    material.set("materia_id", data.materiaId)
    material.set("orden_visual", Math.max(1, Number(data.ordenVisual) || 1))
    txDao.saveRecord(material)
    result = materialDto(txDao, material)
  })
  return c.json(201, result)
}

function removeMaterial(c) {
  $app.dao().runInTransaction((txDao) => {
    var material = requireRecord(txDao, "curso_materias", c.pathParam("cursoMateriaId"))
    requireEditable(txDao, material.getString("curso_id"), material.getString("ciclo_id"))
    var criteria = findRecords(
      txDao,
      "criterios_evaluacion",
      "curso_materia_id = {:materialId}",
      { materialId: material.getId() }
    )
    criteria.forEach((criterion) => txDao.deleteRecord(criterion))
    txDao.deleteRecord(material)
  })
  return c.json(200, { removed: true })
}

function reorderMaterials(c) {
  var body = new DynamicModel({ items: [] })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  if (!Array.isArray(data.items) || data.items.length === 0 || data.items.length > 30) {
    throw new BadRequestError("El orden recibido no es válido.")
  }
  $app.dao().runInTransaction((txDao) => {
    var courseId = ""
    var cycleId = ""
    var seen = {}
    data.items.forEach((item) => {
      var material = requireRecord(txDao, "curso_materias", item.id)
      if (!courseId) {
        courseId = material.getString("curso_id")
        cycleId = material.getString("ciclo_id")
        requireEditable(txDao, courseId, cycleId)
      }
      if (seen[item.id] || material.getString("curso_id") !== courseId || material.getString("ciclo_id") !== cycleId) {
        throw new BadRequestError("Las materias deben pertenecer al mismo curso y ciclo.")
      }
      var order = Number(item.orden_visual)
      if (!isFinite(order) || order < 1 || Math.floor(order) !== order) {
        throw new BadRequestError("El orden recibido no es válido.")
      }
      seen[item.id] = true
      material.set("orden_visual", order)
      txDao.saveRecord(material)
    })
  })
  return c.json(200, { updated: true })
}

function saveCriteria(c) {
  var body = new DynamicModel({ criterios: [] })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  if (!Array.isArray(data.criterios) || data.criterios.length > 5) {
    throw new BadRequestError("Se admiten hasta cinco criterios.")
  }
  var result
  $app.dao().runInTransaction((txDao) => {
    var material = requireRecord(txDao, "curso_materias", c.pathParam("cursoMateriaId"))
    requireEditable(txDao, material.getString("curso_id"), material.getString("ciclo_id"))
    var existing = findRecords(
      txDao,
      "criterios_evaluacion",
      "curso_materia_id = {:materialId}",
      { materialId: material.getId() }
    )
    var existingById = {}
    existing.forEach((criterion) => { existingById[criterion.getId()] = criterion })
    var seen = {}
    result = []
    data.criterios.forEach((item, index) => {
      var name = typeof item.nombre === "string" ? item.nombre.trim() : ""
      if (!name || name.length > 250 || (item.id && (!existingById[item.id] || seen[item.id]))) {
        throw new BadRequestError("Los criterios recibidos no son válidos.")
      }
      var criterion = item.id
        ? existingById[item.id]
        : new Record(txDao.findCollectionByNameOrId("criterios_evaluacion"))
      criterion.set("curso_materia_id", material.getId())
      criterion.set("nombre", name)
      criterion.set("orden_visual", index + 1)
      txDao.saveRecord(criterion)
      seen[criterion.getId()] = true
      result.push(criterionDto(criterion))
    })
    existing.forEach((criterion) => {
      if (!seen[criterion.getId()]) txDao.deleteRecord(criterion)
    })
  })
  return c.json(200, { criterios: result })
}

module.exports = {
  configurationStatus: configurationStatus,
  assignMaterial: assignMaterial,
  removeMaterial: removeMaterial,
  reorderMaterials: reorderMaterials,
  saveCriteria: saveCriteria
}
