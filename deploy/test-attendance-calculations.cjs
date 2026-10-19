const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ClientResponseError } = require('pocketbase');
const { loadSource } = require('./attendance-test-loader.cjs');

const calculations = loadSource('utils/asistenciaCalculos.ts');
const enrollment = loadSource('utils/matriculaCalculos.ts');
const plain = value => JSON.parse(JSON.stringify(value));
const missing = () => new ClientResponseError({ status: 404 });

function fixture({ month = 5, linked = 'period', periodNumber = 1, periodCycle = 'cycle', failure, noPeriod = false, fechaInicioClases = '' } = {}) {
  const calls = [];
  const student = (id, values = {}) => ({ id, estado: 'Regular', fecha_ingreso: '2026-03-01', numero_orden: 1, posee_apoyos: 'SI', expand: { alumno_id: { id: 'student-' + id, apellidos: 'Sintético', nombres: id, sexo: 'Femenino', fecha_nacimiento: '2018-08-10', nacionalidad: 'Argentina' } }, ...values });
  const records = {
    ciclos_lectivos: [{ id: 'cycle', ano: 2026, actual: true, fecha_inicio_clases: fechaInicioClases }],
    meses_calendario: [{ id: 'month', ciclo_id: 'cycle', ano: 2026, mes: month, total_dias_habiles: 20, dias_habiles_acumulados: 60, periodo_boletin_id: linked }],
    eventos_calendario: [{ id: 'holiday', mes_calendario_id: 'month', fecha: `2026-${String(month).padStart(2, '0')}-01`, dia: 1, tipo: 'FERIADO', texto_celda_vertical: 'FERIADO', descripcion_observaciones: 'Feriado sintético' }],
    cursos: [{ id: 'course', nombre: '4°', turno: 'Mañana', expand: { nivel_id: { nombre: 'Primario' } } }],
    inscripciones: [student('regular'), student('entry', { fecha_ingreso: '2026-05-18', numero_orden: 2, resolucion_apoyo: 'Res. específica' }), student('exit', { estado: 'Baja', fecha_egreso: '2026-05-20', numero_orden: 3 }), student('future', { fecha_ingreso: '2026-06-01', numero_orden: 4 })],
    asistencias_diarias: [{ id: 'late', inscripcion_id: 'regular', fecha: '2026-05-04 00:00:00.000Z', estado: 'IT' }, { id: 'absent', inscripcion_id: 'regular', fecha: '2026-05-05 00:00:00.000Z', estado: 'J' }],
    periodos: noPeriod ? [] : [{ id: 'period', ciclo_id: periodCycle, numero_periodo: periodNumber }],
    curso_materias: [{ id: 'language', materia_id: 'language-subject', orden_visual: 1, expand: { materia_id: { nombre: 'Lengua' } } }, { id: 'classroom', materia_id: 'classroom-subject', orden_visual: 2, expand: { materia_id: { nombre: 'Trabajo en el aula' } } }],
    evaluaciones_materia: [{ id: 'grade', inscripcion_id: 'regular', curso_materia_id: 'language', expand: { calificacion_general_id: { etiqueta: 'AL-7' } } }, { id: 'criteria-evaluation', inscripcion_id: 'regular', curso_materia_id: 'classroom' }],
    evaluaciones_criterios: [{ id: 'criterion-grade', evaluacion_materia_id: 'criteria-evaluation', expand: { criterio_id: { orden_visual: 4 }, valor_escala_id: { etiqueta: 'AV9' } } }],
    registros_asistencia_curso: [],
    instancias_carga_boletin: [{ id: 'workflow', curso_id: 'course', periodo_id: 'period', estado: 'CONTROL_DIRECTIVO' }],
    visados_boletin: [{ id: 'approval-regular', instancia_id: 'workflow', inscripcion_id: 'regular', estado: 'VISADO', revision_contenido: 0, revision_visada: 0 }],
  };
  const pb = { send: async () => ({ revision: 0, versionFuentes: 'synthetic-version', mes: records.meses_calendario[0], curso: records.cursos[0],
    fechaInicioClases: records.ciclos_lectivos[0].fecha_inicio_clases,
    eventos: records.eventos_calendario, inscripciones: records.inscripciones, novedades: records.asistencias_diarias, registroCurso: records.registros_asistencia_curso[0] || null }),
    collection: name => ({
    getFullList: async options => { calls.push({ name, operation: 'list', options }); if (failure?.name === name) throw failure.error; return records[name] || []; },
    getOne: async id => { calls.push({ name, operation: 'one', id }); if (failure?.name === name) throw failure.error; const record = records[name]?.find(row => row.id === id); if (!record) throw missing(); return record; },
    getFirstListItem: async filter => { calls.push({ name, operation: 'first', filter }); if (failure?.name === name) throw failure.error; if (!records[name]?.length) throw missing(); return records[name][0]; },
    create: async data => { calls.push({ name, operation: 'create', data }); return { id: 'created', ...data }; },
    update: async (id, data) => { calls.push({ name, operation: 'update', id, data }); return { id, ...data }; },
    delete: async id => { calls.push({ name, operation: 'delete', id }); },
  }) };
  const service = loadSource('services/registroAsistenciaCurso.service.ts', pb).registroAsistenciaCursoService;
  return { records, pb, calls, service, read: () => service.obtenerHojaAsistenciaCompleta('course', 'cycle', month) };
}

