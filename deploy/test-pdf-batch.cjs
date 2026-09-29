const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { unzipSync } = require('fflate');

test('ZIP: alcance, duplicados, archivos íntegros e invalidación antes de entrega', async () => {
  const course = 'c'.repeat(15);
  const period = 'p'.repeat(15);
  const items = ['a', 'b'].map(char => ({ inscripcionId: char.repeat(15), emisionId: char.repeat(15), huella: char.repeat(64) }));
  let downloads = 0;
  let revoked = false;
  let wrongCourse = false;
  const backend = http.createServer((req, res) => {
    assert.equal(req.headers.authorization, 'session');
    const item = items.find(value => req.url.includes(value.inscripcionId));
    res.setHeader('Content-Type', 'application/json');
    if (!item) { res.statusCode = 404; res.end('{}'); return; }
    if (req.url.includes('/instantanea')) {
      res.end(JSON.stringify({ huella: revoked && downloads === 2 ? 'f'.repeat(64) : item.huella, datos: { curso: { id: wrongCourse ? 'x'.repeat(15) : course, nombre: '1°' }, ciclo: { ano: 2026 }, bimestreCorte: 1, alumno: { apellidos: 'Prueba/Álvarez', nombres: 'Ana' } } }));
    } else if (req.url.includes('/archivo')) {
      downloads++;
      res.setHeader('Content-Type', 'application/pdf');
      res.end(`%PDF-${item.inscripcionId}`);
    } else res.end(JSON.stringify({ emision: { id: item.emisionId, huella: item.huella } }));
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const context = vm.createContext({ exports: {}, require, URL, fetch, AbortSignal, Buffer, Uint8Array });
  vm.runInContext(ts.transpileModule(fs.readFileSync('scripts/local-pdf-plugin.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText, context);
  const { createServer } = await import('vite');
  const vite = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/test-pdf-batch', optimizeDeps: { noDiscovery: true, include: [] }, plugins: [context.exports.localPdfPlugin(`http://127.0.0.1:${backend.address().port}`, 'worker')], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  try {
    await vite.listen();
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    const input = { cursoId: course, periodoId: period, emisiones: items };
    const call = (data = input, headers = {}) => fetch(`${origin}/__cys/pdf-lote`, { method: 'POST', headers: { Origin: origin, Authorization: 'session', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) });
    assert.equal((await call(input, { Authorization: '' })).status, 401);
    assert.equal((await call(input, { Origin: 'https://example.org' })).status, 403);
    assert.equal((await call({ ...input, emisiones: [] })).status, 400);
    assert.equal((await call({ ...input, emisiones: [items[0], items[0]] })).status, 400);
    assert.equal((await call({ ...input, emisiones: [null] })).status, 400);
    const result = await call();
    assert.equal(result.status, 200, await result.clone().text());
    assert.equal(result.headers.get('content-type'), 'application/zip');
    assert.equal(result.headers.get('cache-control'), 'no-store');
    const files = unzipSync(new Uint8Array(await result.arrayBuffer()));
    const names = Object.keys(files);
    assert.equal(names.length, 2);
    assert.equal(names[0], 'Prueba_Álvarez, Ana - BOLETIN 1 BIMESTRE.pdf');
    assert.equal(names[1], 'Prueba_Álvarez, Ana - BOLETIN 1 BIMESTRE (2).pdf');
    assert.equal(Buffer.from(files[names[0]]).toString(), `%PDF-${items[0].inscripcionId}`);
    assert.equal(Buffer.from(files[names[1]]).toString(), `%PDF-${items[1].inscripcionId}`);
    downloads = 0;
    revoked = true;
    const changed = await call();
    assert.equal(changed.status, 409);
    assert.equal(changed.headers.get('content-type'), 'application/json');
    assert.equal(downloads, 2);
    revoked = false;
    wrongCourse = true;
    assert.equal((await call()).status, 409);
    wrongCourse = false;
    assert.equal((await call({ ...input, emisiones: [{ ...items[0], emisionId: 'z'.repeat(15) }] })).status, 409);
  } finally {
    await vite.close();
    await new Promise(resolve => backend.close(resolve));
  }
});
