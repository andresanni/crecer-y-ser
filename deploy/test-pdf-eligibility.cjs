const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({ module: { exports: {} }, BadRequestError: Error });
vm.runInContext(readFileSync(resolve(__dirname, '../pb_hooks/lib/teacherAccess.js'), 'utf8'), context);
const evaluate = vm.runInContext('evaluatePdfEligibility', context);
const record = data => ({ getId: () => data.id, getString: key => data[key] || '', getInt: key => data[key] || 0 });

function fixture() {
  const periods = [1, 2, 3, 4].map(n => ({ id: `period${n}`, ciclo_id: 'year', numero_periodo: n }));
  const workflows = periods.map(p => ({ id: `flow${p.numero_periodo}`, curso_id: 'course', periodo_id: p.id, estado: 'CONTROL_DIRECTIVO' }));
  const approvals = workflows.map(w => ({ id: `approval${w.id}`, instancia_id: w.id, inscripcion_id: 'student', estado: 'VISADO', revision_contenido: 3, revision_visada: 3, generacion_visado: 5 }));
  const dao = { findRecordsByFilter: (collection, filter, sort, limit, offset, params) => {
    if (collection === 'periodos') return periods.filter(p => p.ciclo_id === params.cycle).map(record);
    if (collection === 'instancias_carga_boletin') return workflows.filter(w => w.curso_id === params.course && w.periodo_id === params.period).map(record);
    return approvals.filter(a => a.instancia_id === params.workflow && a.inscripcion_id === params.enrollment).map(record);
  } };
  return { periods, workflows, approvals, run: n => evaluate(dao, record({ id: 'student', curso_id: 'course', ciclo_id: 'year' }), record(periods[n - 1])) };
}

test('El corte incluye sólo las dependencias anteriores y actuales', () => {
  const f = fixture();
  f.approvals[2].estado = 'PENDIENTE_REVISION';
  const result = f.run(2);
  assert.equal(result.elegiblePorVisados, true);
  assert.equal(result.dependencias.length, 2);
  assert.equal(result.dependencias[0].generacionVisado, 5);
  assert.equal(f.run(3).elegiblePorVisados, false);
});

test('Retirar primero bloquea emisiones posteriores sin retirar sus visados', () => {
  const f = fixture();
  f.approvals[0].estado = 'PENDIENTE_REVISION';
  assert.equal(f.run(2).elegiblePorVisados, false);
  assert.equal(f.run(4).motivos.length, 1);
  assert.equal(f.approvals[1].estado, 'VISADO');
  f.approvals[0].estado = 'VISADO';
  f.approvals[0].generacion_visado = 7;
  assert.equal(f.run(2).dependencias[0].generacionVisado, 7);
});

test('Contenido modificado y autorización ausente bloquean la elegibilidad', () => {
  const f = fixture();
  f.approvals[0].revision_contenido++;
  assert.equal(f.run(1).elegiblePorVisados, false);
  f.approvals[0].revision_visada++;
  f.approvals[0].generacion_visado = 0;
  assert.equal(f.run(1).elegiblePorVisados, false);
});

test('No se omiten períodos duplicados, entregas ni alumnos faltantes', () => {
  const f = fixture();
  f.periods.push({ ...f.periods[0], id: 'duplicate' });
  assert.equal(f.run(2).elegiblePorVisados, false);
  f.periods.pop();
  f.workflows[0].estado = 'BORRADOR_DOCENTE';
  assert.equal(f.run(2).elegiblePorVisados, false);
  f.workflows[0].estado = 'CONTROL_DIRECTIVO';
  f.approvals[0].inscripcion_id = 'other';
  assert.equal(f.run(2).elegiblePorVisados, false);
});

test('El período de otro ciclo y los cortes fuera de rango se rechazan', () => {
  const f = fixture();
  f.periods[0].ciclo_id = 'otherYear';
  assert.throws(() => f.run(1));
  f.periods[0].ciclo_id = 'year';
  f.periods[0].numero_periodo = 5;
  assert.throws(() => f.run(1));
});
