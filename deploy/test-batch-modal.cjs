const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

test('Modal PDF: inicio automático único, cancelación, reapertura y estados iniciales', async () => {
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  const entry = 'virtual:batch-modal-test';
  const plugin = {
    name: 'batch-modal-test',
    resolveId(id) { if (id === '/__batch-test') return entry; },
    load(id) {
      if (id !== entry) return;
      return `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import BatchDocumentModal from '/src/modules/boletines/components/BatchDocumentModal.tsx';
window.batchStats = { reviews: 0, pdfs: 0, aborted: 0 };
window.batchSettings = { delay: 150, empty: false, fail: false, busy: false };
function TestApp() {
 const [open, setOpen] = useState(true);
 return React.createElement(React.Fragment, null,
  React.createElement('button', { onClick: () => setOpen(true) }, 'Abrir'),
  open && React.createElement(BatchDocumentModal, { cursoId: 'curso', periodoId: 'periodo', cursoNombre: '1°', onClose: () => setOpen(false) }));
}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(TestApp)));`;
    },
    transform(code, id) {
      if (id.endsWith('/services/gradebookDataSource.service.ts')) return `export async function getStaffGradebookReview(curso, periodo, signal) {
window.batchStats.reviews++;
await new Promise((resolve, reject) => {
 const onAbort = () => { clearTimeout(timer); window.batchStats.aborted++; reject(new DOMException('Cancelado', 'AbortError')); };
 const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, window.batchSettings.delay);
 signal.addEventListener('abort', onAbort, { once: true });
});
if (window.batchSettings.fail) throw Error('No se pudo consultar el curso.');
return { alumnosSinIncorporar: 0, boletines: window.batchSettings.empty ? [] : [
 { inscripcionId: 'a', nombreCompleto: 'Alumno A', elegibilidadPdf: { elegiblePorVisados: true } },
 { inscripcionId: 'b', nombreCompleto: 'Alumno B', elegibilidadPdf: { elegiblePorVisados: false, motivos: ['Falta visar el bimestre 1.'] } }
] };
}`;
      if (id.endsWith('/services/documentSnapshot.service.ts')) return `export class DocumentPdfError extends Error { constructor(message, status) { super(message); this.status = status; } }
export async function getDocumentSnapshot() { return { huella: 'huella' }; }
export async function downloadDocumentProof() {
 window.batchStats.pdfs++;
 if (window.batchSettings.busy) throw new DocumentPdfError('Hay otro PDF en preparación.', 429);
 return { emissionId: 'emision', result: 'reused' };
}
export async function downloadDocumentBatch() { throw Error('No debe descargarse automáticamente'); }`;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/batch-test.html') return next();
        res.setHeader('Content-Type', 'text/html');
        res.end(await server.transformIndexHtml('/batch-test.html', '<div id="root"></div><script type="module" src="/__batch-test"></script>'));
      });
    },
  };
  const vite = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/test-batch-modal', plugins: [plugin, react()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  let browser;
  try {
    await vite.listen();
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage();
    page.on('pageerror', error => process.stderr.write(error.message + '\n'));
    await page.goto('http://127.0.0.1:' + vite.httpServer.address().port + '/batch-test.html');
    await page.getByRole('button', { name: 'Descargar PDFs (1)', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Descargar PDFs (1)', exact: true }).isEnabled(), true);
    assert.equal(await page.getByText('PDF listo', { exact: true }).count(), 1);
    assert.equal(await page.getByText('Falta visar', { exact: true }).count(), 1);
    assert.equal(await page.getByRole('columnheader', { name: 'Detalle', exact: true }).count(), 0);
    assert.equal(await page.getByText('Ya estaba generado', { exact: true }).count(), 0);
    assert.equal(await page.getByText('1 PDFs listos para descargar.', { exact: true }).count(), 1);
    assert.equal(await page.evaluate(() => window.batchStats.reviews), 1);
    assert.equal(await page.evaluate(() => window.batchStats.pdfs), 1);
    assert.equal(await page.getByText('Obtener PDFs del curso', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    assert.equal(await page.evaluate(() => window.batchStats.aborted), 0);
    await page.evaluate(() => { window.batchSettings.delay = 3000; });
    await page.getByRole('button', { name: 'Abrir', exact: true }).click();
    await page.getByText('Consultando boletines…', { exact: true }).waitFor();
    await page.waitForFunction(() => window.batchStats.reviews === 2);
    await page.getByRole('button', { name: 'Interrumpir y cerrar', exact: true }).click();
    await page.waitForFunction(() => window.batchStats.aborted > 0);
    assert.equal(await page.evaluate(() => window.batchStats.pdfs), 1);
    await page.evaluate(() => { window.batchSettings.delay = 50; window.batchSettings.busy = true; });
    await page.getByRole('button', { name: 'Abrir', exact: true }).click();
    await page.getByText('El servicio está terminando otro PDF. Esperá unos segundos y seleccioná Actualizar PDFs del curso.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Actualizar PDFs del curso', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Descargar PDFs (0)', exact: true }).isEnabled(), false);
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.evaluate(() => { window.batchSettings.empty = true; window.batchSettings.busy = false; });
    await page.getByRole('button', { name: 'Abrir', exact: true }).click();
    await page.getByText('No hay boletines en este curso.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.evaluate(() => { window.batchSettings.fail = true; });
    await page.getByRole('button', { name: 'Abrir', exact: true }).click();
    await page.getByText('No se pudo consultar el curso.', { exact: true }).first().waitFor();
    assert.equal(await page.evaluate(() => window.batchStats.reviews), 5);
  } finally {
    await browser?.close();
    await vite.close();
  }
});
