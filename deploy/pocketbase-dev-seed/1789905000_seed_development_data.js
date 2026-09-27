migrate((db) => {
  const dao = new Dao(db)
  const appEmail = $os.getenv("CYS_DEV_APP_EMAIL")
  const appPassword = $os.getenv("CYS_DEV_APP_PASSWORD")

  if (!appEmail || !appPassword || appPassword.length < 10) {
    throw new Error("Faltan credenciales locales validas para crear el usuario de desarrollo.")
  }

  const id = (number) => `dev${(`000000000000${number}`).slice(-12)}`
  const save = (collectionName, recordId, values) => {
    const collection = dao.findCollectionByNameOrId(collectionName)
    const record = new Record(collection)
    record.set("id", recordId)
    Object.keys(values).forEach((key) => {
      if (key === "password") {
        record.setPassword(values[key])
        return
      }
      record.set(key, values[key])
    })
    dao.saveRecord(record)
  }

  save("users", id(900), {
    username: "desarrollo",
    email: appEmail,
    password: appPassword,
    verified: true,
    name: "Usuario de desarrollo"
  })

  save("ciclos_lectivos", id(1), { ano: 2026, actual: true })

  save("niveles", id(2), { nombre: "Inicial" })
  save("niveles", id(3), { nombre: "Primario" })

  save("escalas_calificacion", id(4), { nombre: "Escala conceptual" })
  ;[
    [5, "Excelente", 5],
    [6, "Muy bueno", 4],
    [7, "Bueno", 3],
    [8, "En proceso", 2],
    [9, "A fortalecer", 1]
  ].forEach(([recordId, label, weight], index) => {
    save("valores_escala", id(recordId), {
      escala_id: id(4),
      peso_numerico: weight,
      etiqueta: label,
      orden_visual: index + 1
    })
  })

  save("cursos", id(10), {
    nombre: "Sala de 5 A",
    nivel_id: id(2),
    escala_id: id(4),
    turno: "Mañana"
  })
  save("cursos", id(11), {
    nombre: "1° A",
    nivel_id: id(3),
    escala_id: id(4),
    turno: "Mañana"
  })

  save("periodos", id(12), { ciclo_id: id(1), nombre: "Primer bimestre", numero_periodo: 1 })
  save("periodos", id(13), { ciclo_id: id(1), nombre: "Segundo bimestre", numero_periodo: 2 })

  ;[
    [20, "Lengua"],
    [21, "Matemática"],
    [22, "Ciencias Naturales"],
    [23, "Ciencias Sociales"],
    [24, "Conducta"]
  ].forEach(([recordId, name]) => save("materias", id(recordId), { nombre: name }))

  const courseSubjects = [
    [30, 10, 20, 1],
    [31, 10, 21, 2],
    [32, 10, 24, 3],
    [33, 11, 20, 1],
    [34, 11, 21, 2],
    [35, 11, 22, 3],
    [36, 11, 23, 4],
    [37, 11, 24, 5]
  ]
  courseSubjects.forEach(([recordId, courseId, subjectId, order]) => {
    save("curso_materias", id(recordId), {
      curso_id: id(courseId),
      ciclo_id: id(1),
      materia_id: id(subjectId),
      orden_visual: order
    })
  })

  const criterionNames = [
    "Comprensión de contenidos",
    "Participación en clase",
    "Resolución de actividades",
    "Trabajo colaborativo",
    "Autonomía"
  ]
  let criterionId = 100
  courseSubjects.forEach(([courseSubjectId]) => {
    criterionNames.forEach((name, index) => {
      save("criterios_evaluacion", id(criterionId), {
        curso_materia_id: id(courseSubjectId),
        nombre: name,
        orden_visual: index + 1
      })
      criterionId += 1
    })
  })

  for (let index = 1; index <= 6; index += 1) {
    const studentId = 199 + index
    const guardianId = 299 + index
    const linkId = 399 + index
    const enrollmentId = 499 + index
    const courseId = index <= 2 ? 10 : 11

    save("alumnos", id(studentId), {
      numero_legajo: `DEV-L-${(`0000${index}`).slice(-4)}`,
      dni: `9${(`0000000${index}`).slice(-7)}`,
      apellidos: `Prueba ${(`00${index}`).slice(-3)}`,
      nombres: `Alumno ${(`00${index}`).slice(-3)}`,
      nacionalidad: "Datos de prueba",
      domicilio: `Domicilio de prueba ${index}`
    })

    save("responsables", id(guardianId), {
      dni: `8${(`0000000${index}`).slice(-7)}`,
      apellidos: `Prueba ${(`00${index}`).slice(-3)}`,
      nombres: `Responsable ${(`00${index}`).slice(-3)}`,
      nacionalidad: "Datos de prueba",
      profesion: "Dato de prueba",
      email: `responsable${(`00${index}`).slice(-3)}@example.invalid`
    })

    save("alumno_responable", id(linkId), {
      alumno_id: id(studentId),
      responsable_id: id(guardianId),
      vinculo: "Responsable de prueba"
    })

    save("inscripciones", id(enrollmentId), {
      alumno_id: id(studentId),
      curso_id: id(courseId),
      ciclo_id: id(1),
      numero_orden: index,
      numero_inscripcion: `DEV-I-${(`0000${index}`).slice(-4)}`,
      estado: "Regular",
      promociono_con_acompanamiento: "-",
      posee_apoyos: "-"
    })
  }
}, (db) => {
  const dao = new Dao(db)
  const id = (number) => `dev${(`000000000000${number}`).slice(-12)}`
  const remove = (collectionName, ids) => {
    ids.forEach((recordId) => {
      try {
        const record = dao.findRecordById(collectionName, recordId)
        dao.deleteRecord(record)
      } catch (_) {
      }
    })
  }

  remove("alumno_responable", [1, 2, 3, 4, 5, 6].map((number) => id(399 + number)))
  remove("inscripciones", [1, 2, 3, 4, 5, 6].map((number) => id(499 + number)))
  remove("alumnos", [1, 2, 3, 4, 5, 6].map((number) => id(199 + number)))
  remove("responsables", [1, 2, 3, 4, 5, 6].map((number) => id(299 + number)))
  remove("criterios_evaluacion", Array.from({ length: 40 }, (_, index) => id(100 + index)))
  remove("curso_materias", [30, 31, 32, 33, 34, 35, 36, 37].map(id))
  remove("materias", [20, 21, 22, 23, 24].map(id))
  remove("periodos", [12, 13].map(id))
  remove("cursos", [10, 11].map(id))
  remove("valores_escala", [5, 6, 7, 8, 9].map(id))
  remove("escalas_calificacion", [4].map(id))
  remove("niveles", [2, 3].map(id))
  remove("ciclos_lectivos", [1].map(id))
  remove("users", [900].map(id))
})
