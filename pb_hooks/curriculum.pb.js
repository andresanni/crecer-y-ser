routerAdd("GET", "/api/cys/directivo/configuracion/estado/:cursoId/:cicloId", (c) => {
  const curriculum = require(`${__hooks}/lib/curriculum.js`)
  return curriculum.configurationStatus(c)
}, $apis.requireRecordAuth("users"))

routerAdd("POST", "/api/cys/directivo/configuracion/materias", (c) => {
  const curriculum = require(`${__hooks}/lib/curriculum.js`)
  return curriculum.assignMaterial(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("DELETE", "/api/cys/directivo/configuracion/materias/:cursoMateriaId", (c) => {
  const curriculum = require(`${__hooks}/lib/curriculum.js`)
  return curriculum.removeMaterial(c)
}, $apis.requireRecordAuth("users"))

routerAdd("PUT", "/api/cys/directivo/configuracion/materias/orden", (c) => {
  const curriculum = require(`${__hooks}/lib/curriculum.js`)
  return curriculum.reorderMaterials(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))

routerAdd("PUT", "/api/cys/directivo/configuracion/materias/:cursoMateriaId/criterios", (c) => {
  const curriculum = require(`${__hooks}/lib/curriculum.js`)
  return curriculum.saveCriteria(c)
}, $apis.requireRecordAuth("users"), $apis.bodyLimit(65536))
