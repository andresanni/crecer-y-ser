function records(dao, name, filter, params, sort) {
  return dao.findRecordsByFilter(name, filter, sort || "id", 0, 0, params)
}

function record(dao, name, id) {
  if (!/^[a-z0-9]{15}$/.test(id)) throw new BadRequestError("Referencia inválida.")
  try { return dao.findRecordById(name, id) }
  catch (_) { throw new NotFoundError("Referencia inexistente.") }
}

function dto(item) {
  return JSON.parse(JSON.stringify(item.publicExport()))
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === "object") return Object.keys(value).sort().map(key => [key, canonical(value[key])])
  return value
}

function context(dao, courseId, cycleId, month) {
  if (!Number.isInteger(month) || month < 3 || month > 12) throw new BadRequestError("Mes lectivo inválido.")
  const cycle = record(dao, "ciclos_lectivos", cycleId)
  const course = record(dao, "cursos", courseId)
  const level = record(dao, "niveles", course.getString("nivel_id"))
  if (!/primar/i.test(level.getString("nombre"))) throw new BadRequestError("El curso debe pertenecer a primaria.")
  const months = records(dao, "meses_calendario", "ciclo_id = {:cycle} && mes = {:month}", { cycle: cycleId, month: month })
  if (!months.length) throw new NotFoundError("El mes todavía no está configurado.")
  const calendar = months[0]
  if (calendar.getInt("ano") !== cycle.getInt("ano")) throw new BadRequestError("El año del calendario no corresponde al ciclo.")
  const events = records(dao, "eventos_calendario", "mes_calendario_id = {:calendar}", { calendar: calendar.getId() }, "dia,id")
  const enrollments = records(dao, "inscripciones", "curso_id = {:course} && ciclo_id = {:cycle}", { course: courseId, cycle: cycleId }, "numero_orden,id")
  const pupils = enrollments.map(item => record(dao, "alumnos", item.getString("alumno_id")))
  const registrations = records(dao, "registros_asistencia_curso", "curso_id = {:course} && mes_calendario_id = {:calendar}", { course: courseId, calendar: calendar.getId() })
  const registration = registrations[0]
  const first = String(calendar.getInt("ano")) + "-" + String(month).padStart(2, "0") + "-01"
  const days = new Date(Date.UTC(calendar.getInt("ano"), month, 0)).getUTCDate()
  const last = first.slice(0, 8) + String(days).padStart(2, "0")
  const daily = []
  enrollments.forEach(item => {
    records(dao, "asistencias_diarias", "inscripcion_id = {:enrollment} && fecha >= {:first} && fecha <= {:last}", {
      enrollment: item.getId(), first: first + " 00:00:00", last: last + " 23:59:59"
    }, "fecha,id").forEach(value => daily.push(value))
  })
  const sources = [calendar, ...events, ...enrollments, ...pupils, course, level, cycle].map(dto)
  return { calendar, events, enrollments, pupils, registration, daily, first, last,
    version: $security.sha256(JSON.stringify(canonical(sources))), revision: registration ? registration.getInt("revision") : 0,
    course, level }
}

function snapshot(data) {
  return {
    revision: data.revision, versionFuentes: data.version,
    mes: dto(data.calendar), eventos: data.events.map(dto),
    curso: Object.assign(dto(data.course), { expand: { nivel_id: dto(data.level) } }),
    inscripciones: data.enrollments.map((item, index) => Object.assign(dto(item), { expand: { alumno_id: dto(data.pupils[index]) } })),
    novedades: data.daily.map(dto), registroCurso: data.registration ? dto(data.registration) : null
  }
}

function readRegister(c) {
  let result
  $app.dao().runInTransaction(dao => {
    result = snapshot(context(dao, c.pathParam("cursoId"), c.pathParam("cicloId"), Number(c.pathParam("mes"))))
  })
  c.response().header().set("Cache-Control", "no-store")
  return c.json(200, result)
}