test('Los totales de las muestras coinciden con las funciones reales', () => {
  const july = calculations.calcularResumenAsistenciaGeneral(105, 16, 11);
  assert.equal(july.porcentajeAsistencia, 87);
  assert.equal(july.porcentajeInasistencia, 13);
  assert.equal(july.asistenciaMedia, 10);
  const may = calculations.calcularResumenAsistenciaGeneral(304, 47, 19);
  assert.equal(may.porcentajeAsistencia, 87);
  assert.equal(may.asistenciaMedia, 16);
  assert.equal(calculations.calcularResumenAsistenciaGeneral(0, 0, 0).asistenciaMedia, 0);
});

test('Matrícula: altas, bajas, ingreso y egreso el último día y futuras inscripciones', () => {
  const rows = [
    { estado: 'Regular', sexo: 'Masculino', fechaIngreso: '2026-03-01' },
    { estado: 'Regular', sexo: 'Femenino', fechaIngreso: '2026-05-18', procedenciaIngreso: 'OTRA_ESCUELA' },
    { estado: 'Baja', sexo: 'Femenino', fechaIngreso: '2026-03-01', fechaEgreso: '2026-05-31', destinoEgreso: 'OTRO_GRADO' },
    { estado: 'Regular', sexo: 'Femenino', fechaIngreso: '2026-05-31' },
    { estado: 'Baja', sexo: 'Masculino', fechaIngreso: '2026-03-01', fechaEgreso: '2026-04-30' },
    { estado: 'Regular', sexo: 'Masculino', fechaIngreso: '2026-06-01' },
  ];
  const summary = enrollment.calcularMovimientosInscripcion(rows, 2026, 5);
  assert.deepEqual(plain(summary.inscriptosPrimerDia), { v: 1, m: 1, t: 2 });
  assert.deepEqual(plain(summary.quedanUltimoDia), { v: 1, m: 2, t: 3 });
  assert.equal(summary.entradosPosteriormente.total.t, 2);
  assert.equal(summary.salidosEnElMes.otroGrado.t, 1);
  assert.equal(rows.filter(row => enrollment.permaneceAlUltimoDia(row, '2026-05-31')).length, 3);
});

test('Edades: corte de junio, cumpleaños y todas las edades presentes', () => {
  assert.equal(calculations.calcularEdadAlumno('2017-09-15 00:00:00.000Z', 2026, 5), 8);
  assert.equal(calculations.calcularEdadAlumno('2017-09-15', 2026, 7), 8);
  assert.equal(calculations.calcularEdadAlumno('2017-09-15', 2026, 9), 9);
  const ages = calculations.calcularDistribucionEdades(Array.from({ length: 10 }, (_, i) => ({ fechaNacimiento: `${2009 + i}-01-01`, sexo: 'Femenino' })), 2026, 5);
  assert.equal(ages.filas.length, 10);
  assert.equal(ages.total.t, 10);
});

test('Marcas: ingreso y egreso inclusivos; novedades y días sin clase', () => {
  assert.equal(calculations.determinarMarcaDia('2026-05-17', '2026-05-18'), '---');
  assert.equal(calculations.determinarMarcaDia('2026-05-18', '2026-05-18'), 'P');
  assert.equal(calculations.determinarMarcaDia('2026-05-20', undefined, '2026-05-20', 'Baja', 'IT'), 'IT');
  assert.equal(calculations.determinarMarcaDia('2026-05-21', undefined, '2026-05-20', 'Baja'), '---');
  assert.equal(calculations.determinarMarcaDia('2026-05-22', undefined, undefined, 'Regular', 'A', false), '');
});

