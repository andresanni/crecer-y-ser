migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cyscalmonth0001")

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_meses_calendario_ciclo_mes` ON `meses_calendario` (\n  `ciclo_id`,\n  `mes`\n)"
  ]

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "calm_tothab0001",
    "name": "total_dias_habiles",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 0,
      "max": 31,
      "noDecimal": true
    }
  }))

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "calm_totacm0001",
    "name": "dias_habiles_acumulados",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 0,
      "max": 365,
      "noDecimal": true
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cyscalmonth0001")

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_meses_calendario_ciclo_mes` ON `meses_calendario` (`ciclo_id`, `mes`)"
  ]

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "calm_tothab0001",
    "name": "total_dias_habiles",
    "type": "number",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 0,
      "max": 31,
      "noDecimal": true
    }
  }))

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "calm_totacm0001",
    "name": "dias_habiles_acumulados",
    "type": "number",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 0,
      "max": 365,
      "noDecimal": true
    }
  }))

  return dao.saveCollection(collection)
})
