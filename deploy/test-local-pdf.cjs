const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { PDFDocument } = require('pdf-lib');

test('Generación local: autenticación, origen, huella y cambio durante render', async () => {
  const materias = Array.from({ length: 10 }, (_, m) => ({ id: `m${m}`, materiaNombre: `Materia ${m}`, ordenVisual: m, formativa: m < 2, criterios: Array.from({ length: 5 }, (_, c) => ({ id: `c${m}-${c}`, texto: `Concepto de prueba ${c}`, orden: c })) }));
  const snapshot = { huella: 'a'.repeat(64), datos: {
    versionContrato: 1, curso: { nombre: '1°' }, ciclo: { ano: 2026 }, bimestreCorte: 1,
    alumno: { apellidos: 'Prueba', nombres: 'Estudiante', dni: '00000000' }, responsable: { apellidos: 'Prueba', nombres: 'Tutor' }, materias,
    escala: [{ id: 'nota', etiqueta: 'Destacado', pesoNumerico: 6 }], dependencias: [{ bimestre: 1, vigente: true }],
    periodos: [{ bimestre: 1, evaluaciones: materias.map(m => ({ cursoMateriaId: m.id, ppi: false, calificacionGeneralId: m.formativa ? null : 'nota', criterios: m.criterios.map(c => ({ criterioId: c.id, valorEscalaId: 'nota' })) })), cierre: { asistencias: 0, inasistencias: 0, llegadasTarde: 0, observaciones: '' } }],
    apoyos: { poseeApoyos: 'NO', cualesApoyos: '', promocionoConAcompanamiento: null },
  } };
  let reads = 0;
  let changeDuringRender = false;
  let rejectVisado = false;
  const backend = http.createServer((req, res) => {
    assert.equal(req.headers.authorization, 'sesion-sintetica');
    reads++;
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = rejectVisado ? 422 : 200;
    res.end(JSON.stringify(rejectVisado ? { message: 'Falta visado' } : { ...snapshot, huella: changeDuringRender && reads > 1 ? 'b'.repeat(64) : snapshot.huella }));
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const context = vm.createContext({ exports: {}, require, URL, fetch, AbortSignal, Buffer });
  vm.runInContext(ts.transpileModule(fs.readFileSync('scripts/local-pdf-plugin.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText, context);
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  const vite = await createServer({ configFile: false, plugins: [react(), context.exports.localPdfPlugin(`http://127.0.0.1:${backend.address().port}`)], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  try {
    await vite.listen();
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    const input = { inscripcionId: 'a'.repeat(15), periodoId: 'b'.repeat(15), huella: snapshot.huella };
    const call = (headers = {}, data = input) => fetch(`${origin}/__cys/pdf-prueba`, { method: 'POST', headers: { Origin: origin, Authorization: 'sesion-sintetica', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) });
    assert.equal((await call({ Authorization: '' })).status, 401);
    assert.equal((await call({ Origin: 'https://example.org' })).status, 403);
    assert.equal((await call({}, { ...input, huella: 'c'.repeat(64) })).status, 409);
    rejectVisado = true;
    assert.equal((await call()).status, 422);
    rejectVisado = false;
    reads = 0;
    const good = await call();
    assert.equal(good.status, 200, await good.clone().text());
    assert.equal(good.headers.get('cache-control'), 'no-store');
    assert.equal((await PDFDocument.load(await good.arrayBuffer())).getPageCount(), 13);
    assert.equal(reads, 2);
    reads = 0;
    changeDuringRender = true;
    assert.equal((await call()).status, 409);
    changeDuringRender = false;
    snapshot.datos.curso.nombre = '4°';
    assert.equal((await call()).status, 422);
  } finally {
    await vite.close();
    await new Promise(resolve => backend.close(resolve));
  }
});
