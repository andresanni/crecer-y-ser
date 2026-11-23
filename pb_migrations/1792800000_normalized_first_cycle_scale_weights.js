migrate((db) => {
  const dao = new Dao(db)
  const normalize = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/\s+/g, " ")

  const scales = dao.findRecordsByFilter("escalas_calificacion", "id != ''", "", 0, 0)
  const firstCycleScale = scales.find((scale) => normalize(scale.getString("nombre")) === "primaria 1er ciclo")
  if (!firstCycleScale) return

  const targets = {
    "no alcanzo los objetivos": { peso: 1, orden: 1 },
    "en proceso": { peso: 2, orden: 2 },
    "alcanzado": { peso: 3, orden: 3 },
    "avanzado": { peso: 4, orden: 4 },
    "destacado": { peso: 5, orden: 5 },
    "no corresponde": { peso: 0, orden: 6 }
  }

  const values = dao.findRecordsByFilter(
    "valores_escala",
    "escala_id = {:scaleId}",
    "",
    0,
    0,
    { scaleId: firstCycleScale.getId() }
  )

  values.forEach((record) => {
    const key = normalize(record.getString("etiqueta"))
    const target = targets[key]
    if (!target) return
    if (record.getFloat("peso_numerico") === target.peso && record.getInt("orden_visual") === target.orden) return
    record.set("peso_numerico", target.peso)
    record.set("orden_visual", target.orden)
    dao.saveRecord(record)
  })
}, (db) => {
  const dao = new Dao(db)
  const normalize = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/\s+/g, " ")

  const scales = dao.findRecordsByFilter("escalas_calificacion", "id != ''", "", 0, 0)
  const firstCycleScale = scales.find((scale) => normalize(scale.getString("nombre")) === "primaria 1er ciclo")
  if (!firstCycleScale) return

  const previous = {
    "no alcanzo los objetivos": { peso: 1, orden: 1 },
    "no corresponde": { peso: 2, orden: 2 },
    "en proceso": { peso: 3, orden: 3 },
    "alcanzado": { peso: 4, orden: 4 },
    "avanzado": { peso: 5, orden: 5 },
    "destacado": { peso: 6, orden: 6 }
  }

  const values = dao.findRecordsByFilter(
    "valores_escala",
    "escala_id = {:scaleId}",
    "",
    0,
    0,
    { scaleId: firstCycleScale.getId() }
  )

  values.forEach((record) => {
    const key = normalize(record.getString("etiqueta"))
    const target = previous[key]
    if (!target) return
    if (record.getFloat("peso_numerico") === target.peso && record.getInt("orden_visual") === target.orden) return
    record.set("peso_numerico", target.peso)
    record.set("orden_visual", target.orden)
    dao.saveRecord(record)
  })
})
