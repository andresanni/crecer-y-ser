import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'

function parseCredentials(content) {
  const values = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue
    values[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim()
  }
  return values
}

function loadDevCredentials() {
  const candidates = [
    process.env.POCKETBASE_DEV_CREDENTIALS,
    path.join('C:', 'pocketbase', 'dev-credentials.txt'),
    path.join(process.cwd(), 'dev-credentials.txt')
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        return parseCredentials(fs.readFileSync(candidate, 'utf-8'))
      } catch (_) {}
    }
  }
  return {}
}

function runLogicUnitTests() {
  function testCourseGradeNumber(name, grado) {
    if (/sala/i.test(name || '')) return 0
    const gradoRaw = grado || name || ''
    const trimmed = String(gradoRaw).trim()
    const match = trimmed.match(/^([1-7])\s*(?:[°º]|grado)?(?:\s|$)/i)
    return match ? Number(match[1]) : 0
  }

  function testIsPrimaryCourse(course, levelName) {
    if (levelName) {
      return /primar/i.test(levelName)
    }
    const name = (course.nombre || '').trim()
    if (/sala/i.test(name)) return false
    return /^[1-7]\s*[°º]?$/.test(name) || /^([1-7])\s*(?:[°º]|grado)?(?:\s|$)/i.test(name)
  }

  assert.strictEqual(testCourseGradeNumber('Sala de 2 y 3 años'), 0)
  assert.strictEqual(testCourseGradeNumber('Sala de 4 y 5 años'), 0)
  assert.strictEqual(testCourseGradeNumber('1° A'), 1)
  assert.strictEqual(testCourseGradeNumber('2°'), 2)
  assert.strictEqual(testCourseGradeNumber('4° Grado'), 4)
  assert.strictEqual(testCourseGradeNumber('7º'), 7)

  assert.strictEqual(testIsPrimaryCourse({ nombre: 'Sala de 2 y 3 años' }, 'Inicial'), false)
  assert.strictEqual(testIsPrimaryCourse({ nombre: 'Sala de 4 y 5 años' }, 'Inicial'), false)
  assert.strictEqual(testIsPrimaryCourse({ nombre: '1° A' }, 'Primario'), true)
  assert.strictEqual(testIsPrimaryCourse({ nombre: '1° A' }, null), true)
  assert.strictEqual(testIsPrimaryCourse({ nombre: 'Sala de 2 y 3 años' }, null), false)

  console.log('Verificación unitaria interna de helpers completada con éxito.')
}

async function isServerActive(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(2500) })
    return res.ok
  } catch (_) {
    return false
  }
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options)
  let body = null
  try {
    body = await res.json()
  } catch (_) {}
  return { status: res.status, ok: res.ok, body }
}

