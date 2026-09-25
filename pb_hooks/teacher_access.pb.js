routerAdd("GET", "/api/cys/docente/contexto", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.context(c)
})

routerAdd("GET", "/api/cys/docente/alumnos/:inscripcionId", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.student(c)
})

routerAdd("PUT", "/api/cys/docente/alumnos/:inscripcionId", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.saveStudent(c)
}, $apis.bodyLimit(1048576))

routerAdd("POST", "/api/cys/docente/enviar", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.submitPeriod(c)
}, $apis.bodyLimit(65536))

routerAdd("GET", "/api/cys/directivo/instancias/:cursoId/:periodoId", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.staffWorkflow(c)
}, $apis.requireRecordAuth("users"))

routerAdd("GET", "/api/cys/directivo/alumnos/:inscripcionId", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.staffStudent(c)
}, $apis.requireRecordAuth("users"))

routerAdd("PUT", "/api/cys/directivo/alumnos/:inscripcionId", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.saveStaffStudent(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(1048576))

routerAdd("POST", "/api/cys/enlaces-docentes", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.issue(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("POST", "/api/cys/enlaces-docentes/:tokenId/rotar", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.rotate(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("POST", "/api/cys/enlaces-docentes/:tokenId/recuperar", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.recover(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))