function saveRegister(c) {
  const body = new DynamicModel({ expectedRevision: -1, expectedVersionFuentes: "", cambios: [], observaciones: "" })
  c.bind(body)
  const payload = JSON.parse(JSON.stringify(body))
  if (!Number.isInteger(payload.expectedRevision) || payload.expectedRevision < 0 || typeof payload.observaciones !== "string" || payload.observaciones.length > 1000 || !Array.isArray(payload.cambios) || payload.cambios.length > 744) {
    throw new BadRequestError("Datos de asistencia inválidos.")
  }
  let result
  $app.dao().runInTransaction(dao => {
    const data = context(dao, c.pathParam("cursoId"), c.pathParam("cicloId"), Number(c.pathParam("mes")))
    if (payload.expectedRevision !== data.revision || payload.expectedVersionFuentes !== data.version) throw new ApiError(409, "El registro, calendario o la nómina cambió. Volvé a cargar antes de guardar.")
    const seen = {}
    payload.cambios.forEach(change => {
      const enrollment = data.enrollments.find(item => item.getId() === change.inscripcionId)
      if (!enrollment || enrollment.getString("cursada_estado") === "SIN_CURSADA") throw new BadRequestError("La inscripción no pertenece a la nómina del registro.")
      if (typeof change.fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(change.fecha) || change.fecha < data.first || change.fecha > data.last) throw new BadRequestError("Fecha fuera del mes.")
      const day = Number(change.fecha.slice(8))
      const weekday = new Date(change.fecha + "T12:00:00Z").getUTCDay()
      if (weekday === 0 || weekday === 6 || data.events.some(item => item.getInt("dia") === day)) throw new BadRequestError("El día no tiene clase.")
      const entry = enrollment.getString("fecha_ingreso").slice(0, 10)
      const exit = enrollment.getString("fecha_egreso").slice(0, 10)
      if ((entry && change.fecha < entry) || (enrollment.getString("estado") === "Baja" && exit && change.fecha > exit)) throw new BadRequestError("El día está fuera de la cursada.")
      if (![null, "P", "A", "J", "E", "IT", "RA"].includes(change.estado)) throw new BadRequestError("Estado de asistencia inválido.")
      const key = change.inscripcionId + "_" + change.fecha
      if (seen[key]) throw new BadRequestError("La solicitud contiene un día repetido.")
      seen[key] = true
      const existing = data.daily.find(item => item.getString("inscripcion_id") === change.inscripcionId && item.getString("fecha").slice(0, 10) === change.fecha)
      if (change.estado === null || change.estado === "P") {
        if (existing) dao.deleteRecord(existing)
      } else {
        const daily = existing || new Record(dao.findCollectionByNameOrId("asistencias_diarias"))
        daily.set("inscripcion_id", change.inscripcionId)
        daily.set("fecha", change.fecha + " 00:00:00")
        daily.set("estado", change.estado)
        dao.saveRecord(daily)
      }
    })
    const registration = data.registration || new Record(dao.findCollectionByNameOrId("registros_asistencia_curso"))
    registration.set("curso_id", data.course.getId())
    registration.set("mes_calendario_id", data.calendar.getId())
    registration.set("observaciones_adicionales", payload.observaciones)
    registration.set("revision", data.revision + 1)
    dao.saveRecord(registration)
    result = snapshot(context(dao, c.pathParam("cursoId"), c.pathParam("cicloId"), Number(c.pathParam("mes"))))
  })
  c.response().header().set("Cache-Control", "no-store")
  return c.json(200, result)
}



function calendarContext(dao, cycleId, month) {
  if (!Number.isInteger(month) || month < 3 || month > 12) throw new BadRequestError("Mes lectivo inválido.")
  const cycle = record(dao, "ciclos_lectivos", cycleId)
  const months = records(dao, "meses_calendario", "ciclo_id = {:cycle}", { cycle: cycleId }, "mes,id")
  const events = []
  months.forEach(item => records(dao, "eventos_calendario", "mes_calendario_id = {:calendar}", { calendar: item.getId() }, "dia,id").forEach(event => events.push(event)))
  return { cycle, months, events, month, revision: cycle.getInt("revision_calendario"),
    version: $security.sha256(JSON.stringify(canonical([dto(cycle), months.map(dto), events.map(dto)]))) }
}

function calendarSnapshot(data) {
  const selected = data.months.find(item => item.getInt("mes") === data.month)
  return { revision: data.revision, versionFuentes: data.version, ano: data.cycle.getInt("ano"),
    mes: selected ? dto(selected) : null, meses: data.months.map(dto),
    eventos: selected ? data.events.filter(item => item.getString("mes_calendario_id") === selected.getId()).map(dto) : [] }
}

