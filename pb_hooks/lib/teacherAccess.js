function findFirst(dao, collection, field, value) {
  try {
    return dao.findFirstRecordByData(collection, field, value)
  } catch (error) {
    return null
  }
}

function findByFilter(dao, collection, filter, sort, params) {
  return dao.findRecordsByFilter(collection, filter, sort || "", 0, 0, params || {})
}

function findFirstByFilter(dao, collection, filter, params) {
  try {
    return dao.findFirstRecordByFilter(collection, filter, params || {})
  } catch (error) {
    return null
  }
}

function noStore(c) {
  c.response().header().set("Cache-Control", "no-store, max-age=0")
  c.response().header().set("Pragma", "no-cache")
}

function parseExpiration(value) {
  if (!value) return null
  var normalized = value.replace(" ", "T")
  var timestamp = new Date(normalized).getTime()
  return isNaN(timestamp) ? null : timestamp
}

function requireAccess(c) {
  noStore(c)
  var secret = c.request().header.get("X-CYS-Teacher-Token")
  if (!secret || secret.length < 20 || secret.length > 160) {
    throw new UnauthorizedError("El enlace no es válido o ya no está disponible.")
  }

  var dao = $app.dao()
  var record = findFirst(dao, "tokens_acceso_docente", "token_hash", $security.sha256(secret))
  if (!record || !record.getBool("activo")) {
    throw new UnauthorizedError("El enlace no es válido o ya no está disponible.")
  }

  var expiration = parseExpiration(record.getString("fecha_expiracion"))
  if (expiration !== null && expiration <= Date.now()) {
    throw new UnauthorizedError("El enlace no es válido o ya no está disponible.")
  }

  var courseId = record.getString("curso_id")
  var periodId = record.getString("periodo_id")
  if (!courseId || !periodId) {
    throw new UnauthorizedError("El enlace no es válido o ya no está disponible.")
  }

  return record
}

function requireRecord(dao, collection, id) {
  if (!id || !/^[a-z0-9]{15}$/.test(id)) {
    throw new BadRequestError("La referencia recibida no es válida.")
  }
  try {
    return dao.findRecordById(collection, id)
  } catch (error) {
    throw new BadRequestError("La referencia recibida no existe.")
  }
}

function courseMaterials(dao, access) {
  var courseId = access.getString("curso_id")
  var subjectId = access.getString("materia_id")
  var records = findByFilter(
    dao,
    "curso_materias",
    "curso_id = {:courseId}",
    "orden_visual",
    { courseId: courseId }
  )
  if (!subjectId) return records
  return records.filter((record) => record.getString("materia_id") === subjectId)
}

function allowedMaterialMap(dao, access) {
  var result = {}
  courseMaterials(dao, access).forEach((record) => {
    result[record.getId()] = record
  })
  return result
}

function requireEnrollment(dao, access, enrollmentId) {
  var enrollment = requireRecord(dao, "inscripciones", enrollmentId)
  if (
    enrollment.getString("curso_id") !== access.getString("curso_id") ||
    enrollment.getString("estado") === "Baja"
  ) {
    throw new ForbiddenError("El alumno no pertenece al alcance de este enlace.")
  }
  return enrollment
}

function scaleValueMap(dao, access) {
  var course = requireRecord(dao, "cursos", access.getString("curso_id"))
  var scaleId = course.getString("escala_id")
  var result = {}
  if (!scaleId) return result
  findByFilter(
    dao,
    "valores_escala",
    "escala_id = {:scaleId}",
    "orden_visual",
    { scaleId: scaleId }
  ).forEach((record) => {
    result[record.getId()] = record
  })
  return result
}

function criteriaMap(dao, courseMaterialId) {
  var result = {}
  findByFilter(
    dao,
    "criterios_evaluacion",
    "curso_materia_id = {:courseMaterialId}",
    "orden_visual",
    { courseMaterialId: courseMaterialId }
  ).forEach((record) => {
    result[record.getId()] = record
  })
  return result
}

function tokenDto(record) {
  return {
    id: record.getId(),
    cursoId: record.getString("curso_id"),
    periodoId: record.getString("periodo_id"),
    materiaId: record.getString("materia_id") || null,
    docenteNombre: record.getString("docente_nombre"),
    fechaExpiracion: record.getString("fecha_expiracion") || null,
    activo: record.getBool("activo")
  }
}

function materialDto(dao, record) {
  var subject = requireRecord(dao, "materias", record.getString("materia_id"))
  return {
    id: record.getId(),
    cursoId: record.getString("curso_id"),
    materiaId: subject.getId(),
    materiaNombre: subject.getString("nombre"),
    ordenVisual: record.getInt("orden_visual")
  }
}