test('Servicio integrado: asistencia, tardanzas, calificaciones, criterios y observaciones', async () => {
  const f = fixture();
  const record = await f.read();
  const regular = record.alumnos.find(row => row.inscripcionId === 'regular');
  assert.equal(regular.llegadasTarde, 1);
  assert.equal(regular.inasistencias, 1);
  assert.equal(regular.marcasPorDia[4], 'IT');
  assert.equal(regular.marcasPorDia[1], '');
  assert.equal(regular.calificacionesMaterias.language, 'AL-7');
  assert.equal(regular.trabajoEnElAula[4], 'AV9');
  assert.equal(regular.trabajoEnElAula[1], '');
  assert.equal(regular.observacion, '');
  assert.match(record.alumnos.find(row => row.inscripcionId === 'entry').observacion, /^Res\. específica - ALTA 18\/5$/);
  assert.equal(record.observacionesDelMes[0], '1. Feriado sintético');
  assert.equal(record.edades.total.t, 2);
  assert.equal(record.nacionalidad.total.t, record.inscripcion.quedanUltimoDia.t);
  const sumDaily = Object.values(record.asistenciaGeneral.presentesPorDia).reduce((a, b) => a + b, 0);
  assert.equal(sumDaily, record.asistenciaGeneral.totAsistencia);
  const adapted = loadSource('components/RegistroEscolar/registroEscolarAdapter.ts').adaptarRegistroEscolar(record);
  assert.equal(adapted.monthlyTotals[2], 1);
  assert.equal(adapted.students[0].grades[0], 'AL7');
  assert.equal(adapted.students[0].id, 'regular');
});

test('Un mes intermedio no consulta ni imprime evaluaciones aunque tenga un período vinculado', async () => {
  const f = fixture({ month: 9 });
  const record = await f.read();
  assert.equal(f.calls.some(call => call.name === 'evaluaciones_materia' || call.name === 'evaluaciones_criterios' || call.name === 'periodos'), false);
  assert.deepEqual(plain(record.alumnos[0].calificacionesMaterias), {});
  assert.equal(record.alumnos[0].trabajoEnElAula[4], '');
});

test('Los cuatro meses de boletín consultan su bimestre correspondiente', async () => {
  for (const [month, periodNumber] of [[5, 1], [7, 2], [10, 3], [12, 4]]) {
    const f = fixture({ month, periodNumber });
    await f.read();
    assert.equal(f.calls.some(call => call.name === 'evaluaciones_materia'), true);
  }
});

test('El período consultado debe pertenecer al ciclo y bimestre correctos', async () => {
  for (const values of [{ periodNumber: 2 }, { periodCycle: 'other-cycle' }]) {
    const f = fixture(values);
    await assert.rejects(f.read(), /no corresponde al ciclo y mes/);
    assert.equal(f.calls.some(call => call.name === 'evaluaciones_materia'), false);
  }
});

test('Se busca automáticamente el bimestre del mes; su ausencia deja las notas vacías', async () => {
  const found = fixture({ linked: '' });
  await found.read();
  assert.match(found.calls.find(call => call.name === 'periodos').filter, /numero_periodo = 1/);
  const absent = fixture({ linked: '', noPeriod: true });
  const record = await absent.read();
  assert.deepEqual(plain(record.alumnos[0].calificacionesMaterias), {});
});

test('Fallas de autenticación y red no se convierten en registros inexistentes ni generan escrituras', async () => {
  for (const status of [0, 401, 403, 500]) {
    const error = new ClientResponseError({ status });
    for (const [name, relative, exportName, method, args] of [
      ['meses_calendario', 'services/calendarioMes.service.ts', 'calendarioMesService', 'obtenerMesPorCicloYNumero', ['cycle', 5]],
      ['asistencias_diarias', 'services/asistenciaDiaria.service.ts', 'asistenciaDiariaService', 'obtenerNovedad', ['regular', '2026-05-04']],
      ['registros_asistencia_curso', 'services/registroAsistenciaCurso.service.ts', 'registroAsistenciaCursoService', 'obtenerRegistroCurso', ['course', 'month']],
    ]) {
      const f = fixture({ failure: { name, error } });
      const service = loadSource(relative, f.pb)[exportName];
      await assert.rejects(service[method](...args), actual => actual === error);
      assert.equal(f.calls.some(call => ['create', 'update', 'delete'].includes(call.operation)), false);
    }
  }
});

