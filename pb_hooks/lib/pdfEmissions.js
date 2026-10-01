function invalidate(dao, enrollmentId, cutoff, reason) {
  var records = dao.findRecordsByFilter("emisiones_boletin", "inscripcion_id = {:id} && corte >= {:cutoff} && estado = 'DISPONIBLE'", "", 0, 0, { id: enrollmentId, cutoff: cutoff })
  records.forEach((record) => revoke(dao, record, reason))
}

function revoke(dao, record, reason) {
  record.set("estado", "INVALIDADO")
  record.set("instantanea", null)
  record.set("motivo", reason)
  dao.saveRecord(record)
}

function currentSnapshot(dao, enrollmentId, periodId) {
  return require("./teacherAccess.js").buildDocumentSnapshot(dao, enrollmentId, periodId)
}

function noStore(c) {
  c.response().header().set("Cache-Control", "no-store")
  c.response().header().set("X-Content-Type-Options", "nosniff")
}

function publish(c) {
  noStore(c)
  var key = $os.getenv("CYS_PDF_WORKER_KEY")
  if (!key || !$security.equal(key, c.request().header.get("X-CYS-PDF-Worker"))) throw new ForbiddenError("Generador no autorizado.")
  var version = c.formValue("version")
  var hash = c.formValue("huella")
  if (!/^[a-f0-9]{64}$/.test(version) || !/^[a-f0-9]{64}$/.test(hash) || !/^[a-f0-9]{64}$/.test(c.formValue("archivoSha256"))) throw new BadRequestError("Versión no válida.")
  var upload = $filesystem.fileFromMultipart(c.formFile("archivo"))
  var result
  var created = false
  var failure = false
  $app.dao().runInTransaction((dao) => {
    var snapshot = currentSnapshot(dao, c.pathParam("inscripcionId"), c.formValue("periodoId"))
    if (snapshot.status !== 200 || snapshot.body.huella !== hash) { failure = true; return }
    var data = snapshot.body.datos
    var existing = dao.findRecordsByFilter("emisiones_boletin", "inscripcion_id = {:id} && periodo_id = {:period} && estado = 'DISPONIBLE' && huella = {:hash} && version = {:version}", "", 1, 0, { id: data.inscripcionId, period: c.formValue("periodoId"), hash: hash, version: version })
    if (existing.length) { result = existing[0].getId(); return }
    var previous = dao.findRecordsByFilter("emisiones_boletin", "inscripcion_id = {:id} && periodo_id = {:period} && estado = 'DISPONIBLE'", "", 0, 0, { id: data.inscripcionId, period: c.formValue("periodoId") })
    previous.forEach(record => revoke(dao, record, "Reemplazado por una nueva emisión."))
    var record = new Record(dao.findCollectionByNameOrId("emisiones_boletin"))
    record.set("inscripcion_id", data.inscripcionId)
    record.set("periodo_id", c.formValue("periodoId"))
    record.set("corte", data.bimestreCorte)
    record.set("huella", hash)
    record.set("version", version)
    record.set("archivo_sha256", c.formValue("archivoSha256"))
    record.set("estado", "DISPONIBLE")
    record.set("instantanea", data)
    record.set("dependencias", data.dependencias)
    record.set("emisor", c.get("authRecord").getId())
    record.set("nombre", data.alumno.apellidos + ", " + data.alumno.nombres + " - BOLETIN " + data.bimestreCorte + " BIMESTRE.pdf")
    var form = new RecordUpsertForm($app, record)
    form.setDao(dao)
    form.addFiles("archivo", upload)
    form.submit()
    created = true
    result = record.getId()
  })
  return failure ? c.json(409, { message: "Los datos o visados cambiaron durante la generación." }) : c.json(200, { id: result, created: created })
}

function download(c) {
  noStore(c)
  var record
  var valid = false
  $app.dao().runInTransaction((dao) => {
    record = dao.findRecordById("emisiones_boletin", c.pathParam("emisionId"))
    if (record.getString("estado") !== "DISPONIBLE") return
    var snapshot
    try { snapshot = currentSnapshot(dao, record.getString("inscripcion_id"), record.getString("periodo_id")) } catch (_) { snapshot = { status: 422 } }
    if (snapshot.status !== 200 || snapshot.body.huella !== record.getString("huella")) { revoke(dao, record, "Datos o visados desactualizados."); return }
    valid = true
  })
  if (!valid) return c.json(409, { message: "Este PDF ya no está vigente. Debe generarse nuevamente." })
  var storage = $app.newFilesystem()
  try { return storage.serve(c.response(), c.request(), record.baseFilesPath() + "/" + record.getString("archivo"), record.getString("nombre")) } finally { storage.close() }
}

function cleanup() {
  var dao = $app.dao()
  dao.findRecordsByFilter("emisiones_boletin", "estado = 'INVALIDADO' && archivo != ''", "", 100, 0).forEach((record) => {
    try {
      var form = new RecordUpsertForm($app, record)
      form.removeFiles("archivo")
      form.submit()
    } catch (_) { console.log("PDF invalidado pendiente de borrado: " + record.getId()) }
  })
}

function lookup(c) {
  noStore(c)
  var result = null
  $app.dao().runInTransaction((dao) => {
    var snapshot = currentSnapshot(dao, c.pathParam("inscripcionId"), c.queryParam("periodoId"))
    if (snapshot.status !== 200) return
    var records = dao.findRecordsByFilter("emisiones_boletin", "inscripcion_id = {:id} && periodo_id = {:period} && estado = 'DISPONIBLE'", "-created", 0, 0, { id: c.pathParam("inscripcionId"), period: c.queryParam("periodoId") })
    records.forEach(record => {
      if (record.getString("huella") !== snapshot.body.huella) revoke(dao, record, "Datos desactualizados.")
      else if (record.getString("version") === c.queryParam("version")) result = { id: record.getId(), huella: record.getString("huella") }
    })
  })
  return c.json(200, { emision: result })
}

module.exports = { invalidate: invalidate, publish: publish, download: download, cleanup: cleanup, lookup: lookup }
