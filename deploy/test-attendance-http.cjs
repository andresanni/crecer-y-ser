const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { default: PocketBase } = require('pocketbase');
const { loadSource } = require('./attendance-test-loader.cjs');

test('Persistencia de asistencia y lectura mensual en PocketBase temporal con migraciones reales', { timeout: 60000 }, async () => {
  const base = path.resolve('C:/pocketbase');
  const root = fs.mkdtempSync(path.join(base, 'attendance-test-'));
  const binary = path.join(base, 'pocketbase.exe');
  const hooks = path.join(root, 'empty-hooks');
  fs.mkdirSync(hooks);
  const args = [`--dir=${path.join(root, 'data')}`, `--migrationsDir=${path.resolve('pb_migrations')}`, `--hooksDir=${hooks}`, '--automigrate=false'];
  const password = randomBytes(24).toString('hex');
  let server;
  try {
    execFileSync(binary, ['migrate', 'up', ...args], { windowsHide: true, stdio: 'pipe' });
    execFileSync(binary, ['admin', 'create', 'attendance@example.local', password, ...args], { windowsHide: true, stdio: 'pipe' });
    const socket = net.createServer();
    await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
    const port = socket.address().port;
    await new Promise(resolve => socket.close(resolve));
    const origin = `http://127.0.0.1:${port}`;
    server = spawn(binary, ['serve', ...args.filter(arg => !arg.startsWith('--hooksDir=')), `--hooksDir=${path.resolve('pb_hooks')}`, `--http=127.0.0.1:${port}`], { windowsHide: true, stdio: 'ignore' });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await fetch(origin + '/api/health').then(response => response.ok).catch(() => false)) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, 'PocketBase temporal debe iniciar');
    const admin = new PocketBase(origin);
    admin.autoCancellation(false);
    const authentication = await fetch(origin + '/api/admins/auth-with-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'attendance@example.local', password }),
    });
    assert.equal(authentication.status, 200);
    const administrator = await authentication.json();
    admin.authStore.save(administrator.token, administrator.admin);
    const create = (collection, body) => admin.collection(collection).create(body);
    await create('users', { email: 'attendance-staff@example.local', password, passwordConfirm: password, name: 'Prueba' });
    const cycle = await create('ciclos_lectivos', { ano: 2026, actual: true });
    const level = await create('niveles', { nombre: 'Primario' });
    const scale = await create('escalas_calificacion', { nombre: 'Segundo ciclo sintético' });
    const note = await create('valores_escala', { escala_id: scale.id, etiqueta: 'AL7', peso_numerico: 1, orden_visual: 1 });
    const course = await create('cursos', { nombre: '4°', nivel_id: level.id, escala_id: scale.id, turno: 'Mañana' });
    const period = await create('periodos', { ciclo_id: cycle.id, nombre: 'B1', numero_periodo: 1 });
    const subject = await create('materias', { nombre: 'Lengua' });
    const material = await create('curso_materias', { curso_id: course.id, ciclo_id: cycle.id, materia_id: subject.id, orden_visual: 1 });
    const enrollments = [];
    for (const [index, extra] of [{}, { fecha_ingreso: '2026-05-18', resolucion_apoyo: 'Res. específica' }, { estado: 'Baja', fecha_egreso: '2026-05-20' }, { fecha_ingreso: '2026-06-01' }, { cursada_estado: 'SIN_CURSADA' }].entries()) {
      const student = await create('alumnos', { apellidos: 'Sintético', nombres: `Alumno ${index}`, dni: String(index + 1).padStart(8, '0'), fecha_nacimiento: '2018-08-10', sexo: 'Femenino', nacionalidad: 'Argentina' });
      enrollments.push(await create('inscripciones', { alumno_id: student.id, curso_id: course.id, ciclo_id: cycle.id, estado: 'Regular', fecha_ingreso: '2026-03-01', numero_orden: index + 1, ...extra }));
    }
    await create('evaluaciones_materia', { inscripcion_id: enrollments[0].id, periodo_id: period.id, curso_materia_id: material.id, calificacion_general_id: note.id });
    const staff = new PocketBase(origin);
    staff.autoCancellation(false);
    await staff.collection('users').authWithPassword('attendance-staff@example.local', password);
    const calendar = loadSource('services/calendarioMes.service.ts', staff).calendarioMesService;
    const monthly = loadSource('services/registroAsistenciaCurso.service.ts', staff).registroAsistenciaCursoService;
    const configure = async (month, events = []) => {
      const current = await calendar.obtenerConfiguracion(cycle.id, month);
      return calendar.guardarConfiguracion(cycle.id, month, current, events);
    };
    const configured = await configure(5, [{ dia: 1, tipo: 'FERIADO', textoCeldaVertical: 'FERIADO', descripcionObservaciones: 'Feriado sintético' }]);
    const month = configured.mes;
    assert.equal(month.total_dias_habiles, 20);
    assert.equal(month.dias_habiles_acumulados, 20);
    const june = await configure(6);
    assert.equal(june.mes.dias_habiles_acumulados, 42);
    const initial = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 5);
    assert.equal(initial.revision, 0);
    await monthly.guardarCambios(initial, [{ inscripcionId: enrollments[0].id, fecha: '2026-05-04', estado: 'IT' }, { inscripcionId: enrollments[0].id, fecha: '2026-05-05', estado: 'A' }], 'Nota sintética');
    const record = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 5);
    assert.equal(record.alumnos.length, 4);
    assert.equal(record.alumnos[0].llegadasTarde, 1);
    assert.equal(record.alumnos[0].inasistencias, 1);
    assert.equal(record.alumnos[0].calificacionesMaterias[material.id], 'AL7');
    assert.equal(record.edades.total.t, 2);
    assert.equal(record.nacionalidad.total.t, 2);
    assert.equal(record.inscripcion.quedanUltimoDia.t, 2);
    assert.equal(record.observacionesDelMes[0], '1. Feriado sintético');
    assert.equal(record.observacionesAdicionales, 'Nota sintética');
    await monthly.guardarCambios(record, [{ inscripcionId: enrollments[0].id, fecha: '2026-05-04', estado: 'P' }], 'Nota sintética');
    const refreshed = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 5);
    assert.equal(refreshed.alumnos[0].llegadasTarde, 0);
    assert.equal(refreshed.alumnos[0].marcasPorDia[4], 'P');
    assert.equal(refreshed.revision, 2);
    const race = await Promise.allSettled([
      monthly.guardarCambios(refreshed, [{ inscripcionId: enrollments[0].id, fecha: '2026-05-06', estado: 'J' }], 'Sesión A'),
      monthly.guardarCambios(refreshed, [{ inscripcionId: enrollments[0].id, fecha: '2026-05-07', estado: 'E' }], 'Sesión B'),
    ]);
    assert.equal(race.filter(value => value.status === 'fulfilled').length, 1);
    assert.equal(race.find(value => value.status === 'rejected').reason.status, 409);
    const current = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 5);
    assert.equal(current.revision, 3);
    await assert.rejects(monthly.guardarCambios(current, [
      { inscripcionId: enrollments[0].id, fecha: '2026-05-08', estado: 'A' },
      { inscripcionId: enrollments[3].id, fecha: '2026-05-08', estado: 'A' },
    ], 'No debe persistir'), error => error.status === 400);
    const rollback = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 5);
    assert.equal(rollback.revision, 3);
    assert.equal(rollback.alumnos[0].marcasPorDia[8], 'P');
    assert.equal(rollback.observacionesAdicionales, current.observacionesAdicionales);
    for (const change of [
      { inscripcionId: enrollments[0].id, fecha: '2026-05-09', estado: 'A' },
      { inscripcionId: enrollments[0].id, fecha: '2026-05-01', estado: 'A' },
      { inscripcionId: enrollments[2].id, fecha: '2026-05-21', estado: 'A' },
      { inscripcionId: enrollments[4].id, fecha: '2026-05-08', estado: 'A' },
      { inscripcionId: course.id, fecha: '2026-05-08', estado: 'A' },
    ]) await assert.rejects(monthly.guardarCambios(rollback, [change], ''), error => error.status === 400);
    await configure(5, [{ dia: 1, tipo: 'FERIADO', textoCeldaVertical: 'FERIADO', descripcionObservaciones: 'Feriado sintético' },
      { dia: 11, tipo: 'ASUETO', textoCeldaVertical: 'ASUETO', descripcionObservaciones: 'Asueto sintético' }]);
    assert.equal((await calendar.obtenerMesPorCicloYNumero(cycle.id, 6)).diasHabilesAcumulados, 41);
    await assert.rejects(monthly.guardarCambios(rollback, [], 'Versión vieja'), error => error.status === 409);
    const afterCalendar = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 5);
    await monthly.guardarCambios(afterCalendar, [{ inscripcionId: enrollments[2].id, fecha: '2026-05-20', estado: 'J' }], afterCalendar.observacionesAdicionales);
    assert.equal((await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 5)).alumnos[2].marcasPorDia[20], 'J');
    await assert.rejects(staff.collection('asistencias_diarias').create({ inscripcion_id: enrollments[0].id, fecha: '2026-05-12', estado: 'A' }), error => error.status === 403);
    const registration = await admin.collection('registros_asistencia_curso').getFirstListItem(`curso_id = "${course.id}" && mes_calendario_id = "${month.id}"`);
    await assert.rejects(staff.collection('registros_asistencia_curso').update(registration.id, { observaciones_adicionales: 'Escritura directa' }), error => error.status === 403);
    const calendarBefore = await calendar.obtenerConfiguracion(cycle.id, 9);
    await assert.rejects(calendar.guardarConfiguracion(cycle.id, 9, calendarBefore,
      [{ dia: 31, tipo: 'FERIADO', textoCeldaVertical: 'X', descripcionObservaciones: 'X' }]), error => error.status === 400);
    assert.equal((await calendar.obtenerConfiguracion(cycle.id, 9)).revision, calendarBefore.revision);
    assert.equal((await calendar.obtenerConfiguracion(cycle.id, 9)).mes, null);
    const calendarRace = await Promise.allSettled([
      calendar.guardarConfiguracion(cycle.id, 9, calendarBefore, []),
      calendar.guardarConfiguracion(cycle.id, 9, calendarBefore, []),
    ]);
    assert.equal(calendarRace.filter(value => value.status === 'fulfilled').length, 1);
    assert.equal(calendarRace.find(value => value.status === 'rejected').reason.status, 409);
    const middle = (await calendar.obtenerConfiguracion(cycle.id, 9)).mes;
    await admin.collection('meses_calendario').update(middle.id, { periodo_boletin_id: period.id });
    const september = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 9);
    assert.equal(Object.keys(september.alumnos[0].calificacionesMaterias).length, 0);
    const julyCalendar = await configure(7);
    assert.equal(julyCalendar.mes.periodo_boletin_id, '');
    const waitingForPeriod = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 7);
    assert.equal(Object.keys(waitingForPeriod.alumnos[0].calificacionesMaterias).length, 0);
    await monthly.guardarCambios(waitingForPeriod, [{ inscripcionId: enrollments[0].id, fecha: '2026-07-01', estado: 'A' }], 'A la espera de notas');
    const secondPeriod = await create('periodos', { ciclo_id: cycle.id, nombre: 'B2', numero_periodo: 2 });
    const waitingForGrades = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 7);
    assert.equal(Object.keys(waitingForGrades.alumnos[0].calificacionesMaterias).length, 0);
    const pendingEvaluation = await create('evaluaciones_materia', { inscripcion_id: enrollments[0].id, periodo_id: secondPeriod.id, curso_materia_id: material.id });
    const ungraded = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 7);
    assert.equal(ungraded.alumnos[0].calificacionesMaterias[material.id], '');
    await admin.collection('evaluaciones_materia').update(pendingEvaluation.id, { calificacion_general_id: note.id });
    const completedGrades = await monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 7);
    assert.equal(completedGrades.alumnos[0].calificacionesMaterias[material.id], 'AL7');
    assert.equal(completedGrades.alumnos[0].marcasPorDia[1], 'A');
    assert.equal(completedGrades.observacionesAdicionales, 'A la espera de notas');
    assert.equal((await calendar.obtenerConfiguracion(cycle.id, 7)).revision, julyCalendar.revision);
    await assert.rejects(monthly.obtenerHojaAsistenciaCompleta(course.id, cycle.id, 8), /No se encontró el mes calendario/);
    await assert.rejects(staff.collection('meses_calendario').update(month.id, { total_dias_habiles: 30 }), error => error.status === 403);
    const anonymous = new PocketBase(origin);
    await assert.rejects(anonymous.collection('asistencias_diarias').create({ inscripcion_id: enrollments[0].id, fecha: '2026-05-06', estado: 'A' }));
    await assert.rejects(anonymous.send(`/api/cys/directivo/asistencias/${course.id}/${cycle.id}/5`, { method: 'GET' }), error => error.status === 401);
    await configure(3, [
      {dia:2,tipo:'ASUETO',textoCeldaVertical:'ASUETO',descripcionObservaciones:'Asueto de prueba'},
      {dia:7,tipo:'FERIADO',textoCeldaVertical:'SÁBADO',descripcionObservaciones:'Evento en sábado'},
    ]);
    await configure(4, [{dia:3,tipo:'FERIADO',textoCeldaVertical:'FERIADO',descripcionObservaciones:'Feriado de prueba'}]);
    const accumulatedMay = await calendar.obtenerMesPorCicloYNumero(cycle.id, 5);
    const accumulatedJune = await calendar.obtenerMesPorCicloYNumero(cycle.id, 6);
    assert.equal(accumulatedMay.totalDiasHabiles, 19);
    assert.equal(accumulatedMay.diasHabilesAcumulados, 61);
    assert.equal(accumulatedJune.diasHabilesAcumulados, 83);
    if (process.env.EXPORT_ATTENDANCE_SCHEMA === '1') {
      const actual = await admin.collections.getFullList();
      const schema = JSON.parse(fs.readFileSync(path.resolve('pb_schema.json'), 'utf8'));
      const names = ['asistencias_diarias', 'registros_asistencia_curso', 'ciclos_lectivos', 'meses_calendario', 'eventos_calendario'];
      const derived = schema.map(collection => {
        if (!names.includes(collection.name)) return collection;
        const { created, updated, ...definition } = actual.find(item => item.name === collection.name);
        return definition;
      });
      fs.writeFileSync(path.resolve('pb_schema.json'), JSON.stringify(derived, null, 2) + '\n');
    }
  } finally {
    if (server && server.exitCode === null) {
      await new Promise(resolve => { server.once('exit', resolve); server.kill(); });
    }
    const resolved = path.resolve(root);
    assert.ok(resolved.startsWith(base + path.sep) && path.basename(resolved).startsWith('attendance-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