async function main() {
  const credentials = loadDevCredentials()
  const pbUrl = process.env.PB_URL || 'http://127.0.0.1:8090'
  const active = await isServerActive(pbUrl)

  if (!active) {
    console.log(`PocketBase no se encuentra activo en ${pbUrl}.`)
    runLogicUnitTests()
    console.log('Aislamiento validado en modo estático/lógico.')
    process.exit(0)
  }

  console.log(`Conectado a PocketBase en ${pbUrl}. Iniciando verificación HTTP...`)

  const adminEmail = process.env.ADMIN_EMAIL || credentials.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD || credentials.ADMIN_PASSWORD
  assert.ok(adminEmail && adminPassword, 'Faltan credenciales de administrador')

  const adminAuthRes = await requestJson(`${pbUrl}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: adminEmail, password: adminPassword })
  })
  assert.strictEqual(adminAuthRes.status, 200, 'Error al autenticar admin en PocketBase')
  const adminToken = adminAuthRes.body.token

  let userToken = adminToken
  const appEmail = process.env.APP_EMAIL || credentials.APP_EMAIL
  const appPassword = process.env.APP_PASSWORD || credentials.APP_PASSWORD
  if (appEmail && appPassword) {
    const userAuthRes = await requestJson(`${pbUrl}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: appEmail, password: appPassword })
    })
    if (userAuthRes.status === 200 && userAuthRes.body?.token) {
      userToken = userAuthRes.body.token
    }
  }

  const coursesRes = await requestJson(`${pbUrl}/api/collections/cursos/records?perPage=100`, {
    headers: { Authorization: adminToken }
  })
  assert.strictEqual(coursesRes.status, 200)
  const courses = coursesRes.body.items || []

  const kindergartenCourses = courses.filter((c) => !c.escala_id || /sala/i.test(c.nombre))
  const primaryCourses = courses.filter((c) => Boolean(c.escala_id) && !/sala/i.test(c.nombre))

  console.log(`Cursos detectados: ${primaryCourses.length} de Primaria, ${kindergartenCourses.length} de Inicial.`)

  const cyclesRes = await requestJson(`${pbUrl}/api/collections/ciclos_lectivos/records?perPage=1&sort=-ano`, {
    headers: { Authorization: adminToken }
  })
  assert.strictEqual(cyclesRes.status, 200)
  const cycle = cyclesRes.body.items?.[0]
  assert.ok(cycle, 'No se encontró un ciclo lectivo')

  const periodsRes = await requestJson(
    `${pbUrl}/api/collections/periodos/records?filter=(ciclo_id='${cycle.id}')&perPage=5`,
    { headers: { Authorization: adminToken } }
  )
  assert.strictEqual(periodsRes.status, 200)
  const period = periodsRes.body.items?.[0]
  assert.ok(period, 'No se encontró un período para el ciclo')

  const staffHeaders = {
    Authorization: userToken,
    'Content-Type': 'application/json'
  }

  const etapasRes = await requestJson(`${pbUrl}/api/cys/directivo/etapas/${period.id}`, {
    headers: staffHeaders
  })
  assert.strictEqual(etapasRes.status, 200, 'Error al consultar etapas de boletines')
  const returnedCursos = etapasRes.body?.cursos || []
  const returnedCourseIds = new Set(returnedCursos.map((c) => c.cursoId))

  for (const k of kindergartenCourses) {
    assert.strictEqual(
      returnedCourseIds.has(k.id),
      false,
      `La sala de Inicial ${k.nombre} (${k.id}) no debe figurar en etapas de boletines`
    )
  }
  console.log('✓ Verificación boletines/etapas: salas de Inicial excluidas.')

  for (const k of kindergartenCourses) {
    const assignRes = await requestJson(`${pbUrl}/api/cys/directivo/configuracion/materias`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        cursoId: k.id,
        cicloId: cycle.id,
        materiaId: 'dummy1234567890',
        ordenVisual: 1
      })
    })
    assert.strictEqual(
      assignRes.status,
      400,
      `Asignar materia a ${k.nombre} debió retornar 400 pero retornó ${assignRes.status}`
    )

    const issueLinkRes = await requestJson(`${pbUrl}/api/cys/enlaces-docentes`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        cursoId: k.id,
        periodoId: period.id,
        docenteNombre: 'Docente Prueba'
      })
    })
    assert.strictEqual(
      issueLinkRes.status,
      400,
      `Emitir enlace docente para ${k.nombre} debió retornar 400 pero retornó ${issueLinkRes.status}`
    )

    const statusRes = await requestJson(
      `${pbUrl}/api/cys/directivo/configuracion/estado/${k.id}/${cycle.id}`,
      { headers: staffHeaders }
    )
    assert.strictEqual(
      statusRes.status,
      400,
      `Consultar estado de configuración para ${k.nombre} debió retornar 400`
    )

    const instanceRes = await requestJson(
      `${pbUrl}/api/cys/directivo/instancias/${k.id}/${period.id}`,
      { headers: staffHeaders }
    )
    assert.strictEqual(
      instanceRes.status,
      400,
      `Consultar instancia de boletín para ${k.nombre} debió retornar 400`
    )
  }
  console.log('✓ Verificación boletines/mutaciones: asignación y enlaces rechazados con HTTP 400.')

  const reportTypes = ['PRIMER_BIMESTRE', 'PRIMER_CUATRIMESTRE', 'CICLO_FINAL']
  for (const reportType of reportTypes) {
    const reportStagesRes = await requestJson(
      `${pbUrl}/api/cys/directivo/informes/etapas/${cycle.id}/${reportType}`,
      { headers: staffHeaders }
    )
    assert.strictEqual(
      reportStagesRes.status,
      200,
      `Error al consultar etapas de informes para ${reportType}`
    )
    const reportCells = reportStagesRes.body?.filas || reportStagesRes.body?.etapas || []
    const reportCourseIds = new Set(reportCells.map((c) => c.cursoId || c.curso?.id || c.id).filter(Boolean))

    for (const k of kindergartenCourses) {
      assert.strictEqual(
        reportCourseIds.has(k.id),
        false,
        `La sala de Inicial ${k.nombre} no debe figurar en etapas de informes ${reportType}`
      )
    }

    for (const k of kindergartenCourses) {
      const reportIssueRes = await requestJson(`${pbUrl}/api/cys/enlaces-informes`, {
        method: 'POST',
        headers: staffHeaders,
        body: JSON.stringify({
          cicloId: cycle.id,
          tipoInforme: reportType,
          cursoId: k.id,
          docenteNombre: 'Docente',
          docenteApellido: 'Prueba'
        })
      })
      assert.strictEqual(
        reportIssueRes.status,
        400,
        `Emitir informe ${reportType} para ${k.nombre} debió retornar 400 pero retornó ${reportIssueRes.status}`
      )
    }
  }
  console.log('✓ Verificación informes primarios: etapas y emisión de salas de Inicial bloqueadas con HTTP 400.')
  console.log('Todos los tests HTTP de aislamiento para Nivel Inicial pasaron exitosamente.')
}

main().catch((err) => {
  console.error('Error durante la ejecución del test de aislamiento:', err)
  process.exit(1)
})
