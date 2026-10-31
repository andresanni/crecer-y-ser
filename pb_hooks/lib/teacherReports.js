function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n")
}

function stringValue(value, maxLength) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, maxLength)
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

function findById(dao, collection, id) {
  if (!id || !/^[a-z0-9]{15}$/.test(id)) return null
  try {
    return dao.findRecordById(collection, id)
  } catch (error) {
    return null
  }
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

function parseJsonArray(record, fieldName) {
  if (!record) return []
  var raw = record.getString(fieldName)
  if (raw) {
    try {
      var parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch (_) {}
  }
  var val = record.get(fieldName)
  if (Array.isArray(val)) return val
  if (val && typeof val.string === "function") {
    try {
      var fromRaw = JSON.parse(val.string())
      if (Array.isArray(fromRaw)) return fromRaw
    } catch (_) {}
  }
  return []
}

function cutoffTermForReportType(tipoInforme) {
  if (tipoInforme === "PRIMER_BIMESTRE") return 1
  if (tipoInforme === "PRIMER_CUATRIMESTRE") return 2
  if (tipoInforme === "CICLO_FINAL") return 4
  throw new BadRequestError("El tipo de informe no es válido.")
}

function requiresSpecialSubject(tipoInforme) {
  cutoffTermForReportType(tipoInforme)
  return tipoInforme === "CICLO_FINAL" || tipoInforme === "PRIMER_CUATRIMESTRE"
}

function classifySpecialSubject(name) {
  var normalized = normalizeKey(name)
  if (normalized.indexOf("educacion fisica") !== -1) {
    return { codigoEspecial: "EDUCACION_FISICA", ordenEspecial: 1, etiquetaPdf: "Educación Física" }
  }
  if (normalized.indexOf("artes visuales") !== -1) {
    return { codigoEspecial: "ARTES_VISUALES", ordenEspecial: 2, etiquetaPdf: "Artes Visuales" }
  }
  if (normalized.indexOf("ingles") !== -1) {
    return { codigoEspecial: "INGLES", ordenEspecial: 3, etiquetaPdf: "Inglés" }
  }
  if (normalized.indexOf("musica") !== -1) {
    return { codigoEspecial: "MUSICA", ordenEspecial: 4, etiquetaPdf: "Educación Musical" }
  }
  if (normalized.indexOf("tecnologia") !== -1) {
    return { codigoEspecial: "TECNOLOGIA", ordenEspecial: 5, etiquetaPdf: "Tecnología" }
  }
  return null
}

function listSpecialSubjects(dao) {
  var allSubjects = findByFilter(dao, "materias", "id != ''", "nombre", {})
  var result = []
  allSubjects.forEach((record) => {
    var meta = classifySpecialSubject(record.getString("nombre"))
    if (!meta) return
    result.push({
      id: record.getId(),
      nombre: record.getString("nombre"),
      codigoEspecial: meta.codigoEspecial,
      orden: meta.ordenEspecial
    })
  })
  result.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  return result
}

function requireSpecialSubject(dao, materiaId) {
  var record = requireRecord(dao, "materias", materiaId)
  var meta = classifySpecialSubject(record.getString("nombre"))
  if (!meta) {
    throw new BadRequestError("La materia seleccionada no corresponde a un área especial de informes.")
  }
  return record
}

function isPrimaryCourse(dao, course) {
  var record = typeof course === "string" ? requireRecord(dao, "cursos", course) : course
  var levelId = record.getString("nivel_id")
  if (levelId) {
    try {
      var level = requireRecord(dao, "niveles", levelId)
      return /primar/i.test(level.getString("nombre"))
    } catch (_) {
      return false
    }
  }
  var name = (record.getString("nombre") || "").trim()
  if (/sala/i.test(name)) return false
  return /^[1-7]\s*[°º]?$/.test(name) || /^([1-7])\s*(?:[°º]|grado)?(?:\s|$)/i.test(name)
}

function courseGradeNumber(course) {
  var name = course.getString("nombre") || ""
  if (/sala/i.test(name)) return 0
  var gradoRaw = course.getString("grado") || name
  var trimmed = String(gradoRaw).trim()
  var match = trimmed.match(/^([1-7])\s*(?:[°º]|grado)?(?:\s|$)/i)
  return match ? Number(match[1]) : 0
}

function resolveTemplate(dao, tipoInforme, course, materiaId) {
  var grade = courseGradeNumber(course)
  if (grade === 0) return null
  if (tipoInforme === "CICLO_FINAL") {
    if (!materiaId) return null
    var candidates = findByFilter(
      dao,
      "plantillas_informe",
      "tipo_informe = 'CICLO_FINAL' && materia_id = {:materiaId} && grado_desde <= {:grade} && grado_hasta >= {:grade}",
      "codigo",
      { materiaId: materiaId, grade: grade }
    )
    if (candidates.length === 0) return null
    candidates.sort((a, b) => {
      var spanA = a.getInt("grado_hasta") - a.getInt("grado_desde")
      var spanB = b.getInt("grado_hasta") - b.getInt("grado_desde")
      if (spanA !== spanB) return spanA - spanB
      return a.getString("codigo").localeCompare(b.getString("codigo"))
    })
    return candidates[0]
  }
  var matches = findByFilter(
    dao,
    "plantillas_informe",
    "tipo_informe = {:tipo} && grado_desde <= {:grade} && grado_hasta >= {:grade}",
    "codigo",
    { tipo: tipoInforme, grade: grade }
  )
  if (matches.length > 0) return matches[0]
  return findFirst(dao, "plantillas_informe", "codigo", "CONDUCTA_ESTANDAR_26")
}

function templateItems(dao, plantillaId) {
  return findByFilter(
    dao,
    "items_plantilla_informe",
    "plantilla_id = {:plantillaId}",
    "orden_visual,id",
    { plantillaId: plantillaId }
  )
}

var DESEMPENO_PRIMER_CICLO = [
  { codigo: "NO_ALCANZO", etiqueta: "No Alcanzó los objetivos" },
  { codigo: "EN_PROCESO", etiqueta: "En proceso" },
  { codigo: "ALCANZADO", etiqueta: "Alcanzado" },
  { codigo: "AVANZADO", etiqueta: "Avanzado" },
  { codigo: "DESTACADO", etiqueta: "Destacado" },
  { codigo: "NO_CORRESPONDE", etiqueta: "No corresponde" }
]

var DESEMPENO_SEGUNDO_CICLO = [
  { codigo: "NO_ALCANZO_1", etiqueta: "No Alcanzó Los Objetivos 1" },
  { codigo: "NO_ALCANZO_2", etiqueta: "No Alcanzó Los Objetivos 2" },
  { codigo: "NO_ALCANZO_3", etiqueta: "No Alcanzó Los Objetivos 3" },
  { codigo: "EN_PROCESO_4", etiqueta: "En Proceso 4" },
  { codigo: "EN_PROCESO_5", etiqueta: "En Proceso 5" },
  { codigo: "ALCANZADO_6", etiqueta: "Alcanzado 6" },
  { codigo: "ALCANZADO_7", etiqueta: "Alcanzado 7" },
  { codigo: "AVANZADO_8", etiqueta: "Avanzado 8" },
  { codigo: "AVANZADO_9", etiqueta: "Avanzado 9" },
  { codigo: "DESTACADO_10", etiqueta: "Destacado 10" },
  { codigo: "NO_CORRESPONDE", etiqueta: "No Corresponde" }
]

function resolveDesempenoGeneralScale(record, course) {
  if (!record.getBool("requiere_desempeno_general")) return []
  if (course) {
    return courseGradeNumber(course) >= 4 ? DESEMPENO_SEGUNDO_CICLO : DESEMPENO_PRIMER_CICLO
  }
  var stored = parseJsonArray(record, "escala_desempeno_general")
  return stored.length > 0 ? stored : DESEMPENO_PRIMER_CICLO
}

function templateDto(record, course) {
  return {
    id: record.getId(),
    codigo: record.getString("codigo"),
    tipoInforme: record.getString("tipo_informe"),
    materiaId: record.getString("materia_id") || null,
    gradoDesde: record.getInt("grado_desde"),
    gradoHasta: record.getInt("grado_hasta"),
    tituloTabla: record.getString("titulo_tabla"),
    escalaItems: parseJsonArray(record, "escala_items"),
    mostrarLeyendaEscala: record.getBool("mostrar_leyenda_escala"),
    requiereDesempenoGeneral: record.getBool("requiere_desempeno_general"),
    escalaDesempenoGeneral: resolveDesempenoGeneralScale(record, course),
    permiteObservaciones: record.getBool("permite_observaciones")
  }
}

function itemDto(record) {
  return {
    id: record.getId(),
    plantillaId: record.getString("plantilla_id"),
    bloqueNombre: record.getString("bloque_nombre") || null,
    bloqueOrden: record.getInt("bloque_orden") || null,
    ordenVisual: record.getInt("orden_visual"),
    pagina: record.getInt("pagina") || 1,
    texto: record.getString("texto")
  }
}

function enrollmentScope(enrollment) {
  return {
    estado: enrollment.getString("cursada_estado") || "PENDIENTE",
    desde: enrollment.getInt("bimestre_desde"),
    hasta: enrollment.getInt("bimestre_hasta"),
    revision: enrollment.getInt("revision_cursada")
  }
}

function enrollmentParticipates(enrollment, cutoffNumber) {
  var scope = enrollmentScope(enrollment)
  if (scope.estado === "SIN_CURSADA") return false
  if (scope.estado === "CONFIRMADA") return cutoffNumber >= scope.desde && cutoffNumber <= scope.hasta
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

function evaluableEnrollmentsForScope(dao, courseId, cycleId, tipoInforme) {
  var cutoff = cutoffTermForReportType(tipoInforme)
  return courseEnrollments(dao, courseId, cycleId).filter((enrollment) =>
    enrollmentParticipates(enrollment, cutoff)
  )
}

function pendingEnrollmentScopesForCourse(dao, courseId, cycleId) {
  return courseEnrollments(dao, courseId, cycleId)
    .filter((enrollment) => enrollmentScope(enrollment).estado === "PENDIENTE")
    .map((enrollment) => {
      var student = requireRecord(dao, "alumnos", enrollment.getString("alumno_id"))
      return {
        inscripcionId: enrollment.getId(),
        alumnoId: student.getId(),
        nombreCompleto: (student.getString("apellidos") + ", " + student.getString("nombres")).trim()
      }
    })
}

function findWorkflow(dao, cicloId, tipoInforme, cursoId, materiaId) {
  var normalizedMateriaId = materiaId || ""
  if (normalizedMateriaId) {
    return findFirstByFilter(
      dao,
      "instancias_informe",
      "ciclo_id = {:cicloId} && tipo_informe = {:tipoInforme} && curso_id = {:cursoId} && materia_id = {:materiaId}",
      {
        cicloId: cicloId,
        tipoInforme: tipoInforme,
        cursoId: cursoId,
        materiaId: normalizedMateriaId
      }
    )
  }
  return findFirstByFilter(
    dao,
    "instancias_informe",
    "ciclo_id = {:cicloId} && tipo_informe = {:tipoInforme} && curso_id = {:cursoId} && materia_id = ''",
    {
      cicloId: cicloId,
      tipoInforme: tipoInforme,
      cursoId: cursoId
    }
  )
}

function workflowDto(record) {
  return {
    id: record.getId(),
    cicloId: record.getString("ciclo_id"),
    tipoInforme: record.getString("tipo_informe"),
    cursoId: record.getString("curso_id"),
    materiaId: record.getString("materia_id") || null,
    plantillaId: record.getString("plantilla_id"),
    estado: record.getString("estado"),
    docenteNombre: record.getString("docente_nombre"),
    docenteApellido: record.getString("docente_apellido"),
    revision: record.getInt("revision"),
    enviadoAt: record.getString("enviado_at") || null,
    enviadoPor: record.getString("enviado_por") || null
  }
}

function tokenInstanceIds(record) {
  if (!record) return []
  var ids = []
  var seen = {}
  var pushId = function (id) {
    if (typeof id !== "string") return
    var trimmed = id.trim()
    if (!trimmed || seen[trimmed]) return
    seen[trimmed] = true
    ids.push(trimmed)
  }
  try {
    var slice = record.getStringSlice("instancia_ids")
    if (Array.isArray(slice)) {
      slice.forEach(pushId)
    }
  } catch (_) {}
  var parsed = parseJsonArray(record, "instancia_ids")
  parsed.forEach(pushId)
  pushId(record.getString("instancia_id"))
  return ids
}

function tokenWorkflows(dao, record) {
  var ids = tokenInstanceIds(record)
  var workflows = []
  ids.forEach((id) => {
    var wf = findById(dao, "instancias_informe", id)
    if (wf && wf.getString("estado") === "BORRADOR_DOCENTE") {
      workflows.push(wf)
    }
  })
  workflows.sort((a, b) => {
    var courseA = findById(dao, "cursos", a.getString("curso_id"))
    var courseB = findById(dao, "cursos", b.getString("curso_id"))
    var gradeDiff = (courseA ? courseGradeNumber(courseA) : 99) - (courseB ? courseGradeNumber(courseB) : 99)
    if (gradeDiff !== 0) return gradeDiff
    return a.getId().localeCompare(b.getId())
  })
  return workflows
}

function tokenDto(record, workflowsOrSingle, activeWorkflow) {
  var workflows = Array.isArray(workflowsOrSingle)
    ? workflowsOrSingle
    : workflowsOrSingle
      ? [workflowsOrSingle]
      : []
  var primary = activeWorkflow || workflows[0]
  return {
    id: record.getId(),
    instanciaId: primary ? primary.getId() : record.getString("instancia_id"),
    instanciaIds: workflows.length > 0 ? workflows.map((w) => w.getId()) : tokenInstanceIds(record),
    cicloId: primary ? primary.getString("ciclo_id") : "",
    tipoInforme: primary ? primary.getString("tipo_informe") : "",
    cursoId: primary ? primary.getString("curso_id") : "",
    cursoIds: workflows.map((w) => w.getString("curso_id")),
    materiaId: primary ? primary.getString("materia_id") || null : null,
    docenteNombre: primary ? primary.getString("docente_nombre") : "",
    docenteApellido: primary ? primary.getString("docente_apellido") : "",
    tokenPrefijo: record.getString("token_prefijo"),
    recuperable: Boolean(record.getString("token_cifrado"))
  }
}

function approvalDto(approval) {
  return {
    inscripcionId: approval.getString("inscripcion_id"),
    estado: approval.getString("estado"),
    generacionVisado: approval.getInt("generacion_visado"),
    revisionContenido: approval.getInt("revision_contenido"),
    revisionVisada: approval.getString("estado") === "VISADO" ? approval.getInt("revision_visada") : null,
    visadoAt: approval.getString("visado_at") || null,
    visadoPor: approval.getString("visado_por") || null
  }
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

function detachInstancesFromTokens(dao, instanciaIds, exceptId) {
  var removeSet = {}
  ;(Array.isArray(instanciaIds) ? instanciaIds : [instanciaIds]).forEach((id) => {
    if (typeof id === "string" && id.trim() !== "") {
      removeSet[id.trim()] = true
    }
  })
  var allTokens = findByFilter(dao, "tokens_acceso_informe", "id != ''", "", {})
  allTokens.forEach((token) => {
    if (exceptId && token.getId() === exceptId) return
    var currentIds = tokenInstanceIds(token)
    var hasRemoved = currentIds.some((id) => Boolean(removeSet[id]))
    if (!hasRemoved) return
    var remaining = currentIds.filter((id) => !removeSet[id])
    if (remaining.length === 0) {
      dao.deleteRecord(token)
    } else {
      token.set("instancia_id", remaining[0])
      token.set("instancia_ids", remaining)
      dao.saveRecord(token)
    }
  })
}

function validateAccessRecord(record) {
  if (!record || tokenInstanceIds(record).length === 0) {
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
  var record = findFirst(dao, "tokens_acceso_informe", "token_hash", $security.sha256(secret))
  return validateAccessRecord(record)
}

function requireDraftWorkflows(dao, access) {
  var workflows = tokenWorkflows(dao, access)
  if (workflows.length === 0) {
    throw new ForbiddenError("La carga docente ya no admite modificaciones.")
  }
  return workflows
}

function resolveRequestedDraftWorkflow(dao, access, requestedInstanciaId, requestedCursoId) {
  var workflows = requireDraftWorkflows(dao, access)
  var instId = stringValue(requestedInstanciaId, 15)
  if (instId) {
    var byId = workflows.find((w) => w.getId() === instId)
    if (!byId) {
      throw new ForbiddenError("El curso solicitado no pertenece a este enlace o ya fue enviado.")
    }
    return { active: byId, all: workflows }
  }
  var cId = stringValue(requestedCursoId, 15)
  if (cId) {
    var byCourse = workflows.find((w) => w.getString("curso_id") === cId)
    if (!byCourse) {
      throw new ForbiddenError("El curso solicitado no pertenece a este enlace o ya fue enviado.")
    }
    return { active: byCourse, all: workflows }
  }
  return { active: workflows[0], all: workflows }
}

function requireDraftWorkflowForEnrollment(dao, access, enrollmentId) {
  var enrollment = requireRecord(dao, "inscripciones", enrollmentId)
  var workflows = requireDraftWorkflows(dao, access)
  var workflow = workflows.find(
    (w) =>
      w.getString("curso_id") === enrollment.getString("curso_id") &&
      w.getString("ciclo_id") === enrollment.getString("ciclo_id")
  )
  if (!workflow) {
    throw new ForbiddenError("El alumno no pertenece al alcance activo de este enlace.")
  }
  var cutoff = cutoffTermForReportType(workflow.getString("tipo_informe"))
  if (!enrollmentParticipates(enrollment, cutoff)) {
    throw new ForbiddenError("El alumno no pertenece al alcance evaluable de este informe.")
  }
  return { workflow: workflow, enrollment: enrollment }
}

function requireStaffWorkflowById(dao, instanciaId) {
  var workflow = requireRecord(dao, "instancias_informe", instanciaId)
  if (workflow.getString("estado") !== "CONTROL_DIRECTIVO") {
    throw new ForbiddenError("El informe todavía no se encuentra bajo control directivo.")
  }
  return workflow
}

function requireEnrollmentForWorkflow(dao, workflow, enrollmentId) {
  var enrollment = requireRecord(dao, "inscripciones", enrollmentId)
  var cutoff = cutoffTermForReportType(workflow.getString("tipo_informe"))
  if (
    enrollment.getString("curso_id") !== workflow.getString("curso_id") ||
    enrollment.getString("ciclo_id") !== workflow.getString("ciclo_id") ||
    !enrollmentParticipates(enrollment, cutoff)
  ) {
    throw new ForbiddenError("El alumno no pertenece al alcance evaluable de este informe.")
  }
  return enrollment
}

function allowedScaleCodesMap(scaleArray) {
  var map = {}
  if (!Array.isArray(scaleArray)) return map
  scaleArray.forEach((entry) => {
    if (entry && typeof entry.codigo === "string" && entry.codigo.trim() !== "") {
      map[entry.codigo.trim()] = entry
    }
  })
  return map
}

function allowedItemsMap(items) {
  var map = {}
  items.forEach((item) => {
    map[item.getId()] = item
  })
  return map
}

function studentEvaluationSnapshot(dao, workflow, template, items, enrollment) {
  var course = requireRecord(dao, "cursos", workflow.getString("curso_id"))
  var tDto = templateDto(template, course)
  var validItemScale = allowedScaleCodesMap(tDto.escalaItems)
  var validGeneralScale = allowedScaleCodesMap(tDto.escalaDesempenoGeneral)
  var itemMap = allowedItemsMap(items)

  var evaluation = findFirstByFilter(
    dao,
    "evaluaciones_informe",
    "instancia_id = {:instanciaId} && inscripcion_id = {:inscripcionId}",
    { instanciaId: workflow.getId(), inscripcionId: enrollment.getId() }
  )

  var responses = []
  var answeredItemIds = {}
  if (evaluation) {
    var rawResponses = findByFilter(
      dao,
      "respuestas_item_informe",
      "evaluacion_informe_id = {:evalId}",
      "",
      { evalId: evaluation.getId() }
    )
    rawResponses.forEach((record) => {
      var itemId = record.getString("item_id")
      var code = record.getString("valor_codigo")
      if (!itemMap[itemId] || !validItemScale[code]) return
      answeredItemIds[itemId] = code
      responses.push({
        itemId: itemId,
        valorCodigo: code
      })
    })
  }

  responses.sort((a, b) => {
    var orderA = itemMap[a.itemId] ? itemMap[a.itemId].getInt("orden_visual") : 0
    var orderB = itemMap[b.itemId] ? itemMap[b.itemId].getInt("orden_visual") : 0
    return orderA - orderB
  })

  var generalCode = evaluation ? evaluation.getString("desempeno_general_valor") : ""
  var generalValid = !tDto.requiereDesempenoGeneral || Boolean(generalCode && validGeneralScale[generalCode])
  var itemsRespondidos = Object.keys(answeredItemIds).length
  var allItemsAnswered = items.length > 0 && items.every((item) => Boolean(answeredItemIds[item.getId()]))

  return {
    inscripcionId: enrollment.getId(),
    completo: allItemsAnswered && generalValid,
    itemsRespondidos: itemsRespondidos,
    totalItems: items.length,
    desempenoGeneralCompleto: generalValid,
    evaluacion: {
      id: evaluation ? evaluation.getId() : null,
      desempenoGeneralValor: generalCode || null,
      observaciones: evaluation ? evaluation.getString("observaciones") : "",
      respuestas: responses
    }
  }
}

function saveStudentEvaluation(txDao, workflow, template, items, enrollment, input, requireComplete) {
  var course = requireRecord(txDao, "cursos", workflow.getString("curso_id"))
  var tDto = templateDto(template, course)
  var validItemScale = allowedScaleCodesMap(tDto.escalaItems)
  var validGeneralScale = allowedScaleCodesMap(tDto.escalaDesempenoGeneral)
  var itemMap = allowedItemsMap(items)

  var submittedResponses = Array.isArray(input.respuestas) ? input.respuestas : []
  if (submittedResponses.length > items.length + 10) {
    throw new BadRequestError("Se recibieron demasiadas respuestas de ítems.")
  }

  var normalizedResponses = []
  var submittedItemMap = {}
  submittedResponses.forEach((entry) => {
    if (!entry || typeof entry !== "object") return
    var itemId = stringValue(entry.itemId, 15)
    var code = stringValue(entry.valorCodigo, 40)
    if (!code) return
    if (!itemMap[itemId]) {
      throw new BadRequestError("Un ítem calificado no pertenece a la plantilla del informe.")
    }
    if (!validItemScale[code]) {
      throw new BadRequestError("El valor calificado no pertenece a la escala de ítems de la plantilla.")
    }
    if (!submittedItemMap[itemId]) {
      normalizedResponses.push({ itemId: itemId, valorCodigo: code })
    } else {
      normalizedResponses.forEach((existing) => {
        if (existing.itemId === itemId) existing.valorCodigo = code
      })
    }
    submittedItemMap[itemId] = code
  })

  var generalValue = stringValue(input.desempenoGeneralValor, 40)
  if (!tDto.requiereDesempenoGeneral) {
    generalValue = ""
  } else if (generalValue && !validGeneralScale[generalValue]) {
    throw new BadRequestError("El valor de desempeño general no pertenece a la escala habilitada.")
  }

  if (requireComplete) {
    if (items.some((item) => !submittedItemMap[item.getId()])) {
      throw new BadRequestError("Todos los ítems de la plantilla son obligatorios.")
    }
    if (tDto.requiereDesempenoGeneral && !generalValue) {
      throw new BadRequestError("La calificación de Desempeño General es obligatoria.")
    }
  }

  var observations = tDto.permiteObservaciones ? stringValue(input.observaciones, 1000) : ""

  var evaluation = findFirstByFilter(
    txDao,
    "evaluaciones_informe",
    "instancia_id = {:instanciaId} && inscripcion_id = {:inscripcionId}",
    { instanciaId: workflow.getId(), inscripcionId: enrollment.getId() }
  )
  if (!evaluation) {
    evaluation = new Record(txDao.findCollectionByNameOrId("evaluaciones_informe"))
    evaluation.set("instancia_id", workflow.getId())
    evaluation.set("inscripcion_id", enrollment.getId())
  }
  evaluation.set("desempeno_general_valor", generalValue)
  evaluation.set("observaciones", observations)
  txDao.saveRecord(evaluation)

  var existingRecords = findByFilter(
    txDao,
    "respuestas_item_informe",
    "evaluacion_informe_id = {:evalId}",
    "",
    { evalId: evaluation.getId() }
  )

  existingRecords.forEach((record) => {
    var itemId = record.getString("item_id")
    if (!submittedItemMap[itemId]) {
      txDao.deleteRecord(record)
    }
  })

  normalizedResponses.forEach((entry) => {
    var record = existingRecords.find((candidate) => candidate.getString("item_id") === entry.itemId)
    if (!record) {
      record = new Record(txDao.findCollectionByNameOrId("respuestas_item_informe"))
      record.set("evaluacion_informe_id", evaluation.getId())
      record.set("item_id", entry.itemId)
    }
    record.set("valor_codigo", entry.valorCodigo)
    txDao.saveRecord(record)
  })
}

function reportCompleteness(dao, workflow, template, items) {
  var enrollments = evaluableEnrollmentsForScope(
    dao,
    workflow.getString("curso_id"),
    workflow.getString("ciclo_id"),
    workflow.getString("tipo_informe")
  )
  var pendingScopes = pendingEnrollmentScopesForCourse(
    dao,
    workflow.getString("curso_id"),
    workflow.getString("ciclo_id")
  )
  var pendingStudents = []

  enrollments.forEach((enrollment) => {
    var status = studentEvaluationSnapshot(dao, workflow, template, items, enrollment)
    if (!status.completo) {
      var student = requireRecord(dao, "alumnos", enrollment.getString("alumno_id"))
      pendingStudents.push({
        inscripcionId: enrollment.getId(),
        nombreCompleto: (student.getString("apellidos") + ", " + student.getString("nombres")).trim(),
        itemsPendientes: status.totalItems - status.itemsRespondidos,
        desempenoGeneralPendiente: !status.desempenoGeneralCompleto
      })
    }
  })

  return {
    completa: enrollments.length > 0 && items.length > 0 && pendingStudents.length === 0 && pendingScopes.length === 0,
    totalAlumnos: enrollments.length,
    totalItems: items.length,
    alumnosCompletos: enrollments.length - pendingStudents.length,
    pendientes: pendingStudents,
    cursadasPendientes: pendingScopes
  }
}

function invalidateReportEmissions(dao, instanciaId, inscripcionId, reason) {
  var filter = "instancia_id = {:instanciaId} && estado = 'VIGENTE'"
  var params = { instanciaId: instanciaId }
  if (inscripcionId) {
    filter += " && inscripcion_id = {:inscripcionId}"
    params.inscripcionId = inscripcionId
  }
  var records = findByFilter(dao, "emisiones_informe", filter, "", params)
  records.forEach((record) => {
    record.set("estado", "INVALIDADA")
    record.set("instantanea", null)
    record.set("motivo", reason)
    dao.saveRecord(record)
  })
}

function invalidateStudentReportEmissions(dao, inscripcionId, reason) {
  var records = findByFilter(
    dao,
    "emisiones_informe",
    "inscripcion_id = {:inscripcionId} && estado = 'VIGENTE'",
    "",
    { inscripcionId: inscripcionId }
  )
  records.forEach((record) => {
    record.set("estado", "INVALIDADA")
    record.set("instantanea", null)
    record.set("motivo", reason)
    dao.saveRecord(record)
  })
}

function issue(c) {
  noStore(c)
  var body = new DynamicModel({
    cicloId: "",
    tipoInforme: "",
    cursoId: "",
    cursoIds: [],
    materiaId: "",
    docenteNombre: "",
    docenteApellido: ""
  })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  var dao = $app.dao()

  var cycle = requireRecord(dao, "ciclos_lectivos", stringValue(data.cicloId, 15))
  var tipoInforme = stringValue(data.tipoInforme, 30)
  var needSubject = requiresSpecialSubject(tipoInforme)
  var materiaId = stringValue(data.materiaId, 15)
  var teacherFirstName = stringValue(data.docenteNombre, 120)
  var teacherLastName = stringValue(data.docenteApellido, 120)

  var rawCourseIds = []
  if (Array.isArray(data.cursoIds)) {
    data.cursoIds.forEach((entry) => {
      var id = stringValue(entry, 15)
      if (id && rawCourseIds.indexOf(id) === -1) rawCourseIds.push(id)
    })
  }
  var singleCourseId = stringValue(data.cursoId, 15)
  if (singleCourseId && rawCourseIds.indexOf(singleCourseId) === -1) {
    rawCourseIds.push(singleCourseId)
  }

  if (rawCourseIds.length === 0) {
    throw new BadRequestError("Seleccioná al menos un curso para emitir el enlace.")
  }
  if (rawCourseIds.length > 15) {
    throw new BadRequestError("Se seleccionaron demasiados cursos para un mismo enlace.")
  }

  var selectedCourses = rawCourseIds.map((cId) => requireRecord(dao, "cursos", cId))
  if (tipoInforme === "PRIMER_BIMESTRE" || tipoInforme === "PRIMER_CUATRIMESTRE" || tipoInforme === "CICLO_FINAL") {
    var hasNonPrimary = selectedCourses.some((course) => !isPrimaryCourse(dao, course))
    if (hasNonPrimary) {
      throw new BadRequestError("Este tipo de informe corresponde únicamente a Nivel Primario.")
    }
  }
  selectedCourses.sort((a, b) => {
    var orderA = a.getInt("orden") || 0
    var orderB = b.getInt("orden") || 0
    if (orderA !== orderB) return orderA - orderB
    var gradeDiff = courseGradeNumber(a) - courseGradeNumber(b)
    if (gradeDiff !== 0) return gradeDiff
    return a.getString("nombre").localeCompare(b.getString("nombre"))
  })

  if (!teacherFirstName || !teacherLastName) {
    throw new BadRequestError("El nombre y el apellido de la docente son obligatorios.")
  }

  if (needSubject) {
    if (!materiaId) {
      throw new BadRequestError("La materia especial es obligatoria para este tipo de informe.")
    }
    requireSpecialSubject(dao, materiaId)
  } else if (materiaId) {
    throw new BadRequestError("El informe de primer bimestre abarca el curso completo sin materia especial.")
  }

  var response
  $app.dao().runInTransaction((txDao) => {
    var workflows = []
    var workflowIds = []

    selectedCourses.forEach((course) => {
      var template = resolveTemplate(txDao, tipoInforme, course, materiaId)
      if (!template || templateItems(txDao, template.getId()).length === 0) {
        throw new BadRequestError(
          "No existe una plantilla configurada para " + course.getString("nombre") + "."
        )
      }

      var workflow = findWorkflow(txDao, cycle.getId(), tipoInforme, course.getId(), materiaId)
      if (workflow) {
        if (workflow.getString("estado") !== "BORRADOR_DOCENTE") {
          throw new BadRequestError(
            "El informe de " + course.getString("nombre") + " ya se encuentra bajo control directivo."
          )
        }
        workflow.set("plantilla_id", template.getId())
        workflow.set("docente_nombre", teacherFirstName)
        workflow.set("docente_apellido", teacherLastName)
        txDao.saveRecord(workflow)
      } else {
        workflow = new Record(txDao.findCollectionByNameOrId("instancias_informe"))
        workflow.set("ciclo_id", cycle.getId())
        workflow.set("tipo_informe", tipoInforme)
        workflow.set("curso_id", course.getId())
        workflow.set("materia_id", materiaId || "")
        workflow.set("plantilla_id", template.getId())
        workflow.set("estado", "BORRADOR_DOCENTE")
        workflow.set("docente_nombre", teacherFirstName)
        workflow.set("docente_apellido", teacherLastName)
        workflow.set("revision", 0)
        txDao.saveRecord(workflow)
      }
      workflows.push(workflow)
      workflowIds.push(workflow.getId())
    })

    detachInstancesFromTokens(txDao, workflowIds, "")
    var tokenRecord = new Record(txDao.findCollectionByNameOrId("tokens_acceso_informe"))
    var secret = assignSecret(tokenRecord)
    tokenRecord.set("instancia_id", workflows[0].getId())
    tokenRecord.set("instancia_ids", workflowIds)
    txDao.saveRecord(tokenRecord)

    response = {
      instancia: workflowDto(workflows[0]),
      instancias: workflows.map(workflowDto),
      enlace: tokenDto(tokenRecord, workflows, workflows[0]),
      tokenPrefijo: tokenRecord.getString("token_prefijo"),
      secreto: secret
    }
  })

  return c.json(201, response)
}

function rotate(c) {
  noStore(c)
  var body = new DynamicModel({
    docenteNombre: "",
    docenteApellido: ""
  })
  try {
    c.bind(body)
  } catch (_) {}
  var data = JSON.parse(JSON.stringify(body))
  var teacherFirstName = stringValue(data.docenteNombre, 120)
  var teacherLastName = stringValue(data.docenteApellido, 120)

  var response
  $app.dao().runInTransaction((txDao) => {
    var record = requireRecord(txDao, "tokens_acceso_informe", c.pathParam("tokenId"))
    var workflows = requireDraftWorkflows(txDao, record)
    if (teacherFirstName && teacherLastName) {
      workflows.forEach((workflow) => {
        workflow.set("docente_nombre", teacherFirstName)
        workflow.set("docente_apellido", teacherLastName)
        txDao.saveRecord(workflow)
      })
    }
    var wfIds = workflows.map((w) => w.getId())
    detachInstancesFromTokens(txDao, wfIds, record.getId())
    record.set("instancia_id", wfIds[0])
    record.set("instancia_ids", wfIds)
    var secret = assignSecret(record)
    txDao.saveRecord(record)
    response = {
      instancia: workflowDto(workflows[0]),
      instancias: workflows.map(workflowDto),
      enlace: tokenDto(record, workflows, workflows[0]),
      tokenPrefijo: record.getString("token_prefijo"),
      secreto: secret
    }
  })
  return c.json(200, response)
}

function recover(c) {
  noStore(c)
  var dao = $app.dao()
  var record = requireRecord(dao, "tokens_acceso_informe", c.pathParam("tokenId"))
  validateAccessRecord(record)
  var workflows = requireDraftWorkflows(dao, record)
  var cipherText = record.getString("token_cifrado")
  if (!cipherText) {
    throw new BadRequestError("Este enlace debe regenerarse una vez antes de poder copiarlo.")
  }
  var secret = $security.decrypt(cipherText, teacherLinkKey())
  if (typeof secret !== "string" || $security.sha256(secret) !== record.getString("token_hash")) {
    throw new InternalServerError("No se pudo recuperar el enlace docente.")
  }
  return c.json(200, {
    secreto: secret,
    tokenPrefijo: record.getString("token_prefijo"),
    enlace: tokenDto(record, workflows, workflows[0]),
    instancia: workflowDto(workflows[0]),
    instancias: workflows.map(workflowDto)
  })
}

function revoke(c) {
  noStore(c)
  var response
  $app.dao().runInTransaction((txDao) => {
    var record = requireRecord(txDao, "tokens_acceso_informe", c.pathParam("tokenId"))
    var workflows = requireDraftWorkflows(txDao, record)
    txDao.deleteRecord(record)
    response = {
      instancia: workflowDto(workflows[0]),
      instancias: workflows.map(workflowDto),
      eliminado: true
    }
  })
  return c.json(200, response)
}

function context(c) {
  var access = requireAccess(c)
  var dao = $app.dao()
  var resolved = resolveRequestedDraftWorkflow(
    dao,
    access,
    c.queryParam("instanciaId"),
    c.queryParam("cursoId")
  )
  var workflow = resolved.active
  var draftWorkflows = resolved.all
  var cycle = requireRecord(dao, "ciclos_lectivos", workflow.getString("ciclo_id"))
  var course = requireRecord(dao, "cursos", workflow.getString("curso_id"))
  var subject = workflow.getString("materia_id")
    ? requireRecord(dao, "materias", workflow.getString("materia_id"))
    : null
  var template = requireRecord(dao, "plantillas_informe", workflow.getString("plantilla_id"))
  var items = templateItems(dao, template.getId())
  var enrollments = evaluableEnrollmentsForScope(
    dao,
    workflow.getString("curso_id"),
    workflow.getString("ciclo_id"),
    workflow.getString("tipo_informe")
  )

  var students = enrollments.map((enrollment) => {
    var student = requireRecord(dao, "alumnos", enrollment.getString("alumno_id"))
    var status = studentEvaluationSnapshot(dao, workflow, template, items, enrollment)
    return {
      inscripcionId: enrollment.getId(),
      numeroOrden: enrollment.getInt("numero_orden") || null,
      apellidos: student.getString("apellidos"),
      nombres: student.getString("nombres"),
      nombreCompleto: (student.getString("apellidos") + ", " + student.getString("nombres")).trim(),
      completo: status.completo,
      itemsRespondidos: status.itemsRespondidos,
      totalItems: status.totalItems,
      desempenoGeneralCompleto: status.desempenoGeneralCompleto
    }
  })

  var cursosAsignados = draftWorkflows.map((wf) => {
    var wfCourse = requireRecord(dao, "cursos", wf.getString("curso_id"))
    var wfTemplate = requireRecord(dao, "plantillas_informe", wf.getString("plantilla_id"))
    var wfItems = templateItems(dao, wfTemplate.getId())
    var wfCompleteness = reportCompleteness(dao, wf, wfTemplate, wfItems)
    return {
      instanciaId: wf.getId(),
      cursoId: wfCourse.getId(),
      cursoNombre: wfCourse.getString("nombre"),
      grado: wfCourse.getString("grado"),
      turno: wfCourse.getString("turno"),
      plantillaCodigo: wfTemplate.getString("codigo"),
      totalAlumnos: wfCompleteness.totalAlumnos,
      alumnosCompletos: wfCompleteness.alumnosCompletos,
      completa: wfCompleteness.completa,
      revision: wf.getInt("revision")
    }
  })

  return c.json(200, {
    acceso: tokenDto(access, draftWorkflows, workflow),
    instancia: workflowDto(workflow),
    cursosAsignados: cursosAsignados,
    ciclo: {
      id: cycle.getId(),
      nombre: cycle.getString("nombre"),
      ano: cycle.getInt("ano")
    },
    curso: {
      id: course.getId(),
      nombre: course.getString("nombre"),
      grado: course.getString("grado"),
      turno: course.getString("turno")
    },
    materia: subject
      ? {
          id: subject.getId(),
          nombre: subject.getString("nombre")
        }
      : null,
    plantilla: templateDto(template, course),
    items: items.map(itemDto),
    alumnos: students,
    progreso: {
      totalAlumnos: students.length,
      alumnosCompletos: students.filter((s) => s.completo).length
    },
    cursadasPendientes: pendingEnrollmentScopesForCourse(
      dao,
      workflow.getString("curso_id"),
      workflow.getString("ciclo_id")
    )
  })
}

function student(c) {
  var access = requireAccess(c)
  var dao = $app.dao()
  var resolved = requireDraftWorkflowForEnrollment(dao, access, c.pathParam("inscripcionId"))
  var workflow = resolved.workflow
  var enrollment = resolved.enrollment
  var template = requireRecord(dao, "plantillas_informe", workflow.getString("plantilla_id"))
  var items = templateItems(dao, template.getId())
  return c.json(200, studentEvaluationSnapshot(dao, workflow, template, items, enrollment))
}

function saveStudent(c) {
  var access = requireAccess(c)
  var dao = $app.dao()
  var enrollmentId = c.pathParam("inscripcionId")
  requireDraftWorkflowForEnrollment(dao, access, enrollmentId)

  var body = new DynamicModel({
    desempenoGeneralValor: "",
    observaciones: "",
    respuestas: []
  })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))

  var response
  $app.dao().runInTransaction((txDao) => {
    var transactionalAccess = validateAccessRecord(
      requireRecord(txDao, "tokens_acceso_informe", access.getId())
    )
    var resolved = requireDraftWorkflowForEnrollment(txDao, transactionalAccess, enrollmentId)
    var workflow = resolved.workflow
    var enrollment = resolved.enrollment
    var template = requireRecord(txDao, "plantillas_informe", workflow.getString("plantilla_id"))
    var items = templateItems(txDao, template.getId())
    saveStudentEvaluation(txDao, workflow, template, items, enrollment, data, false)
    workflow.set("revision", workflow.getInt("revision") + 1)
    txDao.saveRecord(workflow)
    response = studentEvaluationSnapshot(txDao, workflow, template, items, enrollment)
    response.revision = workflow.getInt("revision")
  })

  return c.json(200, response)
}

function submitReport(c) {
  var access = requireAccess(c)
  var body = new DynamicModel({
    instanciaId: "",
    cursoId: ""
  })
  try {
    c.bind(body)
  } catch (_) {}
  var data = JSON.parse(JSON.stringify(body))
  var requestedInstanciaId = stringValue(data.instanciaId, 15) || stringValue(c.queryParam("instanciaId"), 15)
  var requestedCursoId = stringValue(data.cursoId, 15) || stringValue(c.queryParam("cursoId"), 15)

  var status = 200
  var response

  $app.dao().runInTransaction((txDao) => {
    var transactionalAccess = validateAccessRecord(
      requireRecord(txDao, "tokens_acceso_informe", access.getId())
    )
    var resolved = resolveRequestedDraftWorkflow(
      txDao,
      transactionalAccess,
      requestedInstanciaId,
      requestedCursoId
    )
    var workflow = resolved.active
    var draftWorkflows = resolved.all
    var template = requireRecord(txDao, "plantillas_informe", workflow.getString("plantilla_id"))
    var items = templateItems(txDao, template.getId())
    var completeness = reportCompleteness(txDao, workflow, template, items)
    if (!completeness.completa) {
      status = 422
      response = completeness
      return
    }

    var enrollments = evaluableEnrollmentsForScope(
      txDao,
      workflow.getString("curso_id"),
      workflow.getString("ciclo_id"),
      workflow.getString("tipo_informe")
    )
    var approvalCollection = txDao.findCollectionByNameOrId("visados_informe")
    enrollments.forEach((enrollment) => {
      var approval = new Record(approvalCollection)
      approval.set("instancia_id", workflow.getId())
      approval.set("inscripcion_id", enrollment.getId())
      approval.set("estado", "PENDIENTE_REVISION")
      approval.set("revision_contenido", 0)
      approval.set("generacion_visado", 0)
      txDao.saveRecord(approval)
    })

    workflow.set("estado", "CONTROL_DIRECTIVO")
    workflow.set("revision", workflow.getInt("revision") + 1)
    workflow.set("enviado_at", new Date().toISOString())
    workflow.set(
      "enviado_por",
      (workflow.getString("docente_apellido") + ", " + workflow.getString("docente_nombre")).trim()
    )
    txDao.saveRecord(workflow)
    detachInstancesFromTokens(txDao, [workflow.getId()], "")

    var remainingWorkflows = draftWorkflows.filter((w) => w.getId() !== workflow.getId())

    response = {
      instancia: workflowDto(workflow),
      totalAlumnos: completeness.totalAlumnos,
      totalItems: completeness.totalItems,
      cursosRestantes: remainingWorkflows.length,
      siguienteInstanciaId: remainingWorkflows.length > 0 ? remainingWorkflows[0].getId() : null
    }
  })

  return c.json(status, response)
}

function missingReviewEnrollments(dao, workflow, approvals) {
  var included = {}
  approvals.forEach((approval) => {
    included[approval.getString("inscripcion_id")] = true
  })
  return evaluableEnrollmentsForScope(
    dao,
    workflow.getString("curso_id"),
    workflow.getString("ciclo_id"),
    workflow.getString("tipo_informe")
  ).filter((enrollment) => !included[enrollment.getId()])
}

function reportDocumentPreparation(student, workflow) {
  var issues = []
  var hasText = (value) => typeof value === "string" && value.trim() !== "" && !/^-+$/.test(value.trim())
  if (!hasText(student.getString("apellidos"))) {
    issues.push({
      campo: "alumno.apellidos",
      mensaje: "Completar el apellido del alumno en su ficha.",
      origen: "alumno"
    })
  }
  if (!hasText(student.getString("nombres"))) {
    issues.push({
      campo: "alumno.nombres",
      mensaje: "Completar el nombre del alumno en su ficha.",
      origen: "alumno"
    })
  }
  if (!hasText(workflow.getString("docente_nombre"))) {
    issues.push({
      campo: "docente.nombre",
      mensaje: "Completar el nombre de la docente en el informe.",
      origen: "docente"
    })
  }
  if (!hasText(workflow.getString("docente_apellido"))) {
    issues.push({
      campo: "docente.apellido",
      mensaje: "Completar el apellido de la docente en el informe.",
      origen: "docente"
    })
  }
  return {
    completa: issues.length === 0,
    alumnoId: student.getId(),
    faltantes: issues
  }
}

function evaluateReportPdfEligibility(approval, student, workflow) {
  var reasons = []
  if (!approval) {
    reasons.push("El alumno no se encuentra incorporado en la entrega del informe.")
  } else if (approval.getString("estado") !== "VISADO") {
    reasons.push("Falta visar el informe del alumno.")
  } else if (
    approval.getInt("revision_contenido") !== approval.getInt("revision_visada") ||
    approval.getInt("generacion_visado") < 1
  ) {
    reasons.push("Debe revisarse nuevamente el visado del informe.")
  }
  var prep = reportDocumentPreparation(student, workflow)
  return {
    elegiblePorVisado: reasons.length === 0,
    elegibleParaPdf: reasons.length === 0 && prep.completa,
    motivos: reasons
  }
}

function staffStages(c) {
  noStore(c)
  var response
  $app.dao().runInTransaction((txDao) => {
    var cycle = requireRecord(txDao, "ciclos_lectivos", c.pathParam("cicloId"))
    var tipoInforme = stringValue(c.pathParam("tipoInforme"), 30)
    var needSubject = requiresSpecialSubject(tipoInforme)
    var courses = findByFilter(txDao, "cursos", "id != ''", "orden,nombre", {})
    if (tipoInforme === "PRIMER_BIMESTRE" || tipoInforme === "PRIMER_CUATRIMESTRE" || tipoInforme === "CICLO_FINAL") {
      courses = courses.filter((course) => isPrimaryCourse(txDao, course))
    }
    courses.sort((a, b) => {
      var orderA = a.getInt("orden") || 0
      var orderB = b.getInt("orden") || 0
      if (orderA !== orderB) return orderA - orderB
      var gradeDiff = courseGradeNumber(a) - courseGradeNumber(b)
      if (gradeDiff !== 0) return gradeDiff
      return a.getString("nombre").localeCompare(b.getString("nombre"))
    })
    var specialSubjects = listSpecialSubjects(txDao)

    var allTokens = findByFilter(txDao, "tokens_acceso_informe", "id != ''", "", {})
    var tokenDtoByInstanciaId = {}
    allTokens.forEach((tokenRecord) => {
      var wfList = tokenWorkflows(txDao, tokenRecord)
      if (wfList.length === 0) return
      wfList.forEach((wf) => {
        tokenDtoByInstanciaId[wf.getId()] = tokenDto(tokenRecord, wfList, wf)
      })
    })

    var scopes = []
    courses.forEach((course) => {
      if (needSubject) {
        specialSubjects.forEach((subj) => {
          scopes.push({ course: course, subjectId: subj.id, subjectName: subj.nombre })
        })
      } else {
        scopes.push({ course: course, subjectId: "", subjectName: null })
      }
    })

    var cells = scopes.map((scope) => {
      var course = scope.course
      var materiaId = scope.subjectId
      var template = resolveTemplate(txDao, tipoInforme, course, materiaId)
      var items = template ? templateItems(txDao, template.getId()) : []
      var workflow = findWorkflow(txDao, cycle.getId(), tipoInforme, course.getId(), materiaId)
      var linkDto = workflow ? tokenDtoByInstanciaId[workflow.getId()] || null : null

      var evaluable = evaluableEnrollmentsForScope(txDao, course.getId(), cycle.getId(), tipoInforme)
      var pendingScopes = pendingEnrollmentScopesForCourse(txDao, course.getId(), cycle.getId())
      var stage = "PENDIENTE_CONFIGURACION"
      var approvals = []
      var approvedCount = 0
      var completeStudentsCount = 0

      if (workflow && template && items.length > 0) {
        evaluable.forEach((enrollment) => {
          if (studentEvaluationSnapshot(txDao, workflow, template, items, enrollment).completo) {
            completeStudentsCount += 1
          }
        })
      }

      if (!workflow) {
        if (template && items.length > 0) {
          stage = "PENDIENTE_EMISION"
        }
      } else if (workflow.getString("estado") === "BORRADOR_DOCENTE") {
        stage = linkDto ? "CARGA_DOCENTE" : "CARGA_PAUSADA"
      } else {
        approvals = findByFilter(
          txDao,
          "visados_informe",
          "instancia_id = {:instanciaId}",
          "",
          { instanciaId: workflow.getId() }
        )
        approvedCount = approvals.filter((approval) => approval.getString("estado") === "VISADO").length
        stage =
          approvals.length > 0 &&
          approvedCount === approvals.length &&
          missingReviewEnrollments(txDao, workflow, approvals).length === 0
            ? "LISTO_PARA_PDF"
            : "REVISION_DIRECTIVA"
      }

      return {
        cursoId: course.getId(),
        materiaId: materiaId || null,
        plantillaId: template ? template.getId() : null,
        plantillaCodigo: template ? template.getString("codigo") : null,
        totalItems: items.length,
        instanciaId: workflow ? workflow.getId() : null,
        etapa: stage,
        revision: workflow ? workflow.getInt("revision") : null,
        docenteNombre: workflow ? workflow.getString("docente_nombre") : null,
        docenteApellido: workflow ? workflow.getString("docente_apellido") : null,
        enlace: linkDto,
        inscripcionesEvaluables: evaluable.map((enrollment) => enrollment.getId()),
        alumnosCompletos: completeStudentsCount,
        totalInformes: approvals.length,
        visados: approvedCount,
        cursadasPendientes: pendingScopes
      }
    })

    response = {
      ciclo: {
        id: cycle.getId(),
        nombre: cycle.getString("nombre"),
        ano: cycle.getInt("ano")
      },
      tipoInforme: tipoInforme,
      requiereMateriaEspecial: needSubject,
      cursos: courses.map((course) => ({
        id: course.getId(),
        nombre: course.getString("nombre"),
        grado: course.getString("grado"),
        gradoNumero: courseGradeNumber(course),
        turno: course.getString("turno")
      })),
      materiasEspeciales: specialSubjects,
      celdas: cells
    }
  })
  return c.json(200, response)
}

function staffReview(c) {
  noStore(c)
  var response
  $app.dao().runInTransaction((txDao) => {
    var workflow = requireStaffWorkflowById(txDao, c.pathParam("instanciaId"))
    var cycle = requireRecord(txDao, "ciclos_lectivos", workflow.getString("ciclo_id"))
    var course = requireRecord(txDao, "cursos", workflow.getString("curso_id"))
    var subject = workflow.getString("materia_id")
      ? requireRecord(txDao, "materias", workflow.getString("materia_id"))
      : null
    var template = requireRecord(txDao, "plantillas_informe", workflow.getString("plantilla_id"))
    var items = templateItems(txDao, template.getId())
    var approvals = findByFilter(
      txDao,
      "visados_informe",
      "instancia_id = {:instanciaId}",
      "created",
      { instanciaId: workflow.getId() }
    )
    var missingEnrollments = missingReviewEnrollments(txDao, workflow, approvals)
    var approvedCount = 0

    var students = approvals.map((approval) => {
      if (approval.getString("estado") === "VISADO") approvedCount += 1
      var enrollment = requireRecord(txDao, "inscripciones", approval.getString("inscripcion_id"))
      var studentRecord = requireRecord(txDao, "alumnos", enrollment.getString("alumno_id"))
      var evalSnapshot = studentEvaluationSnapshot(txDao, workflow, template, items, enrollment)
      return Object.assign(approvalDto(approval), {
        nombreCompleto: (studentRecord.getString("apellidos") + ", " + studentRecord.getString("nombres")).trim(),
        apellidos: studentRecord.getString("apellidos"),
        nombres: studentRecord.getString("nombres"),
        numeroOrden: enrollment.getInt("numero_orden") || null,
        completo: evalSnapshot.completo,
        itemsRespondidos: evalSnapshot.itemsRespondidos,
        totalItems: evalSnapshot.totalItems,
        desempenoGeneralValor: evalSnapshot.evaluacion.desempenoGeneralValor,
        elegibilidadPdf: evaluateReportPdfEligibility(approval, studentRecord, workflow),
        preparacionDocumental: reportDocumentPreparation(studentRecord, workflow)
      })
    })

    students.sort((a, b) => {
      if (a.numeroOrden !== null && b.numeroOrden !== null && a.numeroOrden !== b.numeroOrden) {
        return a.numeroOrden - b.numeroOrden
      }
      return a.nombreCompleto.localeCompare(b.nombreCompleto)
    })

    response = {
      instancia: workflowDto(workflow),
      ciclo: {
        id: cycle.getId(),
        nombre: cycle.getString("nombre"),
        ano: cycle.getInt("ano")
      },
      curso: {
        id: course.getId(),
        nombre: course.getString("nombre"),
        grado: course.getString("grado"),
        turno: course.getString("turno")
      },
      materia: subject
        ? {
            id: subject.getId(),
            nombre: subject.getString("nombre")
          }
        : null,
      plantilla: templateDto(template),
      items: items.map(itemDto),
      etapa:
        approvals.length > 0 && approvedCount === approvals.length && missingEnrollments.length === 0
          ? "LISTO_PARA_PDF"
          : "REVISION_DIRECTIVA",
      totalInformes: approvals.length,
      visados: approvedCount,
      alumnosSinIncorporar: missingEnrollments.length,
      inscripcionesEvaluables: evaluableEnrollmentsForScope(
        txDao,
        workflow.getString("curso_id"),
        workflow.getString("ciclo_id"),
        workflow.getString("tipo_informe")
      ).map((enrollment) => enrollment.getId()),
      informes: students
    }
  })
  return c.json(200, response)
}

function synchronizeReviewEnrollments(c) {
  noStore(c)
  var body = new DynamicModel({ expectedRevision: -1 })
  c.bind(body)
  var expectedRevision = Number(body.expectedRevision)
  if (!isFinite(expectedRevision) || expectedRevision < 0 || Math.floor(expectedRevision) !== expectedRevision) {
    throw new BadRequestError("La revisión esperada no es válida.")
  }
  var result
  var conflictRevision = null
  $app.dao().runInTransaction((txDao) => {
    var workflow = requireStaffWorkflowById(txDao, c.pathParam("instanciaId"))
    if (workflow.getInt("revision") !== expectedRevision) {
      conflictRevision = workflow.getInt("revision")
      return
    }
    var approvals = findByFilter(
      txDao,
      "visados_informe",
      "instancia_id = {:instanciaId}",
      "",
      { instanciaId: workflow.getId() }
    )
    var missing = missingReviewEnrollments(txDao, workflow, approvals)
    if (missing.some((enrollment) => enrollmentScope(enrollment).estado === "PENDIENTE")) {
      throw new BadRequestError("Dirección debe confirmar las cursadas antes de incorporarlas a la entrega.")
    }
    var collection = txDao.findCollectionByNameOrId("visados_informe")
    missing.forEach((enrollment) => {
      var approval = new Record(collection)
      approval.set("instancia_id", workflow.getId())
      approval.set("inscripcion_id", enrollment.getId())
      approval.set("estado", "PENDIENTE_REVISION")
      approval.set("revision_contenido", 0)
      approval.set("generacion_visado", 0)
      txDao.saveRecord(approval)
    })
    if (missing.length > 0) {
      workflow.set("revision", workflow.getInt("revision") + 1)
      txDao.saveRecord(workflow)
    }
    result = {
      instancia: workflowDto(workflow),
      incorporados: missing.length
    }
  })
  if (conflictRevision !== null) {
    return c.json(409, {
      message: "El informe cambió desde la última lectura.",
      currentRevision: conflictRevision
    })
  }
  return c.json(200, result)
}

function updateTeacherName(c) {
  noStore(c)
  var body = new DynamicModel({
    docenteNombre: "",
    docenteApellido: "",
    expectedRevision: -1
  })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  var teacherFirstName = stringValue(data.docenteNombre, 120)
  var teacherLastName = stringValue(data.docenteApellido, 120)
  if (!teacherFirstName || !teacherLastName) {
    throw new BadRequestError("El nombre y el apellido de la docente son obligatorios.")
  }

  var expectedRevision = Number(data.expectedRevision)
  var checkRevision = isFinite(expectedRevision) && expectedRevision >= 0 && Math.floor(expectedRevision) === expectedRevision

  var response
  var conflictRevision = null
  $app.dao().runInTransaction((txDao) => {
    var workflow = requireRecord(txDao, "instancias_informe", c.pathParam("instanciaId"))
    if (checkRevision && workflow.getInt("revision") !== expectedRevision) {
      conflictRevision = workflow.getInt("revision")
      return
    }
    workflow.set("docente_nombre", teacherFirstName)
    workflow.set("docente_apellido", teacherLastName)
    workflow.set("revision", workflow.getInt("revision") + 1)
    txDao.saveRecord(workflow)
    invalidateReportEmissions(txDao, workflow.getId(), "", "Cambió el nombre o apellido de la docente.")
    response = {
      instancia: workflowDto(workflow)
    }
  })

  if (conflictRevision !== null) {
    return c.json(409, {
      message: "El informe fue modificado por otra sesión.",
      currentRevision: conflictRevision
    })
  }
  return c.json(200, response)
}

function requireReportApproval(dao, workflow, enrollmentId) {
  var approval = findFirstByFilter(
    dao,
    "visados_informe",
    "instancia_id = {:instanciaId} && inscripcion_id = {:inscripcionId}",
    { instanciaId: workflow.getId(), inscripcionId: enrollmentId }
  )
  if (!approval) {
    throw new ForbiddenError("El alumno no pertenece a la entrega de este informe.")
  }
  return approval
}

function staffStudent(c) {
  noStore(c)
  var response
  $app.dao().runInTransaction((txDao) => {
    var workflow = requireStaffWorkflowById(txDao, c.pathParam("instanciaId"))
    var enrollment = requireEnrollmentForWorkflow(txDao, workflow, c.pathParam("inscripcionId"))
    var approval = requireReportApproval(txDao, workflow, enrollment.getId())
    var template = requireRecord(txDao, "plantillas_informe", workflow.getString("plantilla_id"))
    var items = templateItems(txDao, template.getId())
    response = studentEvaluationSnapshot(txDao, workflow, template, items, enrollment)
    response.visado = approvalDto(approval)
    response.revision = workflow.getInt("revision")
  })
  return c.json(200, response)
}

function saveStaffStudent(c) {
  noStore(c)
  var body = new DynamicModel({
    expectedRevision: -1,
    desempenoGeneralValor: "",
    observaciones: "",
    respuestas: []
  })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  var expectedRevision = Number(data.expectedRevision)
  if (!isFinite(expectedRevision) || expectedRevision < 0 || Math.floor(expectedRevision) !== expectedRevision) {
    throw new BadRequestError("La revisión esperada del informe no es válida.")
  }

  var response
  var conflictRevision = null
  $app.dao().runInTransaction((txDao) => {
    var workflow = requireStaffWorkflowById(txDao, c.pathParam("instanciaId"))
    var enrollment = requireEnrollmentForWorkflow(txDao, workflow, c.pathParam("inscripcionId"))
    var approval = requireReportApproval(txDao, workflow, enrollment.getId())
    if (workflow.getInt("revision") !== expectedRevision) {
      conflictRevision = workflow.getInt("revision")
      return
    }
    var template = requireRecord(txDao, "plantillas_informe", workflow.getString("plantilla_id"))
    var items = templateItems(txDao, template.getId())
    saveStudentEvaluation(txDao, workflow, template, items, enrollment, data, true)

    invalidateReportEmissions(txDao, workflow.getId(), enrollment.getId(), "Cambió el contenido del informe en revisión directiva.")
    approval.set("generacion_visado", approval.getInt("generacion_visado") + 1)
    approval.set("revision_contenido", approval.getInt("revision_contenido") + 1)
    approval.set("estado", "PENDIENTE_REVISION")
    approval.set("revision_visada", null)
    approval.set("visado_at", "")
    approval.set("visado_por", "")
    txDao.saveRecord(approval)

    workflow.set("revision", workflow.getInt("revision") + 1)
    txDao.saveRecord(workflow)

    var updated = studentEvaluationSnapshot(txDao, workflow, template, items, enrollment)
    response = {
      instancia: workflowDto(workflow),
      visado: approvalDto(approval),
      evaluacion: updated.evaluacion
    }
  })

  if (conflictRevision !== null) {
    return c.json(409, {
      message: "El informe fue modificado por otra sesión.",
      currentRevision: conflictRevision
    })
  }
  return c.json(200, response)
}

function changeApproval(c, approve) {
  noStore(c)
  var body = new DynamicModel({
    expectedRevision: -1,
    expectedContentRevision: -1
  })
  c.bind(body)
  var data = JSON.parse(JSON.stringify(body))
  var expectedRevision = Number(data.expectedRevision)
  var expectedContentRevision = Number(data.expectedContentRevision)
  if (
    !isFinite(expectedRevision) ||
    expectedRevision < 0 ||
    Math.floor(expectedRevision) !== expectedRevision ||
    !isFinite(expectedContentRevision) ||
    expectedContentRevision < 0 ||
    Math.floor(expectedContentRevision) !== expectedContentRevision
  ) {
    throw new BadRequestError("La revisión esperada no es válida.")
  }

  var response
  var conflictRevision = null
  $app.dao().runInTransaction((txDao) => {
    var workflow = requireStaffWorkflowById(txDao, c.pathParam("instanciaId"))
    var enrollment = requireEnrollmentForWorkflow(txDao, workflow, c.pathParam("inscripcionId"))
    var approval = requireReportApproval(txDao, workflow, enrollment.getId())

    if (
      workflow.getInt("revision") !== expectedRevision ||
      approval.getInt("revision_contenido") !== expectedContentRevision
    ) {
      conflictRevision = workflow.getInt("revision")
      return
    }

    if (
      (approve && approval.getString("estado") === "VISADO") ||
      (!approve && approval.getString("estado") === "PENDIENTE_REVISION")
    ) {
      response = {
        instancia: workflowDto(workflow),
        visado: approvalDto(approval)
      }
      return
    }

    var template = requireRecord(txDao, "plantillas_informe", workflow.getString("plantilla_id"))
    var items = templateItems(txDao, template.getId())
    var evalStatus = studentEvaluationSnapshot(txDao, workflow, template, items, enrollment)

    if (approve && !evalStatus.completo) {
      throw new BadRequestError("El informe del alumno todavía está incompleto.")
    }

    invalidateReportEmissions(txDao, workflow.getId(), enrollment.getId(), "Cambió la autorización del informe.")
    approval.set("generacion_visado", approval.getInt("generacion_visado") + 1)
    if (approve) {
      approval.set("estado", "VISADO")
      approval.set("revision_visada", approval.getInt("revision_contenido"))
      approval.set("visado_at", new Date().toISOString())
      approval.set("visado_por", c.get("authRecord").getId())
    } else {
      approval.set("estado", "PENDIENTE_REVISION")
      approval.set("revision_visada", null)
      approval.set("visado_at", "")
      approval.set("visado_por", "")
    }
    txDao.saveRecord(approval)

    workflow.set("revision", workflow.getInt("revision") + 1)
    txDao.saveRecord(workflow)

    response = {
      instancia: workflowDto(workflow),
      visado: approvalDto(approval)
    }
  })

  if (conflictRevision !== null) {
    return c.json(409, {
      message: "El informe cambió desde la última lectura.",
      currentRevision: conflictRevision
    })
  }
  return c.json(200, response)
}

function approveStudent(c) {
  return changeApproval(c, true)
}

function revokeStudentApproval(c) {
  return changeApproval(c, false)
}

function reportFilenameLabel(tipoInforme, subjectMeta) {
  var prefix = tipoInforme === "CICLO_FINAL"
    ? "INFORME FINAL"
    : tipoInforme === "PRIMER_CUATRIMESTRE"
      ? "INFORME 1 CUATRIMESTRE"
      : "INFORME 1 BIMESTRE"
  if (subjectMeta && subjectMeta.etiquetaPdf) {
    return prefix + " - " + subjectMeta.etiquetaPdf.toUpperCase()
  }
  return prefix
}

function buildReportDocumentSnapshot(dao, instanciaId, inscripcionId) {
  var workflow = requireStaffWorkflowById(dao, instanciaId)
  var enrollment = requireEnrollmentForWorkflow(dao, workflow, inscripcionId)
  var approval = requireReportApproval(dao, workflow, enrollment.getId())
  var cycle = requireRecord(dao, "ciclos_lectivos", workflow.getString("ciclo_id"))
  var course = requireRecord(dao, "cursos", workflow.getString("curso_id"))
  var subject = workflow.getString("materia_id")
    ? requireRecord(dao, "materias", workflow.getString("materia_id"))
    : null
  var subjectMeta = subject ? classifySpecialSubject(subject.getString("nombre")) : null
  var studentRecord = requireRecord(dao, "alumnos", enrollment.getString("alumno_id"))
  var template = requireRecord(dao, "plantillas_informe", workflow.getString("plantilla_id"))
  var items = templateItems(dao, template.getId())
  var evalSnapshot = studentEvaluationSnapshot(dao, workflow, template, items, enrollment)
  var eligibility = evaluateReportPdfEligibility(approval, studentRecord, workflow)
  var preparation = reportDocumentPreparation(studentRecord, workflow)

  if (!eligibility.elegibleParaPdf || !evalSnapshot.completo) {
    var reasons = [].concat(eligibility.motivos)
    if (!evalSnapshot.completo) {
      reasons.push("El informe del alumno tiene ítems o desempeño general pendientes.")
    }
    preparation.faltantes.forEach((f) => reasons.push(f.mensaje))
    return {
      status: 422,
      body: {
        message: reasons.join(" ") || "El informe no está listo para emitir su PDF.",
        elegibilidadPdf: eligibility,
        preparacionDocumental: preparation
      }
    }
  }

  var tDto = templateDto(template, course)
  var generalScaleMap = allowedScaleCodesMap(tDto.escalaDesempenoGeneral)
  var generalCode = evalSnapshot.evaluacion.desempenoGeneralValor || ""
  var generalEntry = generalCode ? generalScaleMap[generalCode] : null

  var datos = {
    instanciaId: workflow.getId(),
    inscripcionId: enrollment.getId(),
    tipoInforme: workflow.getString("tipo_informe"),
    ciclo: {
      id: cycle.getId(),
      nombre: cycle.getString("nombre"),
      ano: cycle.getInt("ano")
    },
    curso: {
      id: course.getId(),
      nombre: course.getString("nombre"),
      grado: course.getString("grado"),
      gradoNumero: courseGradeNumber(course),
      turno: course.getString("turno")
    },
    materia: subject
      ? {
          id: subject.getId(),
          nombre: subject.getString("nombre"),
          codigoEspecial: subjectMeta ? subjectMeta.codigoEspecial : null,
          etiquetaPdf: subjectMeta ? subjectMeta.etiquetaPdf : subject.getString("nombre")
        }
      : null,
    docente: {
      nombre: workflow.getString("docente_nombre").trim(),
      apellido: workflow.getString("docente_apellido").trim()
    },
    direccion: {
      nombre: "MYRIAM GRACIELA",
      apellido: "ADDUCCI"
    },
    alumno: {
      id: studentRecord.getId(),
      apellidos: studentRecord.getString("apellidos").trim(),
      nombres: studentRecord.getString("nombres").trim(),
      numeroOrden: enrollment.getInt("numero_orden") || null
    },
    plantilla: tDto,
    items: items.map(itemDto),
    evaluacion: {
      desempenoGeneralCodigo: generalCode || null,
      desempenoGeneralEtiqueta: generalEntry ? generalEntry.etiqueta : null,
      observaciones: evalSnapshot.evaluacion.observaciones || "",
      respuestas: evalSnapshot.evaluacion.respuestas
    },
    visado: {
      generacionVisado: approval.getInt("generacion_visado"),
      revisionVisada: approval.getInt("revision_visada"),
      visadoAt: approval.getString("visado_at") || null,
      visadoPor: approval.getString("visado_por") || null
    }
  }

  var huella = $security.sha256(JSON.stringify(datos))
  return {
    status: 200,
    body: {
      huella: huella,
      datos: datos
    }
  }
}

function staffSnapshot(c) {
  noStore(c)
  var result
  $app.dao().runInTransaction((txDao) => {
    result = buildReportDocumentSnapshot(
      txDao,
      c.pathParam("instanciaId"),
      c.pathParam("inscripcionId")
    )
  })
  return c.json(result.status, result.body)
}

function revokeEmissionRecord(dao, record, reason) {
  record.set("estado", "INVALIDADA")
  record.set("instantanea", null)
  record.set("motivo", reason)
  dao.saveRecord(record)
}

function lookupReportEmission(c) {
  noStore(c)
  var result = null
  $app.dao().runInTransaction((txDao) => {
    var snapshot = buildReportDocumentSnapshot(
      txDao,
      c.pathParam("instanciaId"),
      c.pathParam("inscripcionId")
    )
    if (snapshot.status !== 200) return
    var records = findByFilter(
      txDao,
      "emisiones_informe",
      "instancia_id = {:instanciaId} && inscripcion_id = {:inscripcionId} && estado = 'VIGENTE'",
      "-created",
      {
        instanciaId: c.pathParam("instanciaId"),
        inscripcionId: c.pathParam("inscripcionId")
      }
    )
    records.forEach((record) => {
      if (record.getString("huella") !== snapshot.body.huella) {
        revokeEmissionRecord(txDao, record, "Datos o visado desactualizados.")
      } else if (record.getString("version") === c.queryParam("version")) {
        result = {
          id: record.getId(),
          huella: record.getString("huella")
        }
      }
    })
  })
  return c.json(200, { emision: result })
}

function publishReportEmission(c) {
  noStore(c)
  var key = $os.getenv("CYS_PDF_WORKER_KEY")
  if (!key || !$security.equal(key, c.request().header.get("X-CYS-PDF-Worker"))) {
    throw new ForbiddenError("Generador no autorizado.")
  }
  var version = c.formValue("version")
  var hash = c.formValue("huella")
  var archivoSha256 = c.formValue("archivoSha256")
  if (!/^[a-f0-9]{64}$/.test(version) || !/^[a-f0-9]{64}$/.test(hash) || !/^[a-f0-9]{64}$/.test(archivoSha256)) {
    throw new BadRequestError("Versión no válida.")
  }
  var upload = $filesystem.fileFromMultipart(c.formFile("archivo"))
  var resultId
  var created = false
  var failure = false

  $app.dao().runInTransaction((txDao) => {
    var snapshot = buildReportDocumentSnapshot(
      txDao,
      c.pathParam("instanciaId"),
      c.pathParam("inscripcionId")
    )
    if (snapshot.status !== 200 || snapshot.body.huella !== hash) {
      failure = true
      return
    }
    var data = snapshot.body.datos
    var existing = findByFilter(
      txDao,
      "emisiones_informe",
      "instancia_id = {:instanciaId} && inscripcion_id = {:inscripcionId} && estado = 'VIGENTE' && huella = {:hash} && version = {:version}",
      "",
      {
        instanciaId: data.instanciaId,
        inscripcionId: data.inscripcionId,
        hash: hash,
        version: version
      }
    )
    if (existing.length > 0) {
      resultId = existing[0].getId()
      return
    }
    var previous = findByFilter(
      txDao,
      "emisiones_informe",
      "instancia_id = {:instanciaId} && inscripcion_id = {:inscripcionId} && estado = 'VIGENTE'",
      "",
      {
        instanciaId: data.instanciaId,
        inscripcionId: data.inscripcionId
      }
    )
    previous.forEach((record) => revokeEmissionRecord(txDao, record, "Reemplazado por una nueva emisión."))

    var record = new Record(txDao.findCollectionByNameOrId("emisiones_informe"))
    record.set("instancia_id", data.instanciaId)
    record.set("inscripcion_id", data.inscripcionId)
    record.set("huella", hash)
    record.set("version", version)
    record.set("archivo_sha256", archivoSha256)
    record.set("estado", "VIGENTE")
    record.set("instantanea", data)
    record.set("emisor", c.get("authRecord").getId())
    var label = reportFilenameLabel(data.tipoInforme, data.materia)
    record.set("nombre", data.alumno.apellidos + ", " + data.alumno.nombres + " - " + label + ".pdf")
    var form = new RecordUpsertForm($app, record)
    form.setDao(txDao)
    form.addFiles("archivo", upload)
    form.submit()
    created = true
    resultId = record.getId()
  })

  if (failure) {
    return c.json(409, { message: "Los datos o el visado del informe cambiaron durante la generación." })
  }
  return c.json(200, { id: resultId, created: created })
}

function downloadReportEmission(c) {
  noStore(c)
  var record
  var valid = false
  $app.dao().runInTransaction((txDao) => {
    record = requireRecord(txDao, "emisiones_informe", c.pathParam("emisionId"))
    if (record.getString("estado") !== "VIGENTE") return
    var snapshot
    try {
      snapshot = buildReportDocumentSnapshot(
        txDao,
        record.getString("instancia_id"),
        record.getString("inscripcion_id")
      )
    } catch (_) {
      snapshot = { status: 422 }
    }
    if (snapshot.status !== 200 || snapshot.body.huella !== record.getString("huella")) {
      revokeEmissionRecord(txDao, record, "Datos o visado desactualizados.")
      return
    }
    valid = true
  })
  if (!valid) {
    return c.json(409, { message: "Este PDF ya no está vigente. Debe generarse nuevamente." })
  }
  var storage = $app.newFilesystem()
  try {
    return storage.serve(
      c.response(),
      c.request(),
      record.baseFilesPath() + "/" + record.getString("archivo"),
      record.getString("nombre")
    )
  } finally {
    storage.close()
  }
}

module.exports = {
  cutoffTermForReportType: cutoffTermForReportType,
  invalidateReportEmissions: invalidateReportEmissions,
  invalidateStudentReportEmissions: invalidateStudentReportEmissions,
  buildReportDocumentSnapshot: buildReportDocumentSnapshot,
  issue: issue,
  issueLink: issue,
  isPrimaryCourse: isPrimaryCourse,
  rotate: rotate,
  recover: recover,
  revoke: revoke,
  context: context,
  student: student,
  saveStudent: saveStudent,
  submitReport: submitReport,
  staffStages: staffStages,
  staffReview: staffReview,
  synchronizeReviewEnrollments: synchronizeReviewEnrollments,
  updateTeacherName: updateTeacherName,
  staffStudent: staffStudent,
  saveStaffStudent: saveStaffStudent,
  approveStudent: approveStudent,
  revokeStudentApproval: revokeStudentApproval,
  staffSnapshot: staffSnapshot,
  lookupReportEmission: lookupReportEmission,
  publishReportEmission: publishReportEmission,
  downloadReportEmission: downloadReportEmission
}
