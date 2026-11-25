function noStore(c) {
  c.response().header().set("Cache-Control", "no-store, max-age=0")
  c.response().header().set("Pragma", "no-cache")
}

function stringValue(value, maxLength) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, maxLength)
}

function boundedInteger(value, maximum) {
  if (value === null || value === undefined || value === "") {
    throw new BadRequestError("Los valores numéricos de asistencia son obligatorios.")
  }
  var number = Number(value)
  if (!isFinite(number) || number < 0 || number > maximum || Math.floor(number) !== number) {
    throw new BadRequestError("Los valores de asistencia deben ser enteros entre 0 y " + maximum + ".")
  }
  return number
}

function readJsonRequestData(c) {
  try {
    var info = $apis.requestInfo(c)
    return JSON.parse(JSON.stringify(info.data || {}))
  } catch (_) {
    var body = new DynamicModel({})
    c.bind(body)
    return JSON.parse(JSON.stringify(body))
  }
}

function requireRecord(dao, collection, id) {
  if (!id) {
    throw new BadRequestError("Falta un identificador requerido.")
  }
  try {
    return dao.findRecordById(collection, id)
  } catch (_) {
    throw new NotFoundError("No se encontró el registro solicitado.")
  }
}

function findFirstByFilter(dao, collection, filter, params) {
  try {
    var items = dao.findRecordsByFilter(collection, filter, "", 1, 0, params || {})
    return items.length > 0 ? items[0] : null
  } catch (_) {
    return null
  }
}

function findByFilter(dao, collection, filter, sort, params) {
  try {
    return dao.findRecordsByFilter(collection, filter, sort || "", 0, 0, params || {})
  } catch (_) {
    return []
  }
}

function teacherLinkKey() {
  var key = $os.getenv("CYS_TEACHER_LINK_KEY")
  if (!key || key.length !== 32) {
    throw new InternalServerError("La clave de enlaces docentes no está configurada.")
  }
  return key
}

function requireFourthPeriod(dao, periodId) {
  var period = requireRecord(dao, "periodos", periodId)
  if (period.getInt("numero_periodo") !== 4) {
    throw new BadRequestError("El módulo de asistencias finales corresponde únicamente al 4.° bimestre.")
  }
  return period
}

function requirePrimaryCourse(dao, courseId) {
  var teacherAccess = require("./teacherAccess.js")
  return teacherAccess.requireGradebookCourse(dao, courseId)
}

function enrollmentParticipatesB4(enrollment) {
  var state = enrollment.getString("cursada_estado") || "PENDIENTE"
  if (state === "SIN_CURSADA") return false
  if (state === "CONFIRMADA") {
    var desde = enrollment.getInt("bimestre_desde")
    var hasta = enrollment.getInt("bimestre_hasta")
    return 4 >= desde && 4 <= hasta
  }
  return enrollment.getString("estado") !== "Baja"
}

function courseEnrollments(dao, courseId, cycleId) {
  return findByFilter(
    dao,
    "inscripciones",
    "curso_id = {:courseId} && ciclo_id = {:cycleId}",
    "numero_orden",
    { courseId: courseId, cycleId: cycleId }
  )
}

function findWorkflow(dao, courseId, periodId) {
  return findFirstByFilter(
    dao,
    "instancias_asistencia_b4",
    "curso_id = {:courseId} && periodo_id = {:periodId}",
    { courseId: courseId, periodId: periodId }
  )
}

function workflowDto(record) {
  if (!record) return null
  return {
    id: record.getId(),
    cursoId: record.getString("curso_id"),
    periodoId: record.getString("periodo_id"),
    estado: record.getString("estado"),
    revision: record.getInt("revision"),
    enviadoEn: record.getString("enviado_en") || null,
    enviadoPor: record.getString("enviado_por") || null
  }
}

