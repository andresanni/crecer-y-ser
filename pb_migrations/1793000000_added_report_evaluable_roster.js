migrate((db) => {
  const dao = new Dao(db)
  const authenticated = '@request.auth.id != ""'
  const inscripciones = dao.findCollectionByNameOrId("inscripciones")

  const existing = (() => {
    try {
      return dao.findCollectionByNameOrId("nomina_informe_alumno")
    } catch (_) {
      return null
    }
  })()

  if (!existing) {
    const collection = new Collection({
      id: "cysrptnom000001",
      name: "nomina_informe_alumno",
      type: "base",
      system: false,
      schema: [
        new SchemaField({
          id: "rptnom_insc0001",
          name: "inscripcion_id",
          type: "relation",
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: inscripciones.id,
            cascadeDelete: true,
            minSelect: 1,
            maxSelect: 1,
            displayFields: null
          }
        }),
        new SchemaField({
          id: "rptnom_tipo0001",
          name: "tipo_informe",
          type: "select",
          required: true,
          presentable: false,
          unique: false,
          options: {
            maxSelect: 1,
            values: ["PRIMER_BIMESTRE", "PRIMER_CUATRIMESTRE", "CICLO_FINAL"]
          }
        }),
        new SchemaField({
          id: "rptnom_eval0001",
          name: "evaluable",
          type: "bool",
          required: false,
          presentable: false,
          unique: false,
          options: {}
        })
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_nomina_informe_alumno_scope` ON `nomina_informe_alumno` (`inscripcion_id`, `tipo_informe`)"
      ],
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {}
    })

    dao.saveCollection(collection)
  }

  const pendingEnrollments = dao.findRecordsByFilter(
    "inscripciones",
    "cursada_estado = '' || cursada_estado = 'PENDIENTE'",
    "",
    0,
    0
  )

  pendingEnrollments.forEach((enrollment) => {
    const enrId = enrollment.getId()
    const isBaja = enrollment.getString("estado") === "Baja"

    if (!isBaja) {
      enrollment.set("cursada_estado", "CONFIRMADA")
      enrollment.set("bimestre_desde", 1)
      enrollment.set("bimestre_hasta", 4)
      dao.saveRecord(enrollment)
      return
    }

    const evidenceTerms = {}
    ;["evaluaciones_materia", "cierres_periodo_alumno"].forEach((col) => {
      try {
        const rows = dao.findRecordsByFilter(col, "inscripcion_id = {:id}", "", 0, 0, { id: enrId })
        rows.forEach((row) => {
          try {
            const period = dao.findRecordById("periodos", row.getString("periodo_id"))
            const num = period.getInt("numero_periodo")
            if (num >= 1 && num <= 4) evidenceTerms[num] = true
          } catch (_) {}
        })
      } catch (_) {}
    })
    try {
      const approvals = dao.findRecordsByFilter("visados_boletin", "inscripcion_id = {:id}", "", 0, 0, { id: enrId })
      approvals.forEach((approval) => {
        try {
          const wf = dao.findRecordById("instancias_carga_boletin", approval.getString("instancia_id"))
          const period = dao.findRecordById("periodos", wf.getString("periodo_id"))
          const num = period.getInt("numero_periodo")
          if (num >= 1 && num <= 4) evidenceTerms[num] = true
        } catch (_) {}
      })
    } catch (_) {}

    const terms = Object.keys(evidenceTerms).map(Number).sort((a, b) => a - b)
    if (terms.length > 0) {
      enrollment.set("cursada_estado", "CONFIRMADA")
      enrollment.set("bimestre_desde", terms[0])
      enrollment.set("bimestre_hasta", terms[terms.length - 1])
    } else {
      enrollment.set("cursada_estado", "SIN_CURSADA")
      enrollment.set("bimestre_desde", 0)
      enrollment.set("bimestre_hasta", 0)
    }
    dao.saveRecord(enrollment)
  })
}, (db) => {
  const dao = new Dao(db)
  try {
    const collection = dao.findCollectionByNameOrId("nomina_informe_alumno")
    dao.deleteCollection(collection)
  } catch (_) {}
})
