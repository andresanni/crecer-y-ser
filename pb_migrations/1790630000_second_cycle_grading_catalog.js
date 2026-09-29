migrate((db) => {
  const dao = new Dao(db)
  const scales = dao.findRecordsByFilter("escalas_calificacion", "nombre = 'primaria 2do ciclo'", "", 2, 0)
  if (scales.length > 1) throw new Error("Se requiere una única escala primaria 2do ciclo antes de promover el catálogo.")
  const scale = scales[0] || new Record(dao.findCollectionByNameOrId("escalas_calificacion"))
  if (!scales.length) {
    scale.set("nombre", "primaria 2do ciclo")
    dao.saveRecord(scale)
  }
  const labels = ["No Alcanzó Los Objetivos 1", "No Alcanzó Los Objetivos 2", "No Alcanzó Los Objetivos 3", "En Proceso 4", "En Proceso 5", "Alcanzado 6", "Alcanzado 7", "Avanzado 8", "Avanzado 9", "Destacado 10"]
  const collection = dao.findCollectionByNameOrId("valores_escala")
  labels.forEach((label, index) => {
    const existing = dao.findRecordsByFilter("valores_escala", "escala_id = {:scale} && etiqueta = {:label}", "", 2, 0, { scale: scale.getId(), label: label })
    if (existing.length > 1) throw new Error("Etiqueta duplicada en segundo ciclo: " + label)
    if (!existing.length) {
      const value = new Record(collection)
      value.set("escala_id", scale.getId())
      value.set("etiqueta", label)
      value.set("peso_numerico", index + 1)
      value.set("orden_visual", index + 1)
      dao.saveRecord(value)
    }
  })
  dao.findRecordsByFilter("cursos", "id != ''", "", 0, 0).forEach((course) => {
    if (/^[4-7]\s*[°º]?$/.test(course.getString("nombre").trim())) {
      course.set("escala_id", scale.getId())
      dao.saveRecord(course)
    }
  })
}, () => {
  throw new Error("El catálogo puede tener notas referenciadas. Revertir mediante corrección explícita o backup compatible.")
})