function tokenDto(record) {
  if (!record) return null
  return {
    id: record.getId(),
    cursoId: record.getString("curso_id"),
    periodoId: record.getString("periodo_id"),
    docenteNombre: record.getString("docente_nombre"),
    tokenPrefijo: record.getString("token_prefix"),
    recuperable: Boolean(record.getString("token_ciphertext")),
    ultimoUso: record.getString("ultimo_uso") || null,
    created: record.getString("created")
  }
}

function assignSecret(record) {
  var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
  var secret = "cysa_" + $security.randomStringWithAlphabet(43, alphabet)
  var hash = $security.sha256(secret)
  record.set("token_hash", hash)
  record.set("token_prefix", secret.slice(0, 12))
  record.set("token_ciphertext", $security.encrypt(secret, teacherLinkKey()))
  return secret
}

function deleteCourseTokens(dao, courseId, periodId, exceptId) {
  var tokens = findByFilter(
    dao,
    "tokens_acceso_asistencia_b4",
    "curso_id = {:courseId} && periodo_id = {:periodId}",
    "",
    { courseId: courseId, periodId: periodId }
  )
  tokens.forEach((token) => {
    if (token.getId() === exceptId) return
    dao.deleteRecord(token)
  })
}

function ensureDraftWorkflow(dao, courseId, periodId) {
  var workflow = findWorkflow(dao, courseId, periodId)
  if (workflow) {
    if (workflow.getString("estado") !== "BORRADOR_DOCENTE") {
      throw new BadRequestError("Las asistencias finales de este curso ya fueron entregadas a dirección.")
    }
    return workflow
  }
  workflow = new Record(dao.findCollectionByNameOrId("instancias_asistencia_b4"))
  workflow.set("curso_id", courseId)
  workflow.set("periodo_id", periodId)
  workflow.set("estado", "BORRADOR_DOCENTE")
  workflow.set("revision", 0)
  dao.saveRecord(workflow)
  return workflow
}

function requireAccess(c) {
  noStore(c)
  var secret = c.request().header.get("X-CYS-Attendance-Token")
  if (!secret || secret.length < 20 || secret.length > 160) {
    throw new UnauthorizedError("El enlace de asistencias no es válido o ya no está disponible.")
  }
  var dao = $app.dao()
  var record = findFirstByFilter(
    dao,
    "tokens_acceso_asistencia_b4",
    "token_hash = {:hash}",
    { hash: $security.sha256(secret) }
  )
  if (!record) {
    throw new UnauthorizedError("El enlace de asistencias no es válido o ya no está disponible.")
  }
  return record
}

function requireDraftWorkflow(dao, courseId, periodId) {
  var workflow = findWorkflow(dao, courseId, periodId)
  if (!workflow || workflow.getString("estado") !== "BORRADOR_DOCENTE") {
    throw new ForbiddenError("La carga docente de asistencias ya no admite modificaciones.")
  }
  return workflow
}

function sortRosterRows(rows) {
  rows.sort((a, b) => {
    var cmp = a.apellidos.localeCompare(b.apellidos, "es")
    if (cmp !== 0) return cmp
    return a.nombres.localeCompare(b.nombres, "es")
  })
  return rows
}

