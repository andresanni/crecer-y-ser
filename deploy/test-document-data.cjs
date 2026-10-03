const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ module: { exports: {} } });
vm.runInContext(readFileSync('pb_hooks/lib/teacherAccess.js', 'utf8'), context);
const validate = vm.runInContext('documentDataIssues', context);
const record = data => ({ getString: key => data[key] || '' });
const student = { apellidos: 'Prueba', nombres: 'Ejemplo', dni: '00000000' };
const guardian = { apellidos: 'Prueba', nombres: 'Tutor' };
const enrollment = { posee_apoyos: 'NO', cuales_apoyos: '', promociono_con_acompanamiento: '-' };
const issues = (changes = {}, cutoff = 1, identity = student, tutor = guardian) => validate(record(identity), tutor, record({ ...enrollment, ...changes }), cutoff);

test('NO permite emitir sin detalle y sin promoción antes de cuarto', () => {
  for (const cutoff of [1, 2, 3]) assert.equal(issues({}, cutoff).length, 0);
  assert.equal(issues({ promociono_con_acompanamiento: 'NO' }, 4).length, 0);
  assert.equal(issues({ cuales_apoyos: 'Detalle residual' }).length, 0);
});

test('Apoyos sin especificar bloquean todos los cortes; SI requiere detalle real', () => {
  for (const value of ['', ' ', '-', '---']) {
    for (const cutoff of [1, 2, 3, 4]) {
      assert.ok(issues({ posee_apoyos: value }, cutoff).some(item => item.campo === 'apoyos.poseeApoyos'));
    }
    const result = issues({ posee_apoyos: 'SI', cuales_apoyos: value });
    assert.equal(result.length, 1);
    assert.equal(result[0].campo, 'apoyos.cualesApoyos');
    assert.equal(result[0].bimestre, 1);
  }
  assert.equal(issues({ posee_apoyos: 'SI', cuales_apoyos: 'Apoyo sintético' }).length, 0);
});

test('Promoción con acompañamiento es obligatoria sólo en cuarto', () => {
  for (const value of ['', '-', ' ', 'OTRO']) {
    const result = issues({ promociono_con_acompanamiento: value }, 4);
    assert.equal(result.length, 1);
    assert.equal(result[0].campo, 'apoyos.promocionoConAcompanamiento');
    assert.equal(result[0].bimestre, 4);
  }
  assert.equal(issues({ promociono_con_acompanamiento: 'SI' }, 4).length, 0);
});

test('Cada identidad impresa es obligatoria y los faltantes se acumulan sin exponer valores', () => {
  for (const field of ['apellidos', 'nombres', 'dni']) {
    for (const value of ['', '  ', '-', '---']) {
      const result = issues({}, 1, { ...student, [field]: value });
      assert.equal(result.length, 1);
      assert.equal(result[0].campo, `alumno.${field}`);
      assert.equal(result[0].origen, 'alumno');
    }
  }
  for (const field of ['apellidos', 'nombres']) {
    assert.equal(issues({}, 1, student, { ...guardian, [field]: '' })[0].campo, `responsable.${field}`);
  }
  assert.equal(issues({ posee_apoyos: '-' }, 4, {}, {}).length, 7);
});

test('La instantánea rechaza faltantes antes de devolver una huella o leer notas', () => {
  const snapshotContext = vm.createContext({ module: { exports: {} } });
  vm.runInContext(readFileSync('pb_hooks/lib/teacherAccess.js', 'utf8'), snapshotContext);
  vm.runInContext(`
    requireRecord = (_, collection) => ({
      getId: () => collection,
      getString: key => collection === 'inscripciones' && key === 'posee_apoyos' ? '-' : 'Prueba',
      getInt: () => 1
    });
    requireStaffWorkflow = () => ({});
    requireApproval = () => ({});
    evaluatePdfEligibility = () => ({ elegiblePorVisados: true, dependencias: [] });
    courseMaterials = () => [];
    findByFilter = (_, collection) => collection === 'alumno_responable' ? [{ getString: () => 'tutor' }] : [];
    studentSnapshot = () => { throw new Error('No debe leer notas con datos faltantes'); };
  `, snapshotContext);
  const result = snapshotContext.module.exports.buildDocumentSnapshot({}, 'enrollment', 'period');
  assert.equal(result.status, 422);
  assert.equal(result.body.codigo, 'DATOS_DOCUMENTALES_INCOMPLETOS');
  assert.equal(result.body.faltantes[0].campo, 'apoyos.poseeApoyos');
  assert.equal(result.body.huella, undefined);
  assert.match(result.body.message, /primer bimestre/);
});

test('Un PDF guardado pierde acceso si la nueva instantánea tiene datos incompletos', () => {
  const data = { estado: 'DISPONIBLE', inscripcion_id: 'student', periodo_id: 'period', huella: 'old', instantanea: {} };
  const emission = { getString: key => data[key], set: (key, value) => { data[key] = value; } };
  const dao = { runInTransaction: callback => callback(dao), findRecordById: () => emission, saveRecord() {} };
  const pdfContext = vm.createContext({
    module: { exports: {} },
    $app: { dao: () => dao, newFilesystem: () => { throw new Error('No debe servir bytes'); } },
    require: () => ({ buildDocumentSnapshot: () => ({ status: 422, body: { codigo: 'DATOS_DOCUMENTALES_INCOMPLETOS' } }) }),
  });
  vm.runInContext(readFileSync('pb_hooks/lib/pdfEmissions.js', 'utf8'), pdfContext);
  const result = pdfContext.module.exports.download({
    response: () => ({ header: () => ({ set() {} }) }), pathParam: () => 'emission', json: (status, body) => ({ status, body }),
  });
  assert.equal(result.status, 409);
  assert.equal(data.estado, 'INVALIDADO');
  assert.equal(data.instantanea, null);
});
