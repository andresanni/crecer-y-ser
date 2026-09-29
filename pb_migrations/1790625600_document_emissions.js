migrate((db) => {
  const dao = new Dao(db)
  const fields = [
    ["inscripcion_id", "text"], ["periodo_id", "text"], ["huella", "text"], ["version", "text"],
    ["estado", "text"], ["nombre", "text"], ["emisor", "text"], ["motivo", "text"], ["archivo_sha256", "text"],
    ["corte", "number"], ["instantanea", "json"], ["dependencias", "json"]
  ].map((field, index) => new SchemaField({ id: "emissionf" + index, name: field[0], type: field[1], required: false,
    options: field[1] === "json" ? { maxSize: 2000000 } : field[1] === "number" ? { min: 1, max: 4, noDecimal: true } : { min: null, max: 1000, pattern: "" } }))
  fields.push(new SchemaField({ id: "emissionfile", name: "archivo", type: "file", required: false,
    options: { maxSelect: 1, maxSize: 10000000, mimeTypes: ["application/pdf"], thumbs: [], protected: true } }))
  dao.saveCollection(new Collection({ id: "cysemissions001", name: "emisiones_boletin", type: "base", schema: fields,
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    indexes: ["CREATE INDEX idx_emission_scope ON emisiones_boletin (inscripcion_id, periodo_id, estado)"] }))
}, (db) => {
  const dao = new Dao(db)
  dao.deleteCollection(dao.findCollectionByNameOrId("emisiones_boletin"))
})