function buildCourseAttendanceSnapshot(dao, course, period, workflow) {
  var cycleId = period.getString("ciclo_id")
  var periodId = period.getId()
  var enrollments = courseEnrollments(dao, course.getId(), cycleId)
  var rowsByEnrollment = {}
  findByFilter(
    dao,
    "asistencias_cierre_b4",
    "periodo_id = {:periodId}",
    "",
    { periodId: periodId }
  ).forEach((row) => {
    rowsByEnrollment[row.getString("inscripcion_id")] = row
  })

  var alumnos = []
  var excluidos = []
  enrollments.forEach((enrollment) => {
    var student = requireRecord(dao, "alumnos", enrollment.getString("alumno_id"))
    var base = {
      inscripcionId: enrollment.getId(),
      alumnoId: student.getId(),
      numeroOrden: enrollment.getInt("numero_orden") || null,
      apellidos: student.getString("apellidos"),
      nombres: student.getString("nombres"),
      nombreCompleto: (student.getString("apellidos") + ", " + student.getString("nombres")).trim(),
      estadoAdministrativo: enrollment.getString("estado") || "Regular"
    }
    if (enrollmentParticipatesB4(enrollment)) {
      var att = rowsByEnrollment[enrollment.getId()] || null
      alumnos.push({
        inscripcionId: base.inscripcionId,
        alumnoId: base.alumnoId,
        numeroOrden: base.numeroOrden,
        apellidos: base.apellidos,
        nombres: base.nombres,
        nombreCompleto: base.nombreCompleto,
        estadoAdministrativo: base.estadoAdministrativo,
        cargado: Boolean(att),
        asistencias: att ? att.getInt("asistencias") : null,
        inasistencias: att ? att.getInt("inasistencias") : null,
        llegadasTarde: att ? att.getInt("llegadas_tarde") : null
      })
    } else {
      excluidos.push(base)
    }
  })

  sortRosterRows(alumnos)
  sortRosterRows(excluidos)

  return {
    curso: {
      id: course.getId(),
      nombre: course.getString("nombre"),
      turno: course.getString("turno")
    },
    periodo: {
      id: period.getId(),
      nombre: period.getString("nombre"),
      numeroPeriodo: period.getInt("numero_periodo"),
      cicloId: cycleId
    },
    instancia: workflowDto(workflow),
    totalAlumnos: alumnos.length,
    alumnosCargados: alumnos.filter((a) => a.cargado).length,
    alumnos: alumnos,
    excluidos: excluidos
  }
}

function saveAttendanceRows(txDao, courseId, periodId, rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new BadRequestError("No se recibieron asistencias para guardar.")
  }
  if (rawRows.length > 80) {
    throw new BadRequestError("Se recibieron demasiados alumnos en un solo guardado.")
  }
  var period = requireFourthPeriod(txDao, periodId)
  var cycleId = period.getString("ciclo_id")
  var allowed = {}
  courseEnrollments(txDao, courseId, cycleId).forEach((enrollment) => {
    if (enrollmentParticipatesB4(enrollment)) {
      allowed[enrollment.getId()] = enrollment
    }
  })

  var collection = txDao.findCollectionByNameOrId("asistencias_cierre_b4")
  var seen = {}
  rawRows.forEach((item) => {
    if (!item || typeof item !== "object") {
      throw new BadRequestError("Formato de fila inválido.")
    }
    var enrollmentId = stringValue(item.inscripcionId, 15)
    if (!enrollmentId || !allowed[enrollmentId]) {
      throw new ForbiddenError("Uno de los alumnos no pertenece a la nómina evaluable de 4.° bimestre de este curso.")
    }
    if (seen[enrollmentId]) {
      throw new BadRequestError("Se recibieron alumnos duplicados en la solicitud.")
    }
    seen[enrollmentId] = true

    var asistencias = boundedInteger(item.asistencias, 180)
    var inasistencias = boundedInteger(item.inasistencias, 180)
    var llegadasTarde = boundedInteger(item.llegadasTarde, 180)

    var record = findFirstByFilter(
      txDao,
      "asistencias_cierre_b4",
      "inscripcion_id = {:enrollmentId} && periodo_id = {:periodId}",
      { enrollmentId: enrollmentId, periodId: periodId }
    )
    if (!record) {
      record = new Record(collection)
      record.set("inscripcion_id", enrollmentId)
      record.set("periodo_id", periodId)
    }
    record.set("asistencias", asistencias)
    record.set("inasistencias", inasistencias)
    record.set("llegadas_tarde", llegadasTarde)
    txDao.saveRecord(record)
  })
}