test('Un fallo al buscar el período no oculta notas ni se interpreta como ausencia del bimestre', async () => {
  const error = new ClientResponseError({ status: 500 });
  const f = fixture({ linked: '', failure: { name: 'periodos', error } });
  await assert.rejects(f.read(), actual => actual === error);
});

test('El día de un evento ya numerado no se duplica', async () => {
  const f = fixture();
  f.records.eventos_calendario[0].descripcion_observaciones = '1. Feriado sintético';
  assert.equal((await f.read()).observacionesDelMes[0], '1. Feriado sintético');
});


test('Las inscripciones confirmadas SIN_CURSADA no generan presencias ni integran los resúmenes', async () => {
  const f = fixture();
  f.records.inscripciones.push({ ...f.records.inscripciones[0], id: 'cancelled', cursada_estado: 'SIN_CURSADA' });
  const record = await f.read();
  assert.equal(record.alumnos.some(row => row.inscripcionId === 'cancelled'), false);
  assert.equal(record.inscripcion.quedanUltimoDia.t, 2);
});

test('La baja permanece visible hasta diciembre, conserva el orden y deja de sumar tras su mes de egreso', async () => {
  for (const [month, periodNumber] of [[5, 1], [7, 2], [10, 3], [12, 4]]) {
    const f = fixture({ month, periodNumber });
    f.records.inscripciones[0].numero_orden = 9;
    f.records.inscripciones[1].numero_orden = 11;
    f.records.inscripciones[2].numero_orden = 3;
    f.records.inscripciones[3].numero_orden = 15;
    f.records.inscripciones[3].fecha_ingreso = '2026-03-01';
    const record = await f.read();
    assert.deepEqual(plain(record.alumnos.map(row => row.numeroOrden)), [3, 9, 11, 15]);
    const withdrawn = record.alumnos.find(row => row.inscripcionId === 'exit');
    assert.ok(withdrawn);
    if (month === 5) {
      assert.equal(withdrawn.bajaDesdeDia, 21);
      assert.ok(withdrawn.asistencias > 0);
      assert.equal(record.inscripcion.salidosEnElMes.total.t, 1);
    } else {
      assert.equal(withdrawn.bajaDesdeDia, 1);
      assert.equal(withdrawn.asistencias, 0);
      assert.equal(withdrawn.inasistencias, 0);
      assert.equal(withdrawn.llegadasTarde, 0);
      assert.equal(record.inscripcion.salidosEnElMes.total.t, 0);
      assert.equal(record.nacionalidad.total.t, 3);
      assert.equal(record.edades.total.t, 3);
    }
    const adapted = loadSource('components/RegistroEscolar/registroEscolarAdapter.ts').adaptarRegistroEscolar(record);
    assert.equal(adapted.students[0].order, 3);
    assert.equal(adapted.students[0].withdrawalFromDay, withdrawn.bajaDesdeDia);
  }
});

test('Las notas y criterios respetan el rango evaluable confirmado aunque existan evaluaciones fuera de él', async () => {
  const f = fixture();
  f.records.inscripciones[0].cursada_estado = 'CONFIRMADA';
  f.records.inscripciones[0].bimestre_desde = 2;
  f.records.inscripciones[0].bimestre_hasta = 4;
  const record = await f.read();
  assert.deepEqual(plain(record.alumnos[0].calificacionesMaterias), {});
  assert.equal(record.alumnos[0].trabajoEnElAula[4], '');
  assert.ok(record.alumnos[0].asistencias > 0);
});

