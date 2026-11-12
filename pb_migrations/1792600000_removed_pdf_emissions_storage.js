migrate((db) => {
  const dao = new Dao(db)
  ;["emisiones_boletin", "emisiones_informe"].forEach((name) => {
    try {
      dao.deleteCollection(dao.findCollectionByNameOrId(name))
    } catch (_) {}
  })
  ;["visados_boletin", "visados_informe"].forEach((table) => {
    try {
      db.newQuery("UPDATE " + table + " SET generacion_visado = 1 WHERE estado = 'VISADO' AND (generacion_visado IS NULL OR generacion_visado < 1)").execute()
    } catch (_) {}
  })
}, (db) => {
  const dao = new Dao(db)
  const boletinFields = [
    ["inscripcion_id", "text"], ["periodo_id", "text"], ["huella", "text"], ["version", "text"],
    ["estado", "text"], ["nombre", "text"], ["emisor", "text"], ["motivo", "text"], ["archivo_sha256", "text"],
    ["corte", "number"], ["instantanea", "json"], ["dependencias", "json"]
  ].map((field, index) => new SchemaField({
    id: "emissionf" + index,
    name: field[0],
    type: field[1],
    required: false,
    options: field[1] === "json" ? { maxSize: 2000000 } : field[1] === "number" ? { min: 1, max: 4, noDecimal: true } : { min: null, max: 1000, pattern: "" }
  }))
  boletinFields.push(new SchemaField({
    id: "emissionfile",
    name: "archivo",
    type: "file",
    required: false,
    options: { maxSelect: 1, maxSize: 10000000, mimeTypes: ["application/pdf"], thumbs: [], protected: true }
  }))
  dao.saveCollection(new Collection({
    id: "cysemissions001",
    name: "emisiones_boletin",
    type: "base",
    schema: boletinFields,
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    indexes: ["CREATE INDEX idx_emission_scope ON emisiones_boletin (inscripcion_id, periodo_id, estado)"]
  }))

  const informeFields = [
    new SchemaField({
      id: "rptemi_inst0001",
      name: "instancia_id",
      type: "relation",
      required: true,
      presentable: false,
      unique: false,
      options: {
        collectionId: "cysrptinst00001",
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
        displayFields: null
      }
    }),
    new SchemaField({
      id: "rptemi_insc0001",
      name: "inscripcion_id",
      type: "relation",
      required: true,
      presentable: false,
      unique: false,
      options: {
        collectionId: "wnp87hpjzmztwyk",
        cascadeDelete: false,
        minSelect: 1,
        maxSelect: 1,
        displayFields: null
      }
    }),
    new SchemaField({
      id: "rptemi_huella01",
      name: "huella",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: 1000, pattern: "" }
    }),
    new SchemaField({
      id: "rptemi_vers0001",
      name: "version",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: 1000, pattern: "" }
    }),
    new SchemaField({
      id: "rptemi_estado01",
      name: "estado",
      type: "select",
      required: true,
      presentable: false,
      unique: false,
      options: {
        maxSelect: 1,
        values: ["VIGENTE", "INVALIDADA"]
      }
    }),
    new SchemaField({
      id: "rptemi_nombre01",
      name: "nombre",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: 1000, pattern: "" }
    }),
    new SchemaField({
      id: "rptemi_emisor01",
      name: "emisor",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: 1000, pattern: "" }
    }),
    new SchemaField({
      id: "rptemi_motivo01",
      name: "motivo",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: 1000, pattern: "" }
    }),
    new SchemaField({
      id: "rptemi_sha25601",
      name: "archivo_sha256",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: 1000, pattern: "" }
    }),
    new SchemaField({
      id: "rptemi_snap0001",
      name: "instantanea",
      type: "json",
      required: false,
      presentable: false,
      unique: false,
      options: { maxSize: 2000000 }
    }),
    new SchemaField({
      id: "rptemi_archiv01",
      name: "archivo",
      type: "file",
      required: false,
      presentable: false,
      unique: false,
      options: {
        maxSelect: 1,
        maxSize: 10000000,
        mimeTypes: ["application/pdf"],
        thumbs: [],
        protected: true
      }
    })
  ]
  dao.saveCollection(new Collection({
    id: "cysrptemis00001",
    name: "emisiones_informe",
    type: "base",
    system: false,
    schema: informeFields,
    indexes: [
      "CREATE INDEX `idx_emisiones_informe_scope` ON `emisiones_informe` (`instancia_id`, `inscripcion_id`, `estado`)"
    ],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    options: {}
  }))
})
