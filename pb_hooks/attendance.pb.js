routerAdd("GET", "/api/cys/directivo/asistencias/:cursoId/:cicloId/:mes", (c) => {
  return require(`${__hooks}/lib/attendance.js`).readRegister(c)
}, $apis.requireRecordAuth("users"))

routerAdd("PUT", "/api/cys/directivo/asistencias/:cursoId/:cicloId/:mes", (c) => {
  return require(`${__hooks}/lib/attendance.js`).saveRegister(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(131072))

routerAdd("GET", "/api/cys/directivo/calendario/:cicloId/:mes", (c) => {
  return require(`${__hooks}/lib/attendance.js`).readCalendar(c)
}, $apis.requireRecordAuth("users"))

routerAdd("PUT", "/api/cys/directivo/calendario/:cicloId/:mes", (c) => {
  return require(`${__hooks}/lib/attendance.js`).saveCalendar(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))