test('Los meses de cierre esperan períodos y notas y los incorporan al releer sin configurar el calendario', async () => {
  for (const [month, periodNumber] of [[5, 1], [7, 2], [10, 3], [12, 4]]) {
    const f = fixture({ month, noPeriod: true, linked: 'obsolete-period' });
    const evaluations = f.records.evaluaciones_materia;
    f.records.evaluaciones_materia = [];
    const beforePeriod = await f.read();
    assert.deepEqual(plain(beforePeriod.alumnos[0].calificacionesMaterias), {});
    assert.equal(beforePeriod.alumnos[0].trabajoEnElAula[4], '');
    f.records.periodos.push({ id: 'period', ciclo_id: 'cycle', numero_periodo: periodNumber });
    const beforeGrades = await f.read();
    assert.deepEqual(plain(beforeGrades.alumnos[0].calificacionesMaterias), {});
    assert.equal(beforeGrades.alumnos[0].trabajoEnElAula[4], '');
    f.records.evaluaciones_materia = evaluations;
    const afterGrades = await f.read();
    assert.equal(afterGrades.alumnos[0].calificacionesMaterias.language, 'AL-7');
    assert.equal(afterGrades.alumnos[0].trabajoEnElAula[4], 'AV9');
    assert.equal(afterGrades.alumnos[0].asistencias, beforePeriod.alumnos[0].asistencias);
    assert.equal(f.records.meses_calendario[0].periodo_boletin_id, 'obsolete-period');
    assert.equal(f.calls.some(call => ['create', 'update', 'delete'].includes(call.operation)), false);
  }
});

const calendarCalculations = loadSource('utils/calendarioCalculos.ts');

test('Días hábiles: lunes a viernes, exclusiones únicas, fines de semana y año bisiesto', () => {
  const calculate = calendarCalculations.calcularDiasHabilesYAcumulado;
  assert.equal(calculate(2026, 5, [], []).habiles, 21);
  assert.equal(calculate(2026, 5, [1, 11, 11, 2, 3], []).habiles, 19);
  assert.equal(calculate(2024, 2, [], []).habiles, 21);
  assert.equal(calculate(2024, 2, [29], []).habiles, 20);
});

test('El acumulado incluye el mes actual y solo meses anteriores desde febrero; advierte huecos', () => {
  const calculate = calendarCalculations.calcularDiasHabilesYAcumulado;
  const incomplete = calculate(2026, 5, [1], [{mes: 1, total_dias_habiles: 22}, {mes: 3, total_dias_habiles: 21}, {mes: 5, total_dias_habiles: 99}, {mes: 6, total_dias_habiles: 22}]);
  assert.equal(incomplete.acumulado, 41);
  assert.deepEqual(plain(incomplete.mesesPendientes), [2, 4]);
  const complete = calculate(2026, 5, [1], [{mes:2,total_dias_habiles:3},{mes:3,total_dias_habiles:21},{mes:4,total_dias_habiles:21}]);
  assert.equal(complete.acumulado, 65);
  assert.deepEqual(plain(complete.mesesPendientes), []);
  assert.equal(calculate(2026, 3, [], []).acumulado, 22);
  assert.deepEqual(plain(calculate(2026, 3, [], []).mesesPendientes), [2]);
  assert.deepEqual(plain(calculate(2026, 2, [], []).mesesPendientes), []);
});

test('Sin clases excluye presencias, ausencias, tardanzas y observaciones del registro', async () => {
  const f = fixture();
  const before = await f.read();
  f.records.eventos_calendario.push({ id: 'no-class', dia: 4, tipo: 'SIN_CLASES', texto_celda_vertical: 'No imprimir', descripcion_observaciones: 'No imprimir' });
  const after = await f.read();
  assert.equal(after.alumnos[0].asistencias, before.alumnos[0].asistencias - 1);
  assert.equal(after.alumnos[0].llegadasTarde, 0);
  assert.equal(after.alumnos[0].marcasPorDia[4], '');
  assert.equal(after.observacionesDelMes.some(item => item.includes('No imprimir')), false);
});

