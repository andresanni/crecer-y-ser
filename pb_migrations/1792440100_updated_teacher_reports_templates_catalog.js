migrate((db) => {
  const dao = new Dao(db)
  const plantillasInforme = dao.findCollectionByNameOrId("plantillas_informe")
  const itemsPlantillaInforme = dao.findCollectionByNameOrId("items_plantilla_informe")
  const materiasCollection = dao.findCollectionByNameOrId("materias")

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

  const artesVisualesId = resolveSpecialSubjectId(
    "Educación Artística - Artes visuales",
    ["artes visuales"]
  )
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
  const tecnologiaId = resolveSpecialSubjectId(
    "Tecnología, Diseño y Programación",
    ["tecnologia"]
  )

  const escalaTresNiveles = [
    { codigo: "NO_ALCANZADO", etiqueta: "No Alcanzado" },
    { codigo: "EN_PROCESO", etiqueta: "En proceso de Alcanzar" },
    { codigo: "ALCANZADO", etiqueta: "Alcanzado" }
  ]

  const escalaEducacionFisica = [
    { codigo: "A", etiqueta: "A", descripcion: "No se trabajó el contenido durante el año" },
    { codigo: "B", etiqueta: "B", descripcion: "Aun le esta costando trabajo el contenido durante este año" },
    { codigo: "C", etiqueta: "C", descripcion: "Se ven claros avances en la adquisición del contenido propuesto" },
    { codigo: "D", etiqueta: "D", descripcion: "Lo logra con soltura y seguridad" }
  ]

  const escalaDesempenoPrimerCiclo = [
    { codigo: "NO_ALCANZO", etiqueta: "No Alcanzó los objetivos" },
    { codigo: "EN_PROCESO", etiqueta: "En proceso" },
    { codigo: "ALCANZADO", etiqueta: "Alcanzado" },
    { codigo: "AVANZADO", etiqueta: "Avanzado" },
    { codigo: "DESTACADO", etiqueta: "Destacado" },
    { codigo: "NO_CORRESPONDE", etiqueta: "No corresponde" }
  ]

  const escalaDesempenoSegundoCiclo = [
    { codigo: "NO_ALCANZO_1", etiqueta: "No Alcanzó Los Objetivos 1" },
    { codigo: "NO_ALCANZO_2", etiqueta: "No Alcanzó Los Objetivos 2" },
    { codigo: "NO_ALCANZO_3", etiqueta: "No Alcanzó Los Objetivos 3" },
    { codigo: "EN_PROCESO_4", etiqueta: "En Proceso 4" },
    { codigo: "EN_PROCESO_5", etiqueta: "En Proceso 5" },
    { codigo: "ALCANZADO_6", etiqueta: "Alcanzado 6" },
    { codigo: "ALCANZADO_7", etiqueta: "Alcanzado 7" },
    { codigo: "AVANZADO_8", etiqueta: "Avanzado 8" },
    { codigo: "AVANZADO_9", etiqueta: "Avanzado 9" },
    { codigo: "DESTACADO_10", etiqueta: "Destacado 10" },
    { codigo: "NO_CORRESPONDE", etiqueta: "No Corresponde" }
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
    const template = existing[0] || new Record(plantillasInforme)
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
    codigo: "FINAL_ARTES_VISUALES_G2",
    tipoInforme: "CICLO_FINAL",
    materiaId: artesVisualesId,
    gradoDesde: 1,
    gradoHasta: 7,
    tituloTabla: "Contenidos de Artes Visuales",
    escalaItems: escalaTresNiveles,
    mostrarLeyendaEscala: false,
    requiereDesempenoGeneral: true,
    escalaDesempenoGeneral: escalaDesempenoPrimerCiclo,
    permiteObservaciones: true,
    items: [
      "Relación con la materia.",
      "Relación con el docente.",
      "Relación con los compañeros.",
      "Respeto por las normas de convivencia.",
      "Atención en clase.",
      "Aplicación de contenidos.",
      "Respuesta a pedido de materiales de trabajo.",
      "Respuesta a consignas de trabajo.",
      "Participación en clase.",
      "Incorporación de técnicas nuevas.",
      "Percepción morfológica.",
      "Criterio compositivo.",
      "Estructuración de figura humana.",
      "Investigación en el uso de materiales gráficos.",
      "Investigación en el uso de materiales pictóricos.",
      "Criterio cromático.",
      "Utilización de elementos del lenguaje visual en la bidimensión.",
      "Utilización de elementos del lenguaje visual en la tridimensión."
    ].map((texto) => ({ pagina: 1, texto: texto }))
  })

  saveTemplateWithItems({
    codigo: "FINAL_ED_FISICA_G2",
    tipoInforme: "CICLO_FINAL",
    materiaId: educacionFisicaId,
    gradoDesde: 1,
    gradoHasta: 3,
    tituloTabla: "Logros del Area Educacion Fisica",
    escalaItems: escalaEducacionFisica,
    mostrarLeyendaEscala: true,
    requiereDesempenoGeneral: true,
    escalaDesempenoGeneral: escalaDesempenoPrimerCiclo,
    permiteObservaciones: true,
    items: [
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Desplazamientos en el espacio, combinando diferentes tiempos y ritmos." },
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Ajustados a las acciones de los compañeros." },
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Enlazando diferentes formas y direcciones del desplazamiento." },
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Ajustado a los espacios de juego, el objeto y los compañeros." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rolidos laterales en plano horizontal." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol adelante desde cuclillas." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol adelante desde pies firmes." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol adelante con variantes de salida." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol atrás con ayuda." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol atrás sin asistencia." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Cuadripeia" },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Tripedia" },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Conejito" },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Potrillito" },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Vertical con ayuda" },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Vertical sin ayuda" },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Media Luna" },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos bipodales" },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos unipodales" },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos en busca de longitud" },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos en busca de altura" },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Variabilidad de saltos gimnásticos" },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos ajustados a un objeto fijo" },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Con impulso de un elemento externo" }
    ]
  })

  saveTemplateWithItems({
    codigo: "FINAL_ED_FISICA_G4_5",
    tipoInforme: "CICLO_FINAL",
    materiaId: educacionFisicaId,
    gradoDesde: 4,
    gradoHasta: 5,
    tituloTabla: "Logros del Area Educacion Fisica",
    escalaItems: escalaEducacionFisica,
    mostrarLeyendaEscala: true,
    requiereDesempenoGeneral: true,
    escalaDesempenoGeneral: escalaDesempenoSegundoCiclo,
    permiteObservaciones: true,
    items: [
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Desplazamientos ajustados a un objeto móvil." },
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Desplazamientos ajustados al objeto móvil y la acción del compañero." },
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Desplazamientos ajustados a los tiempos musicales." },
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Desplazamientos con manipulación de objetos." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rolidos laterales." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol adelante con variantes de salida." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol desde diferentes entradas." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol atrás en plano horizontal." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol atrás con impulso de brazos." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Tripedias" },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Potrillito." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Vertical con ayuda." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Vertical sin ayuda." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Media luna." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Media luna con carrera previa." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos unipodales y bipodales." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos enlazados en cadena motora." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos ajustados a un objeto móvil." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Variabilidad de saltos gimnásticos." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos con tabla de pique o minitramp." }
    ]
  })

  saveTemplateWithItems({
    codigo: "FINAL_ED_FISICA_G6_7",
    tipoInforme: "CICLO_FINAL",
    materiaId: educacionFisicaId,
    gradoDesde: 6,
    gradoHasta: 7,
    tituloTabla: "Logros del Area Educacion Fisica",
    escalaItems: escalaEducacionFisica,
    mostrarLeyendaEscala: true,
    requiereDesempenoGeneral: true,
    escalaDesempenoGeneral: escalaDesempenoSegundoCiclo,
    permiteObservaciones: true,
    items: [
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Desplazamientos con cambios de ritmo y dirección." },
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Desplazamientos ajustados a la acción del compañero, el objeto y el espacio." },
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Desplazamientos con manipulación de objetos." },
      { pagina: 1, bloqueNombre: "Desplazamientos", bloqueOrden: 1, texto: "Desplazamientos ajustados a la acción del compañero y los tiempos musicales." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol adelante." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol con variantes de entrada y salida." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol volado." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol atrás sin ayuda." },
      { pagina: 1, bloqueNombre: "Rolidos", bloqueOrden: 2, texto: "Rol atrás con impulso de brazos." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Potrillito." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Vertical." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Medialuna." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Medialuna con carrera previa." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Rondo." },
      { pagina: 2, bloqueNombre: "Apoyos", bloqueOrden: 3, texto: "Mortero." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Cadenas motoras de saltos enlazados." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Variabilidad de saltos gimnásticos." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos en longitud." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos ajustados a un objeto móvil." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos con impulso de un elemento." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Variabilidad de saltos con tabla de pique o minitramp." },
      { pagina: 2, bloqueNombre: "Saltos", bloqueOrden: 4, texto: "Saltos utilizando el cajón." }
    ]
  })

  saveTemplateWithItems({
    codigo: "FINAL_INGLES_BASE",
    tipoInforme: "CICLO_FINAL",
    materiaId: inglesId,
    gradoDesde: 1,
    gradoHasta: 7,
    tituloTabla: "Contenidos de Inglés",
    escalaItems: escalaTresNiveles,
    mostrarLeyendaEscala: false,
    requiereDesempenoGeneral: true,
    escalaDesempenoGeneral: escalaDesempenoPrimerCiclo,
    permiteObservaciones: true,
    items: [
      "Demuestra interés por el aprendizaje de la lengua extranjera",
      "Manejo de estructuras sencillas en Inglés.",
      "Comprensión de estructuras sencillas de salutación y cortesía.",
      "Progreso en el desarrollo de la atención y de la observación del idioma durante el transcurso de la clase.",
      "Mantiene buena relación con la docente.",
      "Mantiene buena relación con sus pares.",
      "Atención en clase.",
      "Participación en clase.",
      "Cumple con los materiales para la materia.",
      "Se expresa oralmente en inglés con coherencia.",
      "Su pronunciación es clara.",
      "Respeta los turnos del habla de sus pares y escucha a los mismos",
      "Utiliza el idioma inglés para narrar, describir y/o pedir.",
      "Interpreta mensajes orales.",
      "Adecua sus respuestas orales y escritas al contexto.",
      "Progresa en escritura.",
      "Incorpora nuevo vocabulario.",
      "Comprende consignas de trabajo o narraciones en inglés."
    ].map((texto) => ({ pagina: 1, texto: texto }))
  })

  saveTemplateWithItems({
    codigo: "FINAL_MUSICA_BASE",
    tipoInforme: "CICLO_FINAL",
    materiaId: musicaId,
    gradoDesde: 1,
    gradoHasta: 7,
    tituloTabla: "Contenidos de Educación Musical",
    escalaItems: escalaTresNiveles,
    mostrarLeyendaEscala: false,
    requiereDesempenoGeneral: true,
    escalaDesempenoGeneral: escalaDesempenoPrimerCiclo,
    permiteObservaciones: true,
    items: [
      "Demuestra interés por el aprendizaje de la materia.",
      "Mantiene buena relación con la docente",
      "Mantiene buena relación con sus pares",
      "Atención en clase",
      "Participa activamente de la clase",
      "Cumple con los materiales",
      "Entona el canto",
      "Identifica los instrumentos musicales según su familia",
      "Es correcto en la ejecución rítmica",
      "Es correcto en la ejecución melódica",
      "Lee grafías pertenecientes al lenguaje musical",
      "Cuida los instrumentos musicales",
      "Ejecuta correctamente los instrumentos musicales",
      "Realiza interpretaciones a dos o más voces",
      "Se interesa por la vida y la música de diferentes compositores",
      "Muestra interés por distintos estilos musicales",
      "Tiene una audición activa de acuerdo a su edad",
      "Distingue y/o ejecuta diferentes parámetros de sonido",
      "Realiza y se interesa por el registro grabado de las producciones musicales"
    ].map((texto) => ({ pagina: 1, texto: texto }))
  })

  saveTemplateWithItems({
    codigo: "FINAL_TECNOLOGIA_BASE",
    tipoInforme: "CICLO_FINAL",
    materiaId: tecnologiaId,
    gradoDesde: 1,
    gradoHasta: 7,
    tituloTabla: "Contenidos de Tecnología",
    escalaItems: escalaTresNiveles,
    mostrarLeyendaEscala: false,
    requiereDesempenoGeneral: true,
    escalaDesempenoGeneral: escalaDesempenoPrimerCiclo,
    permiteObservaciones: true,
    items: [
      "Relación con la materia.",
      "Relación con el docente.",
      "Relación con los compañeros.",
      "Respeto por las normas de convivencia.",
      "Atención en clase.",
      "Aplicación de contenidos.",
      "Respuesta a pedido de materiales de trabajo.",
      "Respuesta a consignas de trabajo.",
      "Comprensión básica del sentido y área de la materia.",
      "Comprensión de las fases del proceso.",
      "Cumplimiento con entregas en tiempo y forma.",
      "Participación en clase.",
      "Participación en trabajos grupales.",
      "Proyección de lo aprendido a otras aplicaciones relacionadas.",
      "Manejo adecuado de herramientas.",
      "Puede integrar partes para formar un todo.",
      "Reflexión sobre procesos tecnológicos y uso de la IA (Inteligencia Artificial)."
    ].map((texto) => ({ pagina: 1, texto: texto }))
  })
}, (db) => {
  const dao = new Dao(db)
  ;["FINAL_ED_FISICA_G4_5", "FINAL_ED_FISICA_G6_7"].forEach((code) => {
    const records = dao.findRecordsByFilter("plantillas_informe", "codigo = {:codigo}", "", 1, 0, { codigo: code })
    records.forEach((record) => dao.deleteRecord(record))
  })
})