function staffStages(c) {
  noStore(c)
  var periodId = c.pathParam("periodoId")
  var response
  $app.dao().runInTransaction((txDao) => {
    var period = requireFourthPeriod(txDao, periodId)
    var cycleId = period.getString("ciclo_id")
    var courses = findByFilter(txDao, "cursos", "escala_id != ''", "orden,nombre")
    var workflowsByCourse = {}
    findByFilter(txDao, "instancias_asistencia_b4", "periodo_id = {:periodId}", "", { periodId: periodId }).forEach((wf) => {
      workflowsByCourse[wf.getString("curso_id")] = wf
    })
    var tokensByCourse = {}
    findByFilter(txDao, "tokens_acceso_asistencia_b4", "periodo_id = {:periodId}", "", { periodId: periodId }).forEach((tk) => {
      tokensByCourse[tk.getString("curso_id")] = tk
    })
    var rowsByEnrollment = {}
    findByFilter(txDao, "asistencias_cierre_b4", "periodo_id = {:periodId}", "", { periodId: periodId }).forEach((row) => {
      rowsByEnrollment[row.getString("inscripcion_id")] = true
    })

    response = courses.map((course) => {
      var courseId = course.getId()
      var wf = workflowsByCourse[courseId] || null
      var tk = tokensByCourse[courseId] || null
      var evaluables = courseEnrollments(txDao, courseId, cycleId).filter(enrollmentParticipatesB4)
      var totalAlumnos = evaluables.length
      var alumnosCargados = evaluables.filter((e) => Boolean(rowsByEnrollment[e.getId()])).length

      var etapa = "PENDIENTE_EMISION"
      if (wf && wf.getString("estado") === "CONTROL_DIRECTIVO") {
        etapa = alumnosCargados >= totalAlumnos && totalAlumnos > 0 ? "COMPLETADO" : "CONTROL_DIRECTIVO"
      } else if (tk) {
        etapa = "CARGA_DOCENTE"
      } else if (wf || alumnosCargados > 0) {
        etapa = "CARGA_PAUSADA"
      }

      return {
        cursoId: courseId,
        cursoNombre: course.getString("nombre"),
        turno: course.getString("turno"),
        etapa: etapa,
        instancia: workflowDto(wf),
        tokenDocente: tokenDto(tk),
        totalAlumnos: totalAlumnos,
        alumnosCargados: alumnosCargados,
        porcentaje: totalAlumnos > 0 ? Math.round((alumnosCargados / totalAlumnos) * 100) : 0
      }
    })
  })
  return c.json(200, { periodoId: periodId, cursos: response })
}

function issueLink(c) {
  noStore(c)
  var data = readJsonRequestData(c)
  var courseId = stringValue(data.cursoId, 15)
  var periodId = stringValue(data.periodoId, 15)
  var teacherName = stringValue(data.docenteNombre, 120)
  if (!teacherName) {
    throw new BadRequestError("El nombre del docente es obligatorio.")
  }
  var response
  $app.dao().runInTransaction((txDao) => {
    var course = requirePrimaryCourse(txDao, courseId)
    var period = requireFourthPeriod(txDao, periodId)
    ensureDraftWorkflow(txDao, course.getId(), period.getId())
    deleteCourseTokens(txDao, course.getId(), period.getId(), "")
    var record = new Record(txDao.findCollectionByNameOrId("tokens_acceso_asistencia_b4"))
    var secret = assignSecret(record)
    record.set("curso_id", course.getId())
    record.set("periodo_id", period.getId())
    record.set("docente_nombre", teacherName)
    txDao.saveRecord(record)
    response = {
      enlace: tokenDto(record),
      tokenPrefijo: record.getString("token_prefix"),
      secreto: secret
    }
  })
  return c.json(201, response)
}

