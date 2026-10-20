routerAdd("POST", "/api/cys/enlaces-informes", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.issue(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("POST", "/api/cys/enlaces-informes/:tokenId/rotar", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.rotate(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("POST", "/api/cys/enlaces-informes/:tokenId/recuperar", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.recover(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("DELETE", "/api/cys/enlaces-informes/:tokenId", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.revoke(c)
}, $apis.requireRecordAuth("users"))

routerAdd("GET", "/api/cys/docente-informes/contexto", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.context(c)
})

routerAdd("GET", "/api/cys/docente-informes/alumnos/:inscripcionId", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.student(c)
})

routerAdd("PUT", "/api/cys/docente-informes/alumnos/:inscripcionId", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.saveStudent(c)
}, $apis.bodyLimit(1048576))

routerAdd("POST", "/api/cys/docente-informes/enviar", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.submitReport(c)
}, $apis.bodyLimit(65536))

routerAdd("GET", "/api/cys/directivo/informes/etapas/:cicloId/:tipoInforme", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.staffStages(c)
}, $apis.requireRecordAuth("users"))

routerAdd("GET", "/api/cys/directivo/informes/revision/:instanciaId", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.staffReview(c)
}, $apis.requireRecordAuth("users"))

routerAdd("POST", "/api/cys/directivo/informes/:instanciaId/sincronizar-matricula", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.synchronizeReviewEnrollments(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("PATCH", "/api/cys/directivo/informes/:instanciaId/docente", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.updateTeacherName(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("GET", "/api/cys/directivo/informes/:instanciaId/alumnos/:inscripcionId", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.staffStudent(c)
}, $apis.requireRecordAuth("users"))

routerAdd("PUT", "/api/cys/directivo/informes/:instanciaId/alumnos/:inscripcionId", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.saveStaffStudent(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(1048576))

routerAdd("POST", "/api/cys/directivo/informes/:instanciaId/alumnos/:inscripcionId/visar", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.approveStudent(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("POST", "/api/cys/directivo/informes/:instanciaId/alumnos/:inscripcionId/retirar-visado", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.revokeStudentApproval(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("GET", "/api/cys/directivo/informes/:instanciaId/alumnos/:inscripcionId/instantanea", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.staffSnapshot(c)
}, $apis.requireRecordAuth("users"))

routerAdd("GET", "/api/cys/directivo/informes/:instanciaId/alumnos/:inscripcionId/emisiones", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.lookupReportEmission(c)
}, $apis.requireRecordAuth("users"))

routerAdd("POST", "/api/cys/directivo/informes/:instanciaId/alumnos/:inscripcionId/emisiones", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.publishReportEmission(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(12582912))

routerAdd("GET", "/api/cys/directivo/emisiones-informe/:emisionId/archivo", (c) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  return reports.downloadReportEmission(c)
}, $apis.requireRecordAuth("users"))

onRecordAfterUpdateRequest((e) => {
  const reports = require(`${__hooks}/lib/teacherReports.js`)
  const dao = $app.dao()
  const enrollments = dao.findRecordsByFilter(
    "inscripciones",
    "alumno_id = {:alumnoId}",
    "",
    0,
    0,
    { alumnoId: e.record.getId() }
  )
  enrollments.forEach((enrollment) => {
    reports.invalidateStudentReportEmissions(dao, enrollment.getId(), "Cambió la ficha del alumno.")
  })
}, "alumnos")