function context(c) {
  var access = requireAccess(c)
  var dao = $app.dao()
  var course = requireRecord(dao, "cursos", access.getString("curso_id"))
  var period = requireRecord(dao, "periodos", access.getString("periodo_id"))
  var materials = courseMaterials(dao, access)
  var valuesById = scaleValueMap(dao, access)
  var values = Object.keys(valuesById).map((id) => valuesById[id])
  var enrollments = findByFilter(
    dao,
    "inscripciones",
    "curso_id = {:courseId} && estado != 'Baja'",
    "numero_orden",
    { courseId: course.getId() }
  )

  var students = enrollments.map((enrollment) => {
    var student = requireRecord(dao, "alumnos", enrollment.getString("alumno_id"))
    return {
      inscripcionId: enrollment.getId(),
      numeroOrden: enrollment.getInt("numero_orden") || null,
      apellidos: student.getString("apellidos"),
      nombres: student.getString("nombres"),
      nombreCompleto: (student.getString("apellidos") + ", " + student.getString("nombres")).trim()
    }
  })

  var criteria = {}
  materials.forEach((material) => {
    var materialCriteria = criteriaMap(dao, material.getId())
    criteria[material.getId()] = Object.keys(materialCriteria).map((id) => {
      var record = materialCriteria[id]
      return {
        id: record.getId(),
        cursoMateriaId: record.getString("curso_materia_id"),
        nombre: record.getString("nombre"),
        ordenVisual: record.getInt("orden_visual")
      }
    })
  })

  return c.json(200, {
    acceso: tokenDto(access),
    curso: {
      id: course.getId(),
      nombre: course.getString("nombre"),
      turno: course.getString("turno"),
      escalaId: course.getString("escala_id")
    },
    periodo: {
      id: period.getId(),
      nombre: period.getString("nombre"),
      numeroPeriodo: period.getInt("numero_periodo")
    },
    materias: materials.map((record) => materialDto(dao, record)),
    criterios: criteria,
    valoresEscala: values.map((record) => ({
      id: record.getId(),
      escalaId: record.getString("escala_id"),
      etiqueta: record.getString("etiqueta"),
      pesoNumerico: record.getInt("peso_numerico"),
      ordenVisual: record.getInt("orden_visual")
    })),
    alumnos: students
  })
}

function student(c) {
  var access = requireAccess(c)
  var dao = $app.dao()
  var enrollment = requireEnrollment(dao, access, c.pathParam("inscripcionId"))
  var periodId = access.getString("periodo_id")
  var materials = allowedMaterialMap(dao, access)
  var evaluations = findByFilter(
    dao,
    "evaluaciones_materia",
    "inscripcion_id = {:enrollmentId} && periodo_id = {:periodId}",
    "",
    { enrollmentId: enrollment.getId(), periodId: periodId }
  ).filter((record) => Boolean(materials[record.getString("curso_materia_id")]))

  var evaluationDtos = evaluations.map((evaluation) => {
    var criteria = findByFilter(
      dao,
      "evaluaciones_criterios",
      "evaluacion_materia_id = {:evaluationId}",
      "",
      { evaluationId: evaluation.getId() }
    )
    return {
      id: evaluation.getId(),
      cursoMateriaId: evaluation.getString("curso_materia_id"),
      ppi: evaluation.getBool("ppi"),
      calificacionGeneralId: evaluation.getString("calificacion_general_id") || null,
      criterios: criteria.map((record) => ({
        criterioId: record.getString("criterio_id"),
        valorEscalaId: record.getString("valor_escala_id")
      }))
    }
  })

  var fullScope = !access.getString("materia_id")
  var closure = null
  if (fullScope) {
    var closureRecord = findFirstByFilter(
      dao,
      "cierres_periodo_alumno",
      "inscripcion_id = {:enrollmentId} && periodo_id = {:periodId}",
      { enrollmentId: enrollment.getId(), periodId: periodId }
    )
    if (closureRecord) {
      closure = {
        id: closureRecord.getId(),
        asistencias: closureRecord.getInt("asistencias"),
        inasistencias: closureRecord.getInt("inasistencias"),
        llegadasTarde: closureRecord.getInt("llegadas_tarde"),
        observaciones: closureRecord.getString("observaciones")
      }
    }
  }

  return c.json(200, {
    evaluaciones: evaluationDtos,
    cierre: closure,
    apoyos: fullScope ? {
      promocionoConAcompanamiento: enrollment.getString("promociono_con_acompanamiento") || "-",
      poseeApoyos: enrollment.getString("posee_apoyos") || "-",
      cualesApoyos: enrollment.getString("cuales_apoyos")
    } : null
  })
}

