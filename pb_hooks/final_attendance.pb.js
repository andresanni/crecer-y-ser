routerAdd("GET", "/api/cys/directivo/asistencias-b4/etapas/:periodoId", (c) => {
  return require(`${__hooks}/lib/finalAttendance.js`).staffStages(c)
}, $apis.requireRecordAuth("users"))

routerAdd("POST", "/api/cys/directivo/asistencias-b4/enlaces", (c) => {
  return require(`${__hooks}/lib/finalAttendance.js`).issueLink(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("POST", "/api/cys/directivo/asistencias-b4/enlaces/:tokenId/rotar", (c) => {
  return require(`${__hooks}/lib/finalAttendance.js`).rotateLink(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("POST", "/api/cys/directivo/asistencias-b4/enlaces/:tokenId/recuperar", (c) => {
  return require(`${__hooks}/lib/finalAttendance.js`).recoverLink(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("GET", "/api/cys/directivo/asistencias-b4/curso/:cursoId/:periodoId", (c) => {
  return require(`${__hooks}/lib/finalAttendance.js`).staffCourse(c)
}, $apis.requireRecordAuth("users"))

routerAdd("PUT", "/api/cys/directivo/asistencias-b4/curso/:cursoId/:periodoId", (c) => {
  return require(`${__hooks}/lib/finalAttendance.js`).staffSaveCourse(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(262144))

routerAdd("GET", "/api/cys/docente/asistencias-b4/contexto", (c) => {
  return require(`${__hooks}/lib/finalAttendance.js`).teacherContext(c)
})

routerAdd("PUT", "/api/cys/docente/asistencias-b4/guardar", (c) => {
  return require(`${__hooks}/lib/finalAttendance.js`).teacherSave(c)
}, $apis.bodyLimit(262144))

routerAdd("POST", "/api/cys/docente/asistencias-b4/enviar", (c) => {
  return require(`${__hooks}/lib/finalAttendance.js`).teacherSubmit(c)
}, $apis.bodyLimit(65536))
