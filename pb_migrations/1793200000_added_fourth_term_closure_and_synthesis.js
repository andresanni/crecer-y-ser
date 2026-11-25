migrate((db) => {
  const dao = new Dao(db)
  const authenticated = '@request.auth.id != ""'
  const cursos = dao.findCollectionByNameOrId("cursos")
  const periodos = dao.findCollectionByNameOrId("periodos")
  const inscripciones = dao.findCollectionByNameOrId("inscripciones")
  const valoresEscala = dao.findCollectionByNameOrId("valores_escala")
  const cierres = dao.findCollectionByNameOrId("cierres_periodo_alumno")

  if (!cierres.schema.getFieldByName("sintesis_conceptual_id")) {
    cierres.schema.addField(new SchemaField({
      id: "cierres_sint001",
      name: "sintesis_conceptual_id",
      type: "relation",
      required: false,
      presentable: false,
      unique: false,
      options: {
        collectionId: valoresEscala.id,
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1,
        displayFields: null
      }
    }))
    dao.saveCollection(cierres)
  }

  const findCollection = (name) => {
    try {
      return dao.findCollectionByNameOrId(name)
    } catch (_) {
      return null
    }
  }

  if (!findCollection("instancias_asistencia_b4")) {
    dao.saveCollection(new Collection({
      id: "cysattb4inst001",
      name: "instancias_asistencia_b4",
      type: "base",
      system: false,
      schema: [
        new SchemaField({
          id: "attb4in_cur0001",
          name: "curso_id",
          type: "relation",
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: cursos.id,
            cascadeDelete: true,
            minSelect: 1,
            maxSelect: 1,
            displayFields: null
          }
        }),
        new SchemaField({
          id: "attb4in_per0001",
          name: "periodo_id",
          type: "relation",
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: periodos.id,
            cascadeDelete: true,
            minSelect: 1,
            maxSelect: 1,
            displayFields: null
          }
        }),
        new SchemaField({
          id: "attb4in_est0001",
          name: "estado",
          type: "select",
          required: true,
          presentable: false,
          unique: false,
          options: {
            maxSelect: 1,
            values: ["BORRADOR_DOCENTE", "CONTROL_DIRECTIVO"]
          }
        }),
        new SchemaField({
          id: "attb4in_rev0001",
          name: "revision",
          type: "number",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: 0,
            max: null,
            noDecimal: true
          }
        }),
        new SchemaField({
          id: "attb4in_env0001",
          name: "enviado_en",
          type: "date",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: "",
            max: ""
          }
        }),
        new SchemaField({
          id: "attb4in_por0001",
          name: "enviado_por",
          type: "text",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: 120,
            pattern: ""
          }
        })
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_instancias_asistencia_b4_scope` ON `instancias_asistencia_b4` (`curso_id`, `periodo_id`)"
      ],
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {}
    }))
  }

  if (!findCollection("tokens_acceso_asistencia_b4")) {
    dao.saveCollection(new Collection({
      id: "cysattb4tok0001",
      name: "tokens_acceso_asistencia_b4",
      type: "base",
      system: false,
      schema: [
        new SchemaField({
          id: "attb4tk_cur0001",
          name: "curso_id",
          type: "relation",
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: cursos.id,
            cascadeDelete: true,
            minSelect: 1,
            maxSelect: 1,
            displayFields: null
          }
        }),
        new SchemaField({
          id: "attb4tk_per0001",
          name: "periodo_id",
          type: "relation",
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: periodos.id,
            cascadeDelete: true,
            minSelect: 1,
            maxSelect: 1,
            displayFields: null
          }
        }),
        new SchemaField({
          id: "attb4tk_doc0001",
          name: "docente_nombre",
          type: "text",
          required: true,
          presentable: false,
          unique: false,
          options: {
            min: 1,
            max: 120,
            pattern: ""
          }
        }),
        new SchemaField({
          id: "attb4tk_hsh0001",
          name: "token_hash",
          type: "text",
          required: true,
          presentable: false,
          unique: false,
          options: {
            min: 32,
            max: 128,
            pattern: ""
          }
        }),
        new SchemaField({
          id: "attb4tk_prf0001",
          name: "token_prefix",
          type: "text",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: 32,
            pattern: ""
          }
        }),
        new SchemaField({
          id: "attb4tk_cph0001",
          name: "token_ciphertext",
          type: "text",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: 512,
            pattern: ""
          }
        }),
        new SchemaField({
          id: "attb4tk_uso0001",
          name: "ultimo_uso",
          type: "date",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: "",
            max: ""
          }
        })
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_tokens_asistencia_b4_hash` ON `tokens_acceso_asistencia_b4` (`token_hash`)",
        "CREATE UNIQUE INDEX `idx_tokens_asistencia_b4_scope` ON `tokens_acceso_asistencia_b4` (`curso_id`, `periodo_id`)"
      ],
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: authenticated,
      options: {}
    }))
  }

  if (!findCollection("asistencias_cierre_b4")) {
    dao.saveCollection(new Collection({
      id: "cysattb4row0001",
      name: "asistencias_cierre_b4",
      type: "base",
      system: false,
      schema: [
        new SchemaField({
          id: "attb4rw_ins0001",
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
          id: "attb4rw_per0001",
          name: "periodo_id",
          type: "relation",
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: periodos.id,
            cascadeDelete: true,
            minSelect: 1,
            maxSelect: 1,
            displayFields: null
          }
        }),
        new SchemaField({
          id: "attb4rw_asi0001",
          name: "asistencias",
          type: "number",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: 0,
            max: 180,
            noDecimal: true
          }
        }),
        new SchemaField({
          id: "attb4rw_ina0001",
          name: "inasistencias",
          type: "number",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: 0,
            max: 180,
            noDecimal: true
          }
        }),
        new SchemaField({
          id: "attb4rw_tar0001",
          name: "llegadas_tarde",
          type: "number",
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: 0,
            max: 180,
            noDecimal: true
          }
        })
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_asistencias_cierre_b4_scope` ON `asistencias_cierre_b4` (`inscripcion_id`, `periodo_id`)",
        "CREATE INDEX `idx_asistencias_cierre_b4_periodo` ON `asistencias_cierre_b4` (`periodo_id`, `inscripcion_id`)"
      ],
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {}
    }))
  }
}, (db) => {
  const dao = new Dao(db)
  ;["asistencias_cierre_b4", "tokens_acceso_asistencia_b4", "instancias_asistencia_b4"].forEach((name) => {
    try {
      const col = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(col)
    } catch (_) {}
  })
  try {
    const cierres = dao.findCollectionByNameOrId("cierres_periodo_alumno")
    if (cierres.schema.getFieldByName("sintesis_conceptual_id")) {
      cierres.schema.removeField("cierres_sint001")
      dao.saveCollection(cierres)
    }
  } catch (_) {}
})
