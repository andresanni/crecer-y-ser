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

routerAdd("POST", "/api/cys/enlaces-docentes", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.issue(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("POST", "/api/cys/enlaces-docentes/:tokenId/rotar", (c) => {
  const access = require(`${__hooks}/lib/teacherAccess.js`)
  return access.rotate(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))