function stringValue(value, maxLength) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, maxLength)
}

function boundedInteger(value, maximum) {
  var number = Number(value)
  if (!isFinite(number) || number < 0 || number > maximum || Math.floor(number) !== number) {
    throw new BadRequestError("Se recibió un valor numérico fuera de rango.")
  }
  return number
}

function saveEvaluation(txDao, access, enrollment, input, materials, values) {
  var courseMaterialId = stringValue(input.cursoMateriaId, 15)
  var material = materials[courseMaterialId]
  if (!material) {
    throw new ForbiddenError("Una materia no pertenece al alcance de este enlace.")
  }

  var generalValueId = stringValue(input.calificacionGeneralId, 15)
  if (generalValueId && !values[generalValueId]) {
    throw new BadRequestError("La calificación general no pertenece a la escala del curso.")
  }

  var allowedCriteria = criteriaMap(txDao, courseMaterialId)
  var submittedCriteria = Array.isArray(input.criterios) ? input.criterios : []
  if (submittedCriteria.length > 30) {
    throw new BadRequestError("Se recibieron demasiados criterios de evaluación.")
  }

  var normalizedCriteria = submittedCriteria.map((item) => {
    var criterionId = stringValue(item.criterioId, 15)
    var valueId = stringValue(item.valorEscalaId, 15)
    if (!allowedCriteria[criterionId] || !values[valueId]) {
      throw new BadRequestError("Un criterio o valor no pertenece a la planilla habilitada.")
    }
    return { criterioId: criterionId, valorEscalaId: valueId }
  })

  var periodId = access.getString("periodo_id")
  var evaluation = findFirstByFilter(
    txDao,
    "evaluaciones_materia",
    "inscripcion_id = {:enrollmentId} && curso_materia_id = {:courseMaterialId} && periodo_id = {:periodId}",
    { enrollmentId: enrollment.getId(), courseMaterialId: courseMaterialId, periodId: periodId }
  )
  if (!evaluation) {
    evaluation = new Record(txDao.findCollectionByNameOrId("evaluaciones_materia"))
    evaluation.set("inscripcion_id", enrollment.getId())
    evaluation.set("curso_materia_id", courseMaterialId)
    evaluation.set("periodo_id", periodId)
  }
  evaluation.set("ppi", Boolean(input.ppi))
  evaluation.set("calificacion_general_id", generalValueId)
  txDao.saveRecord(evaluation)

  var existing = findByFilter(
    txDao,
    "evaluaciones_criterios",
    "evaluacion_materia_id = {:evaluationId}",
    "",
    { evaluationId: evaluation.getId() }
  )
  var submittedMap = {}
  normalizedCriteria.forEach((item) => {
    submittedMap[item.criterioId] = item.valorEscalaId
  })

  existing.forEach((record) => {
    var criterionId = record.getString("criterio_id")
    if (!submittedMap[criterionId]) {
      txDao.deleteRecord(record)
    }
  })

  normalizedCriteria.forEach((item) => {
    var record = existing.find((candidate) => candidate.getString("criterio_id") === item.criterioId)
    if (!record) {
      record = new Record(txDao.findCollectionByNameOrId("evaluaciones_criterios"))
      record.set("evaluacion_materia_id", evaluation.getId())
      record.set("criterio_id", item.criterioId)
    }
    record.set("valor_escala_id", item.valorEscalaId)
    txDao.saveRecord(record)
  })
}

function saveClosure(txDao, access, enrollment, input) {
  if (access.getString("materia_id")) {
    throw new ForbiddenError("Este enlace no permite modificar el cierre del período.")
  }
  var periodId = access.getString("periodo_id")
  var record = findFirstByFilter(
    txDao,
    "cierres_periodo_alumno",
    "inscripcion_id = {:enrollmentId} && periodo_id = {:periodId}",
    { enrollmentId: enrollment.getId(), periodId: periodId }
  )
  if (!record) {
    record = new Record(txDao.findCollectionByNameOrId("cierres_periodo_alumno"))
    record.set("inscripcion_id", enrollment.getId())
    record.set("periodo_id", periodId)
  }
  record.set("asistencias", boundedInteger(input.asistencias, 180))
  record.set("inasistencias", boundedInteger(input.inasistencias, 180))
  record.set("llegadas_tarde", boundedInteger(input.llegadasTarde, 180))
  record.set("observaciones", stringValue(input.observaciones, 300))
  txDao.saveRecord(record)
}

