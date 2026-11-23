migrate((db) => {
  const dao = new Dao(db)
  const plantillasInforme = dao.findCollectionByNameOrId("plantillas_informe")
  const itemsPlantillaInforme = dao.findCollectionByNameOrId("items_plantilla_informe")
  const materiasCollection = dao.findCollectionByNameOrId("materias")

  const gradoDesdeField = plantillasInforme.schema.getFieldByName("grado_desde")
  if (gradoDesdeField) {
    gradoDesdeField.required = false
    gradoDesdeField.options = { min: 0, max: 7, noDecimal: true }
  }
  const gradoHastaField = plantillasInforme.schema.getFieldByName("grado_hasta")
  if (gradoHastaField) {
    gradoHastaField.required = false
    gradoHastaField.options = { min: 0, max: 7, noDecimal: true }
  }
  dao.saveCollection(plantillasInforme)

  const refreshedPlantillas = dao.findCollectionByNameOrId("plantillas_informe")

  const normalizeName = (text) => String(text || "")
    .toLowerCase()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

  const resolveSpecialSubjectId = (canonicalName, matchKeywords) => {
    const existing = dao.findRecordsByFilter("materias", "id != ''", "", 0, 0)
    const found = existing.find((record) => {
      const normalized = normalizeName(record.getString("nombre"))
      return matchKeywords.some((keyword) => normalized.indexOf(normalizeName(keyword)) !== -1)
    })
    if (found) return found.getId()
    const created = new Record(materiasCollection)
    created.set("nombre", canonicalName)
    dao.saveRecord(created)
    return created.getId()
  }

  const educacionFisicaId = resolveSpecialSubjectId(
    "Educación Física",
    ["educacion fisica"]
  )
  const inglesId = resolveSpecialSubjectId(
    "Lenguas Adicionales - Inglés",
    ["ingles", "lenguas adicionales"]
  )
  const musicaId = resolveSpecialSubjectId(
    "Educación Artística - Música",
    ["musica"]
  )

  const escalaTresNiveles = [
    { codigo: "NO_ALCANZADO", etiqueta: "No Alcanzado" },
    { codigo: "EN_PROCESO", etiqueta: "En proceso de Alcanzar" },
    { codigo: "ALCANZADO", etiqueta: "Alcanzado" }
  ]

  const escalaDesempenoInicial = [
    { codigo: "NO_ALCANZO", etiqueta: "No Alcanzó los objetivos" },
    { codigo: "EN_PROCESO", etiqueta: "En proceso" },
    { codigo: "ALCANZADO", etiqueta: "Alcanzado" },
    { codigo: "AVANZADO", etiqueta: "Avanzado" },
    { codigo: "DESTACADO", etiqueta: "Destacado" },
    { codigo: "NO_CORRESPONDE", etiqueta: "No corresponde" }
  ]

  const saveTemplateWithItems = (spec) => {
    const existing = dao.findRecordsByFilter(
      "plantillas_informe",
      "codigo = {:codigo}",
      "",
      1,
      0,
      { codigo: spec.codigo }
    )
    const template = existing[0] || new Record(refreshedPlantillas)
    template.set("codigo", spec.codigo)
    template.set("tipo_informe", spec.tipoInforme)
    template.set("materia_id", spec.materiaId || "")
    template.set("grado_desde", spec.gradoDesde)
    template.set("grado_hasta", spec.gradoHasta)
    template.set("titulo_tabla", spec.tituloTabla)
    template.set("escala_items", spec.escalaItems)
    template.set("mostrar_leyenda_escala", Boolean(spec.mostrarLeyendaEscala))
    template.set("requiere_desempeno_general", Boolean(spec.requiereDesempenoGeneral))
    template.set("escala_desempeno_general", spec.escalaDesempenoGeneral || [])
    template.set("permite_observaciones", Boolean(spec.permiteObservaciones))
    dao.saveRecord(template)

    const existingItems = dao.findRecordsByFilter(
      "items_plantilla_informe",
      "plantilla_id = {:plantillaId}",
      "",
      0,
      0,
      { plantillaId: template.getId() }
    )
    existingItems.forEach((rec) => {
      if (rec.getInt("orden_visual") > spec.items.length) {
        dao.deleteRecord(rec)
      }
    })

    spec.items.forEach((item, index) => {
      const order = index + 1
      const currentItems = dao.findRecordsByFilter(
        "items_plantilla_informe",
        "plantilla_id = {:plantillaId} && orden_visual = {:orden}",
        "",
        1,
        0,
        { plantillaId: template.getId(), orden: order }
      )
      const itemRecord = currentItems[0] || new Record(itemsPlantillaInforme)
      itemRecord.set("plantilla_id", template.getId())
      itemRecord.set("bloque_nombre", item.bloqueNombre || "")
      itemRecord.set("bloque_orden", item.bloqueOrden || 0)
      itemRecord.set("orden_visual", order)
      itemRecord.set("pagina", item.pagina || 1)
      itemRecord.set("texto", item.texto)
      dao.saveRecord(itemRecord)
    })
  }

  saveTemplateWithItems({
    codigo: "FINAL_ED_FISICA_INICIAL",
    tipoInforme: "CICLO_FINAL",
    materiaId: educacionFisicaId,
    gradoDesde: 0,
    gradoHasta: 0,
    tituloTabla: "Contenidos de Educación Física",
    escalaItems: escalaTresNiveles,
    mostrarLeyendaEscala: false,
    requiereDesempenoGeneral: true,
    escalaDesempenoGeneral: escalaDesempenoInicial,
    permiteObservaciones: true,
    items: [
      "Exploración de las posibilidades motrices de su propio cuerpo, en forma global y segmentaria.",
      "Exploración de los diferentes desplazamientos y apoyos.",
      "Exploración de diferentes elementos.",
      "Discriminación y reconocimientos de diferencias y semejanzas con el cuerpo de los otros.",
      "Exploración de los sentidos identificando sensaciones y percepciones.",
      "Vivencias relacionadas con los movimientos de tensión y relajación.",
      "Desarrollo de las habilidades motoras locomotivas y no locomotivas.",
      "Incorporación de habilidades motoras manipulativas.",
      "Coordinación de dos habilidades motoras diferentes.",
      "Aplicación de blancos fijos y móviles.",
      "Orientación del cuerpo con el espacio, desplazamientos.",
      "Coordinación de habilidades motoras sorteando obstáculos.",
      "Ajuste del movimiento propio al espacio, a los objetos y al movimiento de los otros.",
      "Vivencia y regulación de la velocidad.",
      "Transporte de elementos sobre distintas partes del cuerpo.",
      "Desplazamientos sobre líneas rectas y curvas, sobre superficies amplias y reducidas.",
      "Desplazamientos sobre distintas elevaciones y pendientes.",
      "Iniciación a la técnica del rol adelante.",
      "Iniciación a la técnica del rol de atrás.",
      "Aplicación de circuitos combinados con destrezas.",
      "Organización de juegos grupales e individuales.",
      "Aplicación de reglas simples.",
      "Uso de refugios grupales e individuales.",
      "Empleo de habilidades motoras adquiridas durante los juegos"
    ].map((texto) => ({ pagina: 1, texto: texto }))
  })

  saveTemplateWithItems({
    codigo: "FINAL_INGLES_INICIAL",
    tipoInforme: "CICLO_FINAL",
    materiaId: inglesId,
    gradoDesde: 0,
    gradoHasta: 0,
    tituloTabla: "Contenidos de Inglés",
    escalaItems: escalaTresNiveles,
    mostrarLeyendaEscala: false,
    requiereDesempenoGeneral: true,
    escalaDesempenoGeneral: escalaDesempenoInicial,
    permiteObservaciones: true,
    items: [
      "Demuestra interés por el aprendizaje de la lengua extranjera.",
      "Manejo de estructuras sencillas en Inglés.",
      "Comprensión de estructuras sencillas de salutación y cortesía.",
      "Progreso en el desarrollo de la atención y de la observación del idioma durante el transcurso de la clase.",
      "Mantiene buena relación con la docente.",
      "Mantiene buena relación con sus pares.",
      "Atención en clase.",
      "Participación en clase.",
      "Cumple con los materiales para la materia.",
      "Disfruta de escuchar cuentos y canciones.",
      "Su pronunciación es clara.",
      "Escucha la producción de sus pares.",
      "Utiliza el idioma inglés para narrar, describir y/o pedir.",
      "Interpreta mensajes orales.",
      "Interactúa oralmente con compañeros y docentes.",
      "Maneja oralmente estructuras de presentación.",
      "Incorpora nuevo vocabulario.",
      "Comprende consignas de trabajo o narraciones en inglés."
    ].map((texto) => ({ pagina: 1, texto: texto }))
  })

  saveTemplateWithItems({
    codigo: "FINAL_MUSICA_INICIAL",
    tipoInforme: "CICLO_FINAL",
    materiaId: musicaId,
    gradoDesde: 0,
    gradoHasta: 0,
    tituloTabla: "Contenidos de Educación Musical",
    escalaItems: escalaTresNiveles,
    mostrarLeyendaEscala: false,
    requiereDesempenoGeneral: true,
    escalaDesempenoGeneral: escalaDesempenoInicial,
    permiteObservaciones: true,
    items: [
      "Participa activamente de la clase.",
      "Mantiene una buena relación con sus pares.",
      "¿Respeta las pautas dadas?",
      "Canta grupalmente.",
      "Canta en forma individual.",
      "Cuida los instrumentos del jardín.",
      "Toca correctamente los instrumentos musicales.",
      "¿Reconoce mediante la expresión corporal las diferentes cualidades de la música?",
      "Es correcto en la ejecución rítmica.",
      "Disfruta del baile libre.",
      "Le gusta el baile pautado.",
      "Muestra interés por los diferentes estilos musicales.",
      "Tiene una audición activa de acuerdo a su edad.",
      "Realiza acompañamientos rítmicos a canciones",
      "Participa de relatos / cuadros sonoros proponiendo diferentes sonidos",
      "Realiza y se interesa por el registro grabado de sonorizaciones o canciones"
    ].map((texto) => ({ pagina: 1, texto: texto }))
  })
}, (db) => {
  const dao = new Dao(db)
  const codes = [
    "FINAL_ED_FISICA_INICIAL",
    "FINAL_INGLES_INICIAL",
    "FINAL_MUSICA_INICIAL"
  ]

  codes.forEach((code) => {
    const records = dao.findRecordsByFilter("plantillas_informe", "codigo = {:codigo}", "", 1, 0, { codigo: code })
    records.forEach((record) => {
      const workflows = dao.findRecordsByFilter(
        "instancias_informe",
        "plantilla_id = {:plantillaId}",
        "",
        1,
        0,
        { plantillaId: record.getId() }
      )
      if (workflows.length > 0) {
        throw new Error("No se puede revertir la migración: existen informes asociados a la plantilla " + code + ".")
      }
      dao.deleteRecord(record)
    })
  })

  const plantillasInforme = dao.findCollectionByNameOrId("plantillas_informe")
  const gradoDesdeField = plantillasInforme.schema.getFieldByName("grado_desde")
  if (gradoDesdeField) {
    gradoDesdeField.required = true
    gradoDesdeField.options = { min: 1, max: 7, noDecimal: true }
  }
  const gradoHastaField = plantillasInforme.schema.getFieldByName("grado_hasta")
  if (gradoHastaField) {
    gradoHastaField.required = true
    gradoHastaField.options = { min: 1, max: 7, noDecimal: true }
  }
  dao.saveCollection(plantillasInforme)
})
