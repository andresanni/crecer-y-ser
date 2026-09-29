const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('Invalidar un bimestre revoca sólo ese corte y posteriores del alumno', () => {
  const rows = [1, 2, 3, 4].map(corte => ({ id: 'alumno', corte, estado: 'DISPONIBLE', instantanea: { dato: true }, dependencias: ['auditoria'], archivo: 'protegido.pdf' }));
  rows.push({ id: 'otro', corte: 4, estado: 'DISPONIBLE', instantanea: { dato: true } });
  const saved = [];
  const dao = {
    findRecordsByFilter: (_, filter, sort, limit, offset, params) => rows.filter(r => r.id === params.id && r.corte >= params.cutoff && r.estado === 'DISPONIBLE').map(r => ({ set: (key, value) => { r[key] = value; }, row: r })),
    saveRecord: record => saved.push(record.row),
  };
  const context = vm.createContext({ module: { exports: {} } });
  vm.runInContext(fs.readFileSync('pb_hooks/lib/pdfEmissions.js', 'utf8'), context);
  context.module.exports.invalidate(dao, 'alumno', 2, 'Retiro');
  assert.equal(saved.length, 3);
  assert.equal(rows[0].estado, 'DISPONIBLE');
  assert.equal(rows[4].estado, 'DISPONIBLE');
  for (const row of rows.slice(1, 4)) {
    assert.equal(row.estado, 'INVALIDADO');
    assert.equal(row.instantanea, null);
    assert.deepEqual(row.dependencias, ['auditoria']);
    assert.equal(row.archivo, 'protegido.pdf');
  }
  context.module.exports.invalidate(dao, 'alumno', 2, 'Nuevo retiro');
  assert.equal(saved.length, 3);
});