function saveSupport(txDao, access, enrollment, input) {
  if (access.getString("materia_id")) {
    throw new ForbiddenError("Este enlace no permite modificar apoyos del alumno.")
  }
  var promotion = stringValue(input.promocionoConAcompanamiento, 2) || "-"
  var support = stringValue(input.poseeApoyos, 2) || "-"
  if (["SI", "NO", "-"].indexOf(promotion) === -1 || ["SI", "NO", "-"].indexOf(support) === -1) {
    throw new BadRequestError("El estado de apoyos no es válido.")
  }
  enrollment.set("promociono_con_acompanamiento", promotion)
  enrollment.set("posee_apoyos", support)
  enrollment.set("cuales_apoyos", support === "SI" ? stringValue(input.cualesApoyos, 1000) : "")
  txDao.saveRecord(enrollment)
}

function saveStudent(c) {
  var access = requireAccess(c)
  var dao = $app.dao()
  var enrollmentId = c.pathParam("inscripcionId")
  requireEnrollment(dao, access, enrollmentId)

  var body = new DynamicModel({ materias: [], cierre: {}, apoyos: {} })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  var evaluations = Array.isArray(data.materias) ? data.materias : []
  if (evaluations.length > 20) {
    throw new BadRequestError("Se recibieron demasiadas materias.")
  }

  $app.dao().runInTransaction((txDao) => {
    var transactionalEnrollment = requireEnrollment(txDao, access, enrollmentId)
    var materials = allowedMaterialMap(txDao, access)
    var values = scaleValueMap(txDao, access)
    evaluations.forEach((input) => saveEvaluation(txDao, access, transactionalEnrollment, input, materials, values))
    if (data.cierre && Object.keys(data.cierre).length > 0) {
      saveClosure(txDao, access, transactionalEnrollment, data.cierre)
    }
    if (data.apoyos && Object.keys(data.apoyos).length > 0) {
      saveSupport(txDao, access, transactionalEnrollment, data.apoyos)
    }
  })

  return student(c)
}

function issue(c) {
  noStore(c)
  var body = new DynamicModel({
    cursoId: "",
    periodoId: "",
    materiaId: "",
    docenteNombre: "",
    fechaExpiracion: ""
  })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  var dao = $app.dao()
  var course = requireRecord(dao, "cursos", stringValue(data.cursoId, 15))
  var period = requireRecord(dao, "periodos", stringValue(data.periodoId, 15))
  var subjectId = stringValue(data.materiaId, 15)
  var teacherName = stringValue(data.docenteNombre, 120)
  var expiration = stringValue(data.fechaExpiracion, 40)

  if (!teacherName) {
    throw new BadRequestError("El nombre del docente es obligatorio.")
  }
  if (subjectId) {
    requireRecord(dao, "materias", subjectId)
    var relation = findFirstByFilter(
      dao,
      "curso_materias",
      "curso_id = {:courseId} && materia_id = {:subjectId}",
      { courseId: course.getId(), subjectId: subjectId }
    )
    if (!relation) {
      throw new BadRequestError("La materia no pertenece al curso seleccionado.")
    }
  }
  if (expiration) {
    var expirationTime = parseExpiration(expiration)
    if (expirationTime === null || expirationTime <= Date.now()) {
      throw new BadRequestError("La fecha de expiración debe ser futura.")
    }
  }

  var record = new Record(dao.findCollectionByNameOrId("tokens_acceso_docente"))
  var secret = assignSecret(record)
  record.set("curso_id", course.getId())
  record.set("periodo_id", period.getId())
  record.set("materia_id", subjectId)
  record.set("docente_nombre", teacherName)
  record.set("activo", true)
  record.set("fecha_expiracion", expiration)
  dao.saveRecord(record)

  return c.json(201, {
    enlace: tokenDto(record),
    tokenPrefijo: record.getString("token_prefijo"),
    secreto: secret
  })
}

function assignSecret(record) {
  var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
  var secret = "cys_" + $security.randomStringWithAlphabet(43, alphabet)
  var hash = $security.sha256(secret)
  record.set("token", hash)
  record.set("token_hash", hash)
  record.set("token_prefijo", secret.slice(0, 12))
  return secret
}

function rotate(c) {
  noStore(c)
  var dao = $app.dao()
  var record = requireRecord(dao, "tokens_acceso_docente", c.pathParam("tokenId"))
  var secret = assignSecret(record)
  record.set("activo", true)
  dao.saveRecord(record)
  return c.json(200, {
    enlace: tokenDto(record),
    tokenPrefijo: record.getString("token_prefijo"),
    secreto: secret
  })
}

module.exports = {
  context: context,
  student: student,
  saveStudent: saveStudent,
  issue: issue,
  rotate: rotate
}
