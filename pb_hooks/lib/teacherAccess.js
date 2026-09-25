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

function teacherLinkKey() {
  var key = $os.getenv("CYS_TEACHER_LINK_KEY")
  if (!key || key.length !== 32) {
    throw new InternalServerError("La clave de enlaces docentes no está configurada.")
  }
  return key
}

function validateAccessRecord(record) {
  if (!record) {
    throw new UnauthorizedError("El enlace no es válido o ya no está disponible.")
  }

  var courseId = record.getString("curso_id")
  var periodId = record.getString("periodo_id")
  if (!courseId || !periodId || record.getString("materia_id")) {
    throw new UnauthorizedError("El enlace no es válido o ya no está disponible.")
  }

  return record
}

function requireAccess(c) {
  noStore(c)
  var secret = c.request().header.get("X-CYS-Teacher-Token")
  if (!secret || secret.length < 20 || secret.length > 160) {
    throw new UnauthorizedError("El enlace no es válido o ya no está disponible.")
  }

  var dao = $app.dao()
  var record = findFirst(dao, "tokens_acceso_docente", "token_hash", $security.sha256(secret))
  return validateAccessRecord(record)
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

function findWorkflow(dao, courseId, periodId) {
  return findFirstByFilter(
    dao,
    "instancias_carga_boletin",
    "curso_id = {:courseId} && periodo_id = {:periodId}",
    { courseId: courseId, periodId: periodId }
  )
}

function workflowDto(record) {
  return {
    id: record.getId(),
    estado: record.getString("estado"),
    revision: record.getInt("revision"),
    enviadoAt: record.getString("enviado_at") || null,
    enviadoPor: record.getString("enviado_por") || null
  }
}

function requireDraftWorkflow(dao, access) {
  var workflow = findWorkflow(
    dao,
    access.getString("curso_id"),
    access.getString("periodo_id")
  )
  if (!workflow || workflow.getString("estado") !== "BORRADOR_DOCENTE") {
    throw new ForbiddenError("La carga docente ya no admite modificaciones.")
  }
  return workflow
}

function requireStaffWorkflow(dao, courseId, periodId) {
  var workflow = findWorkflow(dao, courseId, periodId)
  if (!workflow) {
    throw new BadRequestError("No existe una instancia de carga para el curso y período seleccionados.")
  }
  if (workflow.getString("estado") !== "CONTROL_DIRECTIVO") {
    throw new ForbiddenError("La planilla todavía no se encuentra bajo control directivo.")
  }
  return workflow
}

function ensureDraftWorkflow(dao, courseId, periodId) {
  var workflow = findWorkflow(dao, courseId, periodId)
  if (workflow) {
    if (workflow.getString("estado") !== "BORRADOR_DOCENTE") {
      throw new BadRequestError("El período ya se encuentra bajo control directivo.")
    }
    return workflow
  }
  workflow = new Record(dao.findCollectionByNameOrId("instancias_carga_boletin"))
  workflow.set("curso_id", courseId)
  workflow.set("periodo_id", periodId)
  workflow.set("estado", "BORRADOR_DOCENTE")
  workflow.set("revision", 0)
  dao.saveRecord(workflow)
  return workflow
}

function deleteOtherTokens(dao, courseId, periodId, exceptId) {
  var tokens = findByFilter(
    dao,
    "tokens_acceso_docente",
    "curso_id = {:courseId} && periodo_id = {:periodId}",
    "",
    { courseId: courseId, periodId: periodId }
  )
  tokens.forEach((token) => {
    if (token.getId() === exceptId) return
    dao.deleteRecord(token)
  })
}

function courseMaterials(dao, access) {
  var courseId = access.getString("curso_id")
  return findByFilter(
    dao,
    "curso_materias",
    "curso_id = {:courseId}",
    "orden_visual",
    { courseId: courseId }
  )
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
  var period = requireRecord(dao, "periodos", access.getString("periodo_id"))
  if (
    enrollment.getString("curso_id") !== access.getString("curso_id") ||
    enrollment.getString("ciclo_id") !== period.getString("ciclo_id") ||
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
    docenteNombre: record.getString("docente_nombre"),
    recuperable: Boolean(record.getString("token_cifrado"))
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

function isConductSubject(dao, courseMaterial) {
  var subject = requireRecord(dao, "materias", courseMaterial.getString("materia_id"))
  var name = subject.getString("nombre").trim().toUpperCase()
  return (
    name.indexOf("TRABAJO EN EL AULA") !== -1 ||
    name.indexOf("TRABAJO PERSONAL") !== -1 ||
    name.indexOf("CONVIVENCIA") !== -1 ||
    name.indexOf("CONDUCTA") !== -1
  )
}

function gradebookCompleteness(dao, access) {
  var courseId = access.getString("curso_id")
  var periodId = access.getString("periodo_id")
  var materials = courseMaterials(dao, access)
  var enrollments = findByFilter(
    dao,
    "inscripciones",
    "curso_id = {:courseId} && ciclo_id = {:cycleId} && estado != 'Baja'",
    "numero_orden",
    {
      courseId: courseId,
      cycleId: requireRecord(dao, "periodos", periodId).getString("ciclo_id")
    }
  )
  var pending = []

  enrollments.forEach((enrollment) => {
    var missingMaterials = []
    materials.forEach((material) => {
      var evaluation = findFirstByFilter(
        dao,
        "evaluaciones_materia",
        "inscripcion_id = {:enrollmentId} && curso_materia_id = {:courseMaterialId} && periodo_id = {:periodId}",
        {
          enrollmentId: enrollment.getId(),
          courseMaterialId: material.getId(),
          periodId: periodId
        }
      )
      var complete = Boolean(evaluation)
      if (complete && !isConductSubject(dao, material)) {
        complete = Boolean(evaluation.getString("calificacion_general_id"))
      }
      if (complete) {
        var criteria = criteriaMap(dao, material.getId())
        var submitted = findByFilter(
          dao,
          "evaluaciones_criterios",
          "evaluacion_materia_id = {:evaluationId}",
          "",
          { evaluationId: evaluation.getId() }
        )
        var submittedMap = {}
        submitted.forEach((item) => {
          if (item.getString("valor_escala_id")) {
            submittedMap[item.getString("criterio_id")] = true
          }
        })
        complete = Object.keys(criteria).every((criterionId) => Boolean(submittedMap[criterionId]))
      }
      if (!complete) {
        var subject = requireRecord(dao, "materias", material.getString("materia_id"))
        missingMaterials.push(subject.getString("nombre"))
      }
    })

    var closure = findFirstByFilter(
      dao,
      "cierres_periodo_alumno",
      "inscripcion_id = {:enrollmentId} && periodo_id = {:periodId}",
      { enrollmentId: enrollment.getId(), periodId: periodId }
    )
    if (missingMaterials.length > 0 || !closure) {
      var student = requireRecord(dao, "alumnos", enrollment.getString("alumno_id"))
      pending.push({
        inscripcionId: enrollment.getId(),
        nombreCompleto: (student.getString("apellidos") + ", " + student.getString("nombres")).trim(),
        materiasPendientes: missingMaterials,
        cierrePendiente: !closure
      })
    }
  })

  return {
    completa: enrollments.length > 0 && materials.length > 0 && pending.length === 0,
    totalAlumnos: enrollments.length,
    totalMaterias: materials.length,
    alumnosCompletos: enrollments.length - pending.length,
    pendientes: pending
  }
}

function context(c) {
  var access = requireAccess(c)
  var dao = $app.dao()
  var workflow = requireDraftWorkflow(dao, access)
  var course = requireRecord(dao, "cursos", access.getString("curso_id"))
  var period = requireRecord(dao, "periodos", access.getString("periodo_id"))
  var materials = courseMaterials(dao, access)
  var valuesById = scaleValueMap(dao, access)
  var values = Object.keys(valuesById).map((id) => valuesById[id])
  var enrollments = findByFilter(
    dao,
    "inscripciones",
    "curso_id = {:courseId} && ciclo_id = {:cycleId} && estado != 'Baja'",
    "numero_orden",
    { courseId: course.getId(), cycleId: period.getString("ciclo_id") }
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
    instancia: workflowDto(workflow),
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

function studentSnapshot(dao, access, enrollment) {
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

  var closure = null
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

  return {
    evaluaciones: evaluationDtos,
    cierre: closure,
    apoyos: {
      promocionoConAcompanamiento: enrollment.getString("promociono_con_acompanamiento") || "-",
      poseeApoyos: enrollment.getString("posee_apoyos") || "-",
      cualesApoyos: enrollment.getString("cuales_apoyos")
    }
  }
}

function student(c) {
  var access = requireAccess(c)
  var dao = $app.dao()
  requireDraftWorkflow(dao, access)
  var enrollment = requireEnrollment(dao, access, c.pathParam("inscripcionId"))
  return c.json(200, studentSnapshot(dao, access, enrollment))
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

  if (!isConductSubject(txDao, material) && !generalValueId) {
    throw new BadRequestError("La calificación general es obligatoria.")
  }

  var submittedCriterionMap = {}
  normalizedCriteria.forEach((item) => {
    submittedCriterionMap[item.criterioId] = true
  })
  if (Object.keys(allowedCriteria).some((criterionId) => !submittedCriterionMap[criterionId])) {
    throw new BadRequestError("Todos los criterios de evaluación son obligatorios.")
  }

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
  var promotion = stringValue(input.promocionoConAcompanamiento, 2) || "-"
  var support = stringValue(input.poseeApoyos, 2) || "-"
  if (["SI", "NO", "-"].indexOf(promotion) === -1 || ["SI", "NO", "-"].indexOf(support) === -1) {
    throw new BadRequestError("El estado de apoyos no es válido.")
  }
  var periodNumber = requireRecord(txDao, "periodos", access.getString("periodo_id")).getInt("numero_periodo")
  if (periodNumber === 1 && support === "-") support = "NO"
  if (periodNumber === 4 && promotion === "-") promotion = "NO"
  var supportDetail = support === "SI" ? stringValue(input.cualesApoyos, 1000) : ""
  if (support === "SI" && !supportDetail) {
    throw new BadRequestError("El detalle de los apoyos es obligatorio.")
  }
  enrollment.set("promociono_con_acompanamiento", promotion)
  enrollment.set("posee_apoyos", support)
  enrollment.set("cuales_apoyos", supportDetail)
  txDao.saveRecord(enrollment)
}

function applySupportDefaults(txDao, access) {
  var period = requireRecord(txDao, "periodos", access.getString("periodo_id"))
  var periodNumber = period.getInt("numero_periodo")
  if (periodNumber !== 1 && periodNumber !== 4) return

  var enrollments = findByFilter(
    txDao,
    "inscripciones",
    "curso_id = {:courseId} && ciclo_id = {:cycleId} && estado != 'Baja'",
    "numero_orden",
    {
      courseId: access.getString("curso_id"),
      cycleId: period.getString("ciclo_id")
    }
  )

  enrollments.forEach((enrollment) => {
    if (periodNumber === 1 && ["SI", "NO"].indexOf(enrollment.getString("posee_apoyos")) === -1) {
      enrollment.set("posee_apoyos", "NO")
      enrollment.set("cuales_apoyos", "")
      txDao.saveRecord(enrollment)
    }
    if (periodNumber === 4 && ["SI", "NO"].indexOf(enrollment.getString("promociono_con_acompanamiento")) === -1) {
      enrollment.set("promociono_con_acompanamiento", "NO")
      txDao.saveRecord(enrollment)
    }
  })
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
    var transactionalAccess = validateAccessRecord(
      requireRecord(txDao, "tokens_acceso_docente", access.getId())
    )
    var transactionalEnrollment = requireEnrollment(txDao, transactionalAccess, enrollmentId)
    var workflow = requireDraftWorkflow(txDao, transactionalAccess)
    var materials = allowedMaterialMap(txDao, transactionalAccess)
    var values = scaleValueMap(txDao, transactionalAccess)
    evaluations.forEach((input) => saveEvaluation(txDao, transactionalAccess, transactionalEnrollment, input, materials, values))
    if (data.cierre && Object.keys(data.cierre).length > 0) {
      saveClosure(txDao, transactionalAccess, transactionalEnrollment, data.cierre)
    }
    if (data.apoyos && Object.keys(data.apoyos).length > 0) {
      saveSupport(txDao, transactionalAccess, transactionalEnrollment, data.apoyos)
    }
    workflow.set("revision", workflow.getInt("revision") + 1)
    txDao.saveRecord(workflow)
  })

  return student(c)
}

function staffWorkflow(c) {
  noStore(c)
  var dao = $app.dao()
  var course = requireRecord(dao, "cursos", c.pathParam("cursoId"))
  var period = requireRecord(dao, "periodos", c.pathParam("periodoId"))
  var workflow = findWorkflow(dao, course.getId(), period.getId())
  return c.json(200, { instancia: workflow ? workflowDto(workflow) : null })
}

function staffStudent(c) {
  noStore(c)
  var enrollmentId = c.pathParam("inscripcionId")
  var periodId = stringValue(c.queryParam("periodoId"), 15)
  var response
  $app.dao().runInTransaction((txDao) => {
    var enrollment = requireRecord(txDao, "inscripciones", enrollmentId)
    var period = requireRecord(txDao, "periodos", periodId)
    if (enrollment.getString("ciclo_id") !== period.getString("ciclo_id") || enrollment.getString("estado") === "Baja") {
      throw new ForbiddenError("El alumno no pertenece al curso y ciclo seleccionados.")
    }
    var workflow = requireStaffWorkflow(txDao, enrollment.getString("curso_id"), period.getId())
    response = studentSnapshot(txDao, workflow, enrollment)
    response.revision = workflow.getInt("revision")
  })
  return c.json(200, response)
}

function saveStaffStudent(c) {
  noStore(c)
  var enrollmentId = c.pathParam("inscripcionId")
  var body = new DynamicModel({ periodoId: "", expectedRevision: -1, materias: [], cierre: {}, apoyos: {} })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  var periodId = stringValue(data.periodoId, 15)
  var expectedRevision = Number(data.expectedRevision)
  if (!isFinite(expectedRevision) || expectedRevision < 0 || Math.floor(expectedRevision) !== expectedRevision) {
    throw new BadRequestError("La revisión esperada de la planilla no es válida.")
  }
  var evaluations = Array.isArray(data.materias) ? data.materias : []
  if (evaluations.length > 20) {
    throw new BadRequestError("Se recibieron demasiadas materias.")
  }

  var response
  var conflictRevision = null
  $app.dao().runInTransaction((txDao) => {
    var enrollment = requireRecord(txDao, "inscripciones", enrollmentId)
    var courseId = enrollment.getString("curso_id")
    var period = requireRecord(txDao, "periodos", periodId)
    if (enrollment.getString("ciclo_id") !== period.getString("ciclo_id") || enrollment.getString("estado") === "Baja") {
      throw new ForbiddenError("El alumno no pertenece al curso y ciclo seleccionados.")
    }
    var workflow = requireStaffWorkflow(txDao, courseId, period.getId())
    if (workflow.getInt("revision") !== expectedRevision) {
      conflictRevision = workflow.getInt("revision")
      return
    }
    var materials = allowedMaterialMap(txDao, workflow)
    var values = scaleValueMap(txDao, workflow)
    evaluations.forEach((input) => saveEvaluation(txDao, workflow, enrollment, input, materials, values))
    if (data.cierre && Object.keys(data.cierre).length > 0) {
      saveClosure(txDao, workflow, enrollment, data.cierre)
    }
    if (data.apoyos && Object.keys(data.apoyos).length > 0) {
      saveSupport(txDao, workflow, enrollment, data.apoyos)
    }
    workflow.set("revision", workflow.getInt("revision") + 1)
    txDao.saveRecord(workflow)
    response = { instancia: workflowDto(workflow) }
  })

  if (conflictRevision !== null) {
    return c.json(409, {
      message: "La planilla fue modificada por otra sesión.",
      currentRevision: conflictRevision
    })
  }
  return c.json(200, response)
}

function submitPeriod(c) {
  var access = requireAccess(c)
  var status = 200
  var response

  $app.dao().runInTransaction((txDao) => {
    var transactionalAccess = validateAccessRecord(
      requireRecord(txDao, "tokens_acceso_docente", access.getId())
    )
    var workflow = requireDraftWorkflow(txDao, transactionalAccess)
    var completeness = gradebookCompleteness(txDao, transactionalAccess)
    if (!completeness.completa) {
      status = 422
      response = completeness
      return
    }

    applySupportDefaults(txDao, transactionalAccess)
    workflow.set("estado", "CONTROL_DIRECTIVO")
    workflow.set("revision", workflow.getInt("revision") + 1)
    workflow.set("enviado_at", new Date().toISOString())
    workflow.set("enviado_por", transactionalAccess.getString("docente_nombre"))
    txDao.saveRecord(workflow)
    deleteOtherTokens(
      txDao,
      transactionalAccess.getString("curso_id"),
      transactionalAccess.getString("periodo_id"),
      ""
    )
    response = {
      instancia: workflowDto(workflow),
      totalAlumnos: completeness.totalAlumnos,
      totalMaterias: completeness.totalMaterias
    }
  })

  return c.json(status, response)
}

function issue(c) {
  noStore(c)
  var body = new DynamicModel({
    cursoId: "",
    periodoId: "",
    materiaId: "",
    docenteNombre: ""
  })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  var dao = $app.dao()
  var course = requireRecord(dao, "cursos", stringValue(data.cursoId, 15))
  var period = requireRecord(dao, "periodos", stringValue(data.periodoId, 15))
  var teacherName = stringValue(data.docenteNombre, 120)

  if (!teacherName) {
    throw new BadRequestError("El nombre del docente es obligatorio.")
  }
  if (stringValue(data.materiaId, 15)) {
    throw new BadRequestError("Los enlaces docentes deben abarcar el curso completo.")
  }
  var response
  $app.dao().runInTransaction((txDao) => {
    ensureDraftWorkflow(txDao, course.getId(), period.getId())
    deleteOtherTokens(txDao, course.getId(), period.getId(), "")
    var record = new Record(txDao.findCollectionByNameOrId("tokens_acceso_docente"))
    var secret = assignSecret(record)
    record.set("curso_id", course.getId())
    record.set("periodo_id", period.getId())
    record.set("docente_nombre", teacherName)
    txDao.saveRecord(record)
    response = {
      enlace: tokenDto(record),
      tokenPrefijo: record.getString("token_prefijo"),
      secreto: secret
    }
  })

  return c.json(201, response)
}

function assignSecret(record) {
  var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
  var secret = "cys_" + $security.randomStringWithAlphabet(43, alphabet)
  var hash = $security.sha256(secret)
  record.set("token", hash)
  record.set("token_hash", hash)
  record.set("token_prefijo", secret.slice(0, 12))
  record.set("token_cifrado", $security.encrypt(secret, teacherLinkKey()))
  return secret
}

function recover(c) {
  noStore(c)
  var record = requireRecord($app.dao(), "tokens_acceso_docente", c.pathParam("tokenId"))
  validateAccessRecord(record)
  requireDraftWorkflow($app.dao(), record)
  var cipherText = record.getString("token_cifrado")
  if (!cipherText) {
    throw new BadRequestError("Este enlace legado debe regenerarse una vez antes de poder copiarlo.")
  }
  var secret = $security.decrypt(cipherText, teacherLinkKey())
  if (typeof secret !== "string" || $security.sha256(secret) !== record.getString("token_hash")) {
    throw new InternalServerError("No se pudo recuperar el enlace docente.")
  }
  return c.json(200, {
    secreto: secret,
    tokenPrefijo: record.getString("token_prefijo")
  })
}

function rotate(c) {
  noStore(c)
  var response
  $app.dao().runInTransaction((txDao) => {
    var record = requireRecord(txDao, "tokens_acceso_docente", c.pathParam("tokenId"))
    if (record.getString("materia_id")) {
      throw new BadRequestError("El enlace por materia debe reemplazarse por uno de curso completo.")
    }
    requireDraftWorkflow(txDao, record)
    deleteOtherTokens(
      txDao,
      record.getString("curso_id"),
      record.getString("periodo_id"),
      record.getId()
    )
    var secret = assignSecret(record)
    txDao.saveRecord(record)
    response = {
      enlace: tokenDto(record),
      tokenPrefijo: record.getString("token_prefijo"),
      secreto: secret
    }
  })
  return c.json(200, response)
}

module.exports = {
  context: context,
  student: student,
  saveStudent: saveStudent,
  staffWorkflow: staffWorkflow,
  staffStudent: staffStudent,
  saveStaffStudent: saveStaffStudent,
  submitPeriod: submitPeriod,
  issue: issue,
  rotate: rotate,
  recover: recover
}
