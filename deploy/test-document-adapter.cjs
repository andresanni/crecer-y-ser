const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const dir = path.resolve(__dirname, '../src/modules/boletines/documentos');
const code = ts.transpileModule(readFileSync(path.join(dir, 'documentSnapshot.adapter.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
const context = vm.createContext({ exports: {} });
vm.runInContext(code, context);
const adapt = context.exports.adaptarInstantaneaDocumental;
const institution = { nivel: 'Primaria', cue: 'Prueba', denominacion: 'Prueba', distrito: 'Prueba' };

function fixture() {
  const materias = Array.from({ length: 10 }, (_, m) => ({ id: `m${m}`, materiaNombre: `Materia ${m}`, ordenVisual: m, formativa: m < 2, criterios: Array.from({ length: 5 }, (_, c) => ({ id: `c${m}-${c}`, texto: `Consigna ${c}`, orden: c })) }));
  return { huella: 'prueba', datos: {
    versionContrato: 1, curso: { nombre: '1°' }, ciclo: { ano: 2026 }, bimestreCorte: 1,
    alumno: { apellidos: 'Prueba', nombres: 'Ejemplo', dni: '00000000' }, responsable: { apellidos: 'Prueba', nombres: 'Tutor' },
    materias, escala: [{ id: 'nota', etiqueta: 'Destacado', pesoNumerico: 6 }],
    dependencias: [{ bimestre: 1, vigente: true }],
    periodos: [{ bimestre: 1, evaluaciones: materias.map(m => ({ cursoMateriaId: m.id, ppi: false, calificacionGeneralId: m.formativa ? null : 'nota', criterios: m.criterios.map(c => ({ criterioId: c.id, valorEscalaId: 'nota' })) })), cierre: { asistencias: 0, inasistencias: 0, llegadasTarde: 0, observaciones: '' } }],
    apoyos: { poseeApoyos: 'NO', cualesApoyos: '', promocionoConAcompanamiento: null },
  } };
}

test('Primer ciclo conserva cero, observación vacía y futuro sin usar peso como número', () => {
  const result = adapt(fixture(), institution);
  assert.equal(result.bloqueos.length, 0);
  assert.equal(result.documento.cierres[0].asistencias.texto, '0');
  assert.equal(result.documento.cierres[0].observaciones.texto, '');
  assert.equal(result.documento.cierres[1].asistencias.estado, 'futuro');
  const nota = result.documento.materiasAcademicas[0].criterios[0].bimestres[0];
  assert.equal(nota.concepto, 'destacado');
  assert.equal(nota.numero, undefined);
});

test('Segundo ciclo bloquea sin inventar notas numéricas', () => {
  const f = fixture(); f.datos.curso.nombre = '4°';
  assert.equal(adapt(f, institution).documento, null);
});

test('Apoyos de inscripción se conservan desde primero; promoción sólo se muestra en cuarto', () => {
  for (const bimestre of [1, 2, 3, 4]) {
    const f = fixture();
    f.datos.bimestreCorte = bimestre;
    const primero = f.datos.periodos[0];
    f.datos.periodos = Array.from({ length: bimestre }, (_, index) => ({ ...primero, bimestre: index + 1 }));
    f.datos.dependencias = Array.from({ length: bimestre }, (_, index) => ({ bimestre: index + 1, vigente: true }));
    f.datos.apoyos = { poseeApoyos: 'SI', cualesApoyos: 'Apoyo de prueba', promocionoConAcompanamiento: 'SI' };
    const result = adapt(f, institution);
    assert.equal(result.bloqueos.length, 0);
    assert.equal(result.documento.integracion.poseeApoyos.texto, 'SÍ');
    assert.equal(result.documento.integracion.cualesApoyos.texto, 'Apoyo de prueba');
    assert.equal(result.documento.integracion.promocionoConAcompanamiento.estado, bimestre === 4 ? 'confirmado' : 'futuro');
    if (bimestre === 4) assert.equal(result.documento.integracion.promocionoConAcompanamiento.texto, 'SÍ');
  }
});

test('Sin apoyos no exige detalle; un valor ausente no se convierte en NO', () => {
  const f = fixture();
  f.datos.apoyos.cualesApoyos = 'Detalle residual';
  let result = adapt(f, institution);
  assert.equal(result.documento.integracion.poseeApoyos.texto, 'NO');
  assert.equal(result.documento.integracion.cualesApoyos.texto, '---');
  f.datos.apoyos.poseeApoyos = '-';
  result = adapt(f, institution);
  assert.equal(result.documento.integracion.poseeApoyos.estado, 'sinDato');
  assert.equal(result.documento.integracion.cualesApoyos.estado, 'sinDato');
  f.datos.apoyos.poseeApoyos = 'SI';
  f.datos.apoyos.cualesApoyos = '';
  assert.equal(adapt(f, institution).documento.integracion.cualesApoyos.estado, 'sinDato');
});

test('Nota ausente, etiqueta desconocida y período futuro cargado bloquean', () => {
  const f = fixture(); f.datos.escala[0].etiqueta = 'Desconocida';
  assert.equal(adapt(f, institution).documento, null);
  const g = fixture(); g.datos.periodos[0].evaluaciones[2].criterios.pop();
  assert.equal(adapt(g, institution).documento, null);
  const h = fixture(); h.datos.periodos.push({ bimestre: 2, evaluaciones: [] });
  assert.equal(adapt(h, institution).documento, null);
});
