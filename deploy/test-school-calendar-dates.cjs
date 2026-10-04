const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const dayjs = require('dayjs');

function loadAdapter(file, name) {
  const source = readFileSync(path.resolve(__dirname, '../src', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  const context = vm.createContext({ exports: {} });
  vm.runInContext(code, context);
  return context.exports[name];
}

test('Las fechas escolares conservan su día en Buenos Aires al mostrarse y volver a guardarse', () => {
  const previousZone = process.env.TZ;
  process.env.TZ = 'America/Argentina/Buenos_Aires';
  try {
    const alumnoAdapter = loadAdapter('modules/alumnos/models/alumno.model.ts', 'alumnoAdapter');
    const inscripcionAdapter = loadAdapter('modules/inscripciones/models/inscripcion.model.ts', 'inscripcionAdapter');
    const timestamp = '2026-04-13 00:00:00.000Z';
    const enrollment = { fecha_ingreso: timestamp, fecha_egreso: timestamp, fecha_inscripcion: timestamp, estado: 'Baja' };
    const student = alumnoAdapter({ fecha_nacimiento: timestamp, expand: { inscripciones_via_alumno_id: [enrollment] } });
    const adaptedEnrollment = inscripcionAdapter(enrollment);
    for (const value of [student.fechaNacimiento, student.fechaIngreso, student.fechaEgreso, adaptedEnrollment.fechaInscripcion, adaptedEnrollment.fechaIngreso, adaptedEnrollment.fechaEgreso]) {
      assert.equal(dayjs(value).format('DD/MM/YYYY'), '13/04/2026');
      assert.equal(dayjs(value).format('YYYY-MM-DD'), '2026-04-13');
    }
    assert.equal(student.createdAt, undefined);
    assert.equal(inscripcionAdapter({}).fechaEgreso, '');
    assert.equal(alumnoAdapter({}).fechaEgreso, undefined);
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});