test('Fecha de inicio de clases filtra altas de inicio de ciclo en febrero y computa inscriptos 1er día', async () => {
  const f = fixture({ month: 2, fechaInicioClases: '2026-02-25' });
  f.records.meses_calendario[0].mes = 2;
  f.records.inscripciones = [
    { id: 'standard', estado: 'Regular', fecha_ingreso: '2026-02-25', numero_orden: 1, expand: { alumno_id: { id: 's1', apellidos: 'Pérez', nombres: 'Juan', sexo: 'Masculino', fecha_nacimiento: '2018-08-10', nacionalidad: 'Argentina' } } },
    { id: 'late', estado: 'Regular', fecha_ingreso: '2026-02-27', numero_orden: 2, expand: { alumno_id: { id: 's2', apellidos: 'Gómez', nombres: 'María', sexo: 'Femenino', fecha_nacimiento: '2018-08-10', nacionalidad: 'Argentina' } } },
  ];
  const record = await f.read();
  const standard = record.alumnos.find(a => a.inscripcionId === 'standard');
  const late = record.alumnos.find(a => a.inscripcionId === 'late');
  assert.equal(standard.observacion, '');
  assert.equal(late.observacion, 'ALTA 27/2');
  assert.equal(record.observacionesDelMes.some(obs => obs.includes('Pérez')), false);
  assert.equal(record.observacionesDelMes.some(obs => obs.includes('27. Alta : Gómez, María')), true);
  assert.equal(record.inscripcion.inscriptosPrimerDia.t, 1);
  assert.equal(record.inscripcion.entradosPosteriormente.total.t, 1);
});

test('Las altas tardías no integran la nómina en meses previos a su incorporación y se incorporan en su mes de ingreso', async () => {
  const fFeb = fixture({ month: 2 });
  fFeb.records.meses_calendario[0].mes = 2;
  fFeb.records.inscripciones = [
    { id: 'standard', estado: 'Regular', fecha_ingreso: '2026-02-25', numero_orden: 1, expand: { alumno_id: { id: 's1', apellidos: 'Pérez', nombres: 'Juan', sexo: 'Masculino', fecha_nacimiento: '2018-08-10', nacionalidad: 'Argentina' } } },
    { id: 'mayEntry', estado: 'Regular', fecha_ingreso: '2026-05-04', numero_orden: 2, expand: { alumno_id: { id: 's2', apellidos: 'Vázquez', nombres: 'Clara', sexo: 'Femenino', fecha_nacimiento: '2018-08-10', nacionalidad: 'Argentina' } } },
  ];
  const febRecord = await fFeb.read();
  assert.equal(febRecord.alumnos.length, 1);
  assert.equal(febRecord.alumnos[0].inscripcionId, 'standard');

  const fMay = fixture({ month: 5 });
  fMay.records.inscripciones = fFeb.records.inscripciones;
  const mayRecord = await fMay.read();
  assert.equal(mayRecord.alumnos.length, 2);
  assert.equal(mayRecord.alumnos[1].inscripcionId, 'mayEntry');
  assert.equal(mayRecord.alumnos[1].observacion, 'ALTA 4/5');
});

test('Las calificaciones curriculares y criterios solo se proyectan para alumnos con visado directivo vigente', async () => {
  const f = fixture({ month: 5, periodNumber: 1 });
  f.records.visados_boletin = [];
  const noApproval = await f.read();
  const regularNoApproval = noApproval.alumnos.find(a => a.inscripcionId === 'regular');
  assert.equal(regularNoApproval.visado, false);
  assert.deepEqual(plain(regularNoApproval.calificacionesMaterias), {});
  assert.equal(regularNoApproval.trabajoEnElAula[4], '');
  assert.equal(noApproval.resumenVisado.alumnosVisados, 0);
  assert.equal(noApproval.resumenVisado.completo, false);

  f.records.visados_boletin = [{ id: 'app', instancia_id: 'workflow', inscripcion_id: 'regular', estado: 'VISADO', revision_contenido: 1, revision_visada: 1 }];
  const withApproval = await f.read();
  const regularApproved = withApproval.alumnos.find(a => a.inscripcionId === 'regular');
  assert.equal(regularApproved.visado, true);
  assert.equal(regularApproved.calificacionesMaterias.language, 'AL-7');
  assert.equal(regularApproved.trabajoEnElAula[4], 'AV9');
  assert.equal(withApproval.resumenVisado.alumnosVisados, 1);
});

test('El visado desfasado por modificación posterior (revision_visada !== revision_contenido) no proyecta notas', async () => {
  const f = fixture({ month: 5, periodNumber: 1 });
  f.records.visados_boletin = [{ id: 'app', instancia_id: 'workflow', inscripcion_id: 'regular', estado: 'VISADO', revision_contenido: 2, revision_visada: 1 }];
  const record = await f.read();
  const regular = record.alumnos.find(a => a.inscripcionId === 'regular');
  assert.equal(regular.visado, false);
  assert.deepEqual(plain(regular.calificacionesMaterias), {});
});