function readCalendar(c) {
  let result
  $app.dao().runInTransaction(dao => { result = calendarSnapshot(calendarContext(dao, c.pathParam("cicloId"), Number(c.pathParam("mes")))) })
  c.response().header().set("Cache-Control", "no-store")
  return c.json(200, result)
}

function workingDays(year, month, events) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  let count = 0
  for (let day = 1; day <= days; day++) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    if (weekday !== 0 && weekday !== 6 && !events.includes(day)) count++
  }
  return count
}

function saveCalendar(c) {
  const body = new DynamicModel({ expectedRevision: -1, expectedVersionFuentes: "", eventos: [] })
  c.bind(body)
  const payload = JSON.parse(JSON.stringify(body))
  if (!Number.isInteger(payload.expectedRevision) || payload.expectedRevision < 0 || !Array.isArray(payload.eventos) || payload.eventos.length > 31) throw new BadRequestError("Configuración de calendario inválida.")
  let result
  $app.dao().runInTransaction(dao => {
    const data = calendarContext(dao, c.pathParam("cicloId"), Number(c.pathParam("mes")))
    if (payload.expectedRevision !== data.revision || payload.expectedVersionFuentes !== data.version) throw new ApiError(409, "El calendario cambió. Volvé a cargar la configuración.")
    const year = data.cycle.getInt("ano")
    const days = new Date(Date.UTC(year, data.month, 0)).getUTCDate()
    const seen = {}
    payload.eventos.forEach(event => {
      if (!Number.isInteger(event.dia) || event.dia < 1 || event.dia > days || seen[event.dia]) throw new BadRequestError("Día inexistente o repetido.")
      if (!["FERIADO", "JORNADA_EMI", "RECESO", "ASUETO"].includes(event.tipo)) throw new BadRequestError("Tipo de evento inválido.")
      if (typeof event.textoCeldaVertical !== "string" || event.textoCeldaVertical.length > 200 || typeof event.descripcionObservaciones !== "string" || event.descripcionObservaciones.length > 500) throw new BadRequestError("Texto de evento inválido.")
      seen[event.dia] = true
    })
    const selected = data.months.find(item => item.getInt("mes") === data.month) || new Record(dao.findCollectionByNameOrId("meses_calendario"))
    selected.set("ciclo_id", data.cycle.getId())
    selected.set("mes", data.month)
    selected.set("ano", year)
    selected.set("periodo_boletin_id", "")
    selected.set("total_dias_habiles", workingDays(year, data.month, payload.eventos.map(event => event.dia)))
    dao.saveRecord(selected)
    const existing = data.events.filter(item => item.getString("mes_calendario_id") === selected.getId())
    existing.filter(item => !seen[item.getInt("dia")]).forEach(item => dao.deleteRecord(item))
    payload.eventos.forEach(event => {
      const value = existing.find(item => item.getInt("dia") === event.dia) || new Record(dao.findCollectionByNameOrId("eventos_calendario"))
      value.set("mes_calendario_id", selected.getId())
      value.set("dia", event.dia)
      value.set("fecha", year + "-" + String(data.month).padStart(2, "0") + "-" + String(event.dia).padStart(2, "0") + " 00:00:00")
      value.set("tipo", event.tipo)
      value.set("texto_celda_vertical", event.textoCeldaVertical)
      value.set("descripcion_observaciones", event.descripcionObservaciones)
      dao.saveRecord(value)
    })
    let accumulated = 0
    records(dao, "meses_calendario", "ciclo_id = {:cycle} && mes >= 3", { cycle: data.cycle.getId() }, "mes,id").forEach(item => {
      const holidays = records(dao, "eventos_calendario", "mes_calendario_id = {:calendar}", { calendar: item.getId() }).map(event => event.getInt("dia"))
      const count = workingDays(year, item.getInt("mes"), holidays)
      accumulated += count
      if (item.getInt("total_dias_habiles") !== count || item.getInt("dias_habiles_acumulados") !== accumulated) {
        item.set("total_dias_habiles", count)
        item.set("dias_habiles_acumulados", accumulated)
        dao.saveRecord(item)
      }
    })
    data.cycle.set("revision_calendario", data.revision + 1)
    dao.saveRecord(data.cycle)
    result = calendarSnapshot(calendarContext(dao, data.cycle.getId(), data.month))
  })
  c.response().header().set("Cache-Control", "no-store")
  return c.json(200, result)
}

module.exports = { readRegister, saveRegister, readCalendar, saveCalendar }
