migrate((db) => {
  const dao = new Dao(db)

  const cursosCol = dao.findCollectionByNameOrId("cursos")
  if (!cursosCol.schema.getFieldByName("orden")) {
    cursosCol.schema.addField(
      new SchemaField({
        id: "cys_curso_orden1",
        name: "orden",
        type: "number",
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: 0,
          max: null,
          noDecimal: true
        }
      })
    )
    dao.saveCollection(cursosCol)
  }

  const inscripcionesCol = dao.findCollectionByNameOrId("inscripciones")
  if (!inscripcionesCol.schema.getFieldByName("modalidad_jornada")) {
    inscripcionesCol.schema.addField(
      new SchemaField({
        id: "cys_mod_jornada1",
        name: "modalidad_jornada",
        type: "select",
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ["Mañana", "Tarde", "Jornada Completa"]
        }
      })
    )
    dao.saveCollection(inscripcionesCol)
  }

  const niveles = dao.findRecordsByFilter("niveles", "id != ''", "", 0, 0)
  let nivelInicial = niveles.find((n) => /inic/i.test(n.getString("nombre").trim()))
  if (!nivelInicial) {
    const nivelesCol = dao.findCollectionByNameOrId("niveles")
    nivelInicial = new Record(nivelesCol)
    nivelInicial.set("nombre", "Inicial")
    dao.saveRecord(nivelInicial)
  }

  const courses = dao.findRecordsByFilter("cursos", "id != ''", "", 0, 0)
  const refreshedCursosCol = dao.findCollectionByNameOrId("cursos")

  let sala23 = courses.find((c) => /sala.*2.*3/i.test(c.getString("nombre").trim()))
  if (!sala23) {
    sala23 = new Record(refreshedCursosCol)
  }
  sala23.set("nombre", "Sala de 2 y 3 años")
  sala23.set("nivel_id", nivelInicial.getId())
  sala23.set("orden", 2)
  sala23.set("escala_id", "")
  sala23.set("turno", "")
  dao.saveRecord(sala23)

  let sala45 = courses.find((c) => /sala.*4.*5/i.test(c.getString("nombre").trim()))
  if (!sala45) {
    sala45 = new Record(refreshedCursosCol)
  }
  sala45.set("nombre", "Sala de 4 y 5 años")
  sala45.set("nivel_id", nivelInicial.getId())
  sala45.set("orden", 4)
  sala45.set("escala_id", "")
  sala45.set("turno", "")
  dao.saveRecord(sala45)

  courses.forEach((course) => {
    const name = course.getString("nombre").trim()
    const match = name.match(/^([1-7])\s*[°º]?/)
    if (match) {
      const gradeNum = parseInt(match[1], 10)
      const currentOrder = course.getInt("orden")
      if (!currentOrder || currentOrder === 0) {
        course.set("orden", 10 + gradeNum)
        dao.saveRecord(course)
      }
    }
  })
}, (db) => {
  const dao = new Dao(db)

  const kindergartenCourses = dao.findRecordsByFilter(
    "cursos",
    "nombre = 'Sala de 2 y 3 años' || nombre = 'Sala de 4 y 5 años'",
    "",
    0,
    0
  )

  for (let i = 0; i < kindergartenCourses.length; i += 1) {
    const course = kindergartenCourses[i]
    const enrollments = dao.findRecordsByFilter(
      "inscripciones",
      "curso_id = {:courseId}",
      "",
      1,
      0,
      { courseId: course.getId() }
    )
    if (enrollments.length > 0) {
      throw new Error("No se puede revertir la migración: existen inscripciones asociadas a salas de nivel inicial.")
    }
  }

  for (let i = 0; i < kindergartenCourses.length; i += 1) {
    dao.deleteRecord(kindergartenCourses[i])
  }

  const cursosCol = dao.findCollectionByNameOrId("cursos")
  const ordenField = cursosCol.schema.getFieldByName("orden")
  if (ordenField) {
    cursosCol.schema.removeField(ordenField.id)
    dao.saveCollection(cursosCol)
  }

  const inscripcionesCol = dao.findCollectionByNameOrId("inscripciones")
  const modJornadaField = inscripcionesCol.schema.getFieldByName("modalidad_jornada")
  if (modJornadaField) {
    inscripcionesCol.schema.removeField(modJornadaField.id)
    dao.saveCollection(inscripcionesCol)
  }
})
