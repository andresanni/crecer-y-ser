const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { PDFDocument } = require('pdf-lib');

test('Generación local: autenticación, vigencia, generación y reutilización', async () => {
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
  let stored = null;
  let publications = 0;
  let rejectWorker = false;
  let publishCreated = true;
  const backend = http.createServer(async (req, res) => {
    assert.equal(req.headers.authorization, 'sesion-sintetica');
    res.setHeader('Content-Type', 'application/json');
    if (req.url.includes('/archivo')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.end(stored.pdf);
      return;
    }
    if (req.url.includes('/emisiones')) {
      if (req.method === 'POST') {
        assert.equal(req.headers['x-cys-pdf-worker'], 'worker');
        if (rejectWorker) { res.statusCode = 403; res.end('{}'); return; }
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': req.headers['content-type'] } }).formData();
        stored = { id: 'e'.repeat(15), huella: form.get('huella'), pdf: Buffer.from(await form.get('archivo').arrayBuffer()) };
        publications++;
        res.end(JSON.stringify({ id: stored.id, created: publishCreated }));
      } else res.end(JSON.stringify({ emision: stored ? { id: stored.id, huella: stored.huella } : null }));
      return;
    }
    reads++;
    res.statusCode = rejectVisado ? 422 : 200;
    res.end(JSON.stringify(rejectVisado ? { message: 'Falta visado' } : { ...snapshot, huella: changeDuringRender && reads > 1 ? 'b'.repeat(64) : snapshot.huella }));
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const context = vm.createContext({ exports: {}, require, URL, fetch, AbortSignal, Buffer, FormData, Blob, Uint8Array });
  vm.runInContext(ts.transpileModule(fs.readFileSync('scripts/local-pdf-plugin.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText, context);
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  const vite = await createServer({ configFile: false, plugins: [react(), context.exports.localPdfPlugin(`http://127.0.0.1:${backend.address().port}`, 'worker')], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
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
    assert.equal(good.headers.get('X-CYS-PDF-Result'), 'generated');
    const generatedBytes = Buffer.from(await good.arrayBuffer());
    assert.equal((await PDFDocument.load(generatedBytes)).getPageCount(), 13);
    assert.equal(reads, 2);
    assert.equal(publications, 1);
    reads = 0;
    const reused = await call();
    assert.equal(reused.status, 200);
    assert.equal(reused.headers.get('X-CYS-PDF-Result'), 'reused');
    assert.deepEqual(Buffer.from(await reused.arrayBuffer()), generatedBytes);
    assert.equal(reads, 1);
    assert.equal(publications, 1);
    stored = null;
    reads = 0;
    changeDuringRender = true;
    assert.equal((await call()).status, 409);
    changeDuringRender = false;
    snapshot.datos.curso.nombre = '4°';
    assert.equal((await call()).status, 422);
    snapshot.datos.materias.push({ ...materias[9], id: 'extra' });
    snapshot.datos.periodos[0].evaluaciones.push({ ...snapshot.datos.periodos[0].evaluaciones[9], cursoMateriaId: 'extra' });
    snapshot.datos.escala[0].etiqueta = 'Destacado 10';
    reads = 0;
    const secondCycle = await call();
    assert.equal(secondCycle.status, 200, await secondCycle.clone().text());
    assert.equal((await PDFDocument.load(await secondCycle.arrayBuffer())).getPageCount(), 14);
    assert.equal(reads, 2);
    assert.equal(secondCycle.headers.get('X-CYS-PDF-Result'), 'generated');
    stored = null;
    publishCreated = false;
    const deduplicated = await call();
    assert.equal(deduplicated.status, 200);
    assert.equal(deduplicated.headers.get('X-CYS-PDF-Result'), 'reused');
    await deduplicated.arrayBuffer();
    stored = null;
    rejectWorker = true;
    const forbidden = await call();
    assert.equal(forbidden.status, 403);
    const failureMessage = (await forbidden.json()).message;
    assert.match(failureMessage, /servicio no está disponible/);
    assert.doesNotMatch(failureMessage, /PocketBase|clave privada|reiniciá/);
  } finally {
    await vite.close();
    await new Promise(resolve => backend.close(resolve));
  }
});