function rotateLink(c) {
  noStore(c)
  var tokenId = c.pathParam("tokenId")
  var response
  $app.dao().runInTransaction((txDao) => {
    var record = requireRecord(txDao, "tokens_acceso_asistencia_b4", tokenId)
    requireDraftWorkflow(txDao, record.getString("curso_id"), record.getString("periodo_id"))
    deleteCourseTokens(txDao, record.getString("curso_id"), record.getString("periodo_id"), record.getId())
    var secret = assignSecret(record)
    txDao.saveRecord(record)
    response = {
      enlace: tokenDto(record),
      tokenPrefijo: record.getString("token_prefix"),
      secreto: secret
    }
  })
  return c.json(200, response)
}

function recoverLink(c) {
  noStore(c)
  var dao = $app.dao()
  var record = requireRecord(dao, "tokens_acceso_asistencia_b4", c.pathParam("tokenId"))
  requireDraftWorkflow(dao, record.getString("curso_id"), record.getString("periodo_id"))
  var cipherText = record.getString("token_ciphertext")
  if (!cipherText) {
    throw new BadRequestError("Este enlace debe regenerarse una vez antes de poder copiarlo.")
  }
  var secret = $security.decrypt(cipherText, teacherLinkKey())
  if (typeof secret !== "string" || $security.sha256(secret) !== record.getString("token_hash")) {
    throw new InternalServerError("No se pudo recuperar el enlace de asistencias.")
  }
  return c.json(200, {
    secreto: secret,
    tokenPrefijo: record.getString("token_prefix")
  })
}

function staffCourse(c) {
  noStore(c)
  var courseId = c.pathParam("cursoId")
  var periodId = c.pathParam("periodoId")
  var response
  $app.dao().runInTransaction((txDao) => {
    var course = requirePrimaryCourse(txDao, courseId)
    var period = requireFourthPeriod(txDao, periodId)
    var workflow = findWorkflow(txDao, course.getId(), period.getId())
    response = buildCourseAttendanceSnapshot(txDao, course, period, workflow)
  })
  return c.json(200, response)
}

function staffSaveCourse(c) {
  noStore(c)
  var courseId = c.pathParam("cursoId")
  var periodId = c.pathParam("periodoId")
  var data = readJsonRequestData(c)
  var expectedRevision = Number(data.expectedRevision)
  if (!isFinite(expectedRevision) || expectedRevision < 0 || Math.floor(expectedRevision) !== expectedRevision) {
    throw new BadRequestError("La revisión esperada no es válida.")
  }

  var conflictRevision = null
  var response
  $app.dao().runInTransaction((txDao) => {
    var course = requirePrimaryCourse(txDao, courseId)
    var period = requireFourthPeriod(txDao, periodId)
    var workflow = findWorkflow(txDao, course.getId(), period.getId())
    if (!workflow || workflow.getString("estado") !== "CONTROL_DIRECTIVO") {
      throw new ForbiddenError("Las asistencias finales todavía no están bajo control directivo.")
    }
    if (workflow.getInt("revision") !== expectedRevision) {
      conflictRevision = workflow.getInt("revision")
      return
    }
    saveAttendanceRows(txDao, course.getId(), period.getId(), data.filas)
    workflow.set("revision", workflow.getInt("revision") + 1)
    txDao.saveRecord(workflow)
    response = buildCourseAttendanceSnapshot(txDao, course, period, workflow)
  })

  if (conflictRevision !== null) {
    return c.json(409, {
      message: "Las asistencias fueron modificadas por otra sesión.",
      currentRevision: conflictRevision
    })
  }
  return c.json(200, response)
}

function teacherContext(c) {
  var access = requireAccess(c)
  var response
  $app.dao().runInTransaction((txDao) => {
    var token = requireRecord(txDao, "tokens_acceso_asistencia_b4", access.getId())
    var course = requirePrimaryCourse(txDao, token.getString("curso_id"))
    var period = requireFourthPeriod(txDao, token.getString("periodo_id"))
    var workflow = requireDraftWorkflow(txDao, course.getId(), period.getId())
    token.set("ultimo_uso", new Date().toISOString())
    txDao.saveRecord(token)
    response = buildCourseAttendanceSnapshot(txDao, course, period, workflow)
    response.docenteNombre = token.getString("docente_nombre")
  })
  return c.json(200, response)
}

