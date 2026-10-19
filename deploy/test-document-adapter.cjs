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

test('Segundo ciclo separa todas las notas explícitas y admite No corresponde sin número', () => {
  const labels = ['No Alcanzó Los Objetivos 1', 'No Alcanzó Los Objetivos 2', 'No Alcanzó Los Objetivos 3', 'En Proceso 4', 'En Proceso 5', 'Alcanzado 6', 'Alcanzado 7', 'Avanzado 8', 'Avanzado 9', 'Destacado 10', 'No Corresponde'];
  for (const grado of [4, 5, 6, 7]) {
    for (const [index, etiqueta] of labels.entries()) {
      const f = fixture();
      f.datos.curso.nombre = `${grado}°`;
      f.datos.materias.push({ ...f.datos.materias[9], id: 'extra' });
      f.datos.periodos[0].evaluaciones.push({ ...f.datos.periodos[0].evaluaciones[9], cursoMateriaId: 'extra' });
      f.datos.escala[0] = { id: 'nota', etiqueta, pesoNumerico: index === 10 ? 0 : 99 };
      const result = adapt(f, institution);
      assert.equal(result.bloqueos.length, 0, result.bloqueos.join(' '));
      assert.equal(result.documento.materiasAcademicas.length, 9);
      assert.equal(result.documento.materiasAcademicas[0].criterios[0].bimestres[0].numero, index < 10 ? index + 1 : undefined);
      if (index === 10) assert.equal(result.documento.materiasAcademicas[0].criterios[0].bimestres[0].concepto, 'noCorresponde');
    }
  }
});

test('Segundo ciclo rechaza números inválidos y referencias a la escala anterior', () => {
  for (const etiqueta of ['Alcanzado', 'Alcanzado 0', 'Alcanzado 11', 'Alcanzado 7.5', 'No corresponde 2', 'Otra nota 7']) {
    const f = fixture();
    f.datos.curso.nombre = '7°';
    f.datos.escala[0].etiqueta = etiqueta;
    assert.equal(adapt(f, institution).documento, null);
  }
});


test('Altas tardías distinguen historia anterior, corte y futuro sin inventar notas', () => {
  for (const desde of [2, 3, 4]) {
    const f = fixture();
    f.datos.cursada = { estado: 'CONFIRMADA', desde, hasta: 4, revision: 1 };
    f.datos.bimestreCorte = desde;
    f.datos.periodos[0].bimestre = desde;
    f.datos.dependencias[0].bimestre = desde;
    const result = adapt(f, institution);
    assert.equal(result.bloqueos.length, 0, result.bloqueos.join(' '));
    const materia = result.documento.materiasAcademicas[0];
    for (let i = 0; i < desde - 1; i++) {
      assert.equal(materia.criterios[0].bimestres[i].estado, 'anteriorIngreso');
      assert.equal(materia.calificacionGeneral[i].estado, 'anteriorIngreso');
      assert.equal(materia.ppi[i].estado, 'anteriorIngreso');
      assert.equal(result.documento.cierres[i].asistencias.estado, 'anteriorIngreso');
      assert.match(result.documento.cierres[i].observaciones.texto, /consta en legajo/);
    }
    assert.equal(materia.calificacionGeneral[desde - 1].estado, 'confirmado');
    if (desde < 4) assert.equal(materia.calificacionGeneral[desde].estado, 'futuro');
    f.datos.dependencias[0].vigente = false;
    assert.equal(adapt(f, institution).documento, null);
  }
});

test('La falta de historial requiere alcance confirmado y no permite excluir datos', () => {
  const f = fixture();
  f.datos.bimestreCorte = 2;
  f.datos.periodos[0].bimestre = 2;
  f.datos.dependencias[0].bimestre = 2;
  assert.equal(adapt(f, institution).documento, null);
  for (const cursada of [
    { estado: 'PENDIENTE', desde: 2, hasta: 4 },
    { estado: 'SIN_CURSADA', desde: 0, hasta: 0 },
    { estado: 'CONFIRMADA', desde: 3, hasta: 4 },
    { estado: 'CONFIRMADA', desde: 1, hasta: 1 },
    { estado: 'CONFIRMADA', desde: 0, hasta: 4 },
  ]) {
    f.datos.cursada = cursada;
    assert.equal(adapt(f, institution).documento, null);
  }
  f.datos.cursada = { estado: 'CONFIRMADA', desde: 2, hasta: 4 };
  f.datos.periodos.push({ ...f.datos.periodos[0], bimestre: 1 });
  assert.equal(adapt(f, institution).documento, null);
});

test('Registro administrativo mapea escuela inicial, fechas y cambios de escuela limpios', () => {
  const f = fixture();
  f.datos.administrativo = {
    escuelaInicial: 'Escuela N° 18 D.E 13',
    fechaIngresoInicial: '2026-02-25',
    fechaEgresoInicial: '2026-05-15',
    cambiosEscuela: [
      { fecha: '2026-05-18', causa: 'Motivos particulares', escuelaDestino: 'Colegio Crecer y Ser' }
    ],
    cambioDomicilio: '',
    domicilio: 'Calle Falsa 123',
    telefono: '1122334455',
  };
  const result = adapt(f, institution);
  assert.equal(result.bloqueos.length, 0);
  const admin = result.documento.registroAdministrativo;
  assert.equal(admin.escuelaInicial.texto, 'Escuela N° 18 D.E 13');
  assert.equal(admin.fechaIngreso.texto, '25/02/2026');
  assert.equal(admin.fechaEgreso.texto, '15/05/2026');
  assert.equal(admin.cambiosEscuela[0].fecha.texto, '18/05/2026');
  assert.equal(admin.cambiosEscuela[0].causa.texto, 'Motivos particulares');
  assert.equal(admin.cambiosEscuela[0].escuelaDestino.texto, 'Colegio Crecer y Ser');
  assert.equal(admin.cambiosEscuela[1].fecha.texto, '---');
  assert.equal(admin.cambiosEscuela[1].causa.texto, '---');
  assert.equal(admin.cambiosEscuela[1].escuelaDestino.texto, '---');
  assert.equal(admin.domicilio.texto, 'Calle Falsa 123');
  assert.equal(admin.telefono.texto, '1122334455');
  assert.equal(admin.cambioDomicilio.texto, '---');

  const regular = fixture();
  const regResult = adapt(regular, institution);
  assert.equal(regResult.documento.registroAdministrativo.escuelaInicial.texto, '---');
  assert.equal(regResult.documento.registroAdministrativo.fechaIngreso.texto, '---');
  assert.equal(regResult.documento.registroAdministrativo.fechaEgreso.texto, '---');
  assert.equal(regResult.documento.registroAdministrativo.cambiosEscuela[0].fecha.texto, '---');
  assert.equal(regResult.documento.registroAdministrativo.domicilio.texto, '---');
  assert.equal(regResult.documento.registroAdministrativo.telefono.texto, '---');
  assert.equal(regResult.documento.registroAdministrativo.cambioDomicilio.texto, '---');
});