function teacherSave(c) {
  var access = requireAccess(c)
  var data = readJsonRequestData(c)
  var response
  $app.dao().runInTransaction((txDao) => {
    var token = requireRecord(txDao, "tokens_acceso_asistencia_b4", access.getId())
    var course = requirePrimaryCourse(txDao, token.getString("curso_id"))
    var period = requireFourthPeriod(txDao, token.getString("periodo_id"))
    var workflow = requireDraftWorkflow(txDao, course.getId(), period.getId())
    saveAttendanceRows(txDao, course.getId(), period.getId(), data.filas)
    workflow.set("revision", workflow.getInt("revision") + 1)
    txDao.saveRecord(workflow)
    token.set("ultimo_uso", new Date().toISOString())
    txDao.saveRecord(token)
    response = buildCourseAttendanceSnapshot(txDao, course, period, workflow)
    response.docenteNombre = token.getString("docente_nombre")
  })
  return c.json(200, response)
}

function teacherSubmit(c) {
  var access = requireAccess(c)
  var status = 200
  var response
  $app.dao().runInTransaction((txDao) => {
    var token = requireRecord(txDao, "tokens_acceso_asistencia_b4", access.getId())
    var course = requirePrimaryCourse(txDao, token.getString("curso_id"))
    var period = requireFourthPeriod(txDao, token.getString("periodo_id"))
    var workflow = requireDraftWorkflow(txDao, course.getId(), period.getId())
    var snapshot = buildCourseAttendanceSnapshot(txDao, course, period, workflow)
    var pendientes = snapshot.alumnos
      .filter((item) => !item.cargado)
      .map((item) => ({
        inscripcionId: item.inscripcionId,
        nombreCompleto: item.nombreCompleto
      }))
    if (snapshot.totalAlumnos === 0 || pendientes.length > 0) {
      status = 422
      response = {
        completa: false,
        totalAlumnos: snapshot.totalAlumnos,
        alumnosCargados: snapshot.alumnosCargados,
        pendientes: pendientes
      }
      return
    }
    workflow.set("estado", "CONTROL_DIRECTIVO")
    workflow.set("revision", workflow.getInt("revision") + 1)
    workflow.set("enviado_en", new Date().toISOString())
    workflow.set("enviado_por", token.getString("docente_nombre"))
    txDao.saveRecord(workflow)
    deleteCourseTokens(txDao, course.getId(), period.getId(), "")
    response = {
      instancia: workflowDto(workflow),
      totalAlumnos: snapshot.totalAlumnos
    }
  })
  return c.json(status, response)
}

function getStudentFinalAttendance(dao, enrollment, period) {
  if (period.getInt("numero_periodo") !== 4) return null
  var workflow = findWorkflow(dao, enrollment.getString("curso_id"), period.getId())
  if (!workflow || workflow.getString("estado") !== "CONTROL_DIRECTIVO") {
    return null
  }
  var row = findFirstByFilter(
    dao,
    "asistencias_cierre_b4",
    "inscripcion_id = {:enrollmentId} && periodo_id = {:periodId}",
    { enrollmentId: enrollment.getId(), periodId: period.getId() }
  )
  if (!row) return null
  return {
    id: row.getId(),
    asistencias: row.getInt("asistencias"),
    inasistencias: row.getInt("inasistencias"),
    llegadasTarde: row.getInt("llegadas_tarde")
  }
}

module.exports = {
  staffStages: staffStages,
  issueLink: issueLink,
  rotateLink: rotateLink,
  recoverLink: recoverLink,
  staffCourse: staffCourse,
  staffSaveCourse: staffSaveCourse,
  teacherContext: teacherContext,
  teacherSave: teacherSave,
  teacherSubmit: teacherSubmit,
  getStudentFinalAttendance: getStudentFinalAttendance
}
