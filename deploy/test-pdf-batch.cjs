const { test } = require('node:test');
const assert = require('node:assert/strict');
const { unzipSync } = require('fflate');

test('Armado de ZIP en memoria: sanitización, colisiones Unicode/case, integridad y rechazo 422', async () => {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    const { sanitizePdfFilename, buildInMemoryPdfZip } = await vite.ssrLoadModule('/src/shared/pdf/pdfZipBuilder.ts');
    const { PdfGenerationError } = await vite.ssrLoadModule('/src/shared/pdf/pdfError.ts');

    const rawName = 'Niño/Álvarez: *Año* <2026>? "Prueba" | 1°';
    const sanitized = sanitizePdfFilename(rawName);
    assert.equal(sanitized, 'Niño_Álvarez_ _Año_ _2026__ _Prueba_ _ 1°');
    assert.equal(sanitized.includes('ñ'), true);
    assert.equal(sanitized.includes('Á'), true);
    assert.equal(sanitized.includes('/'), false);
    assert.equal(sanitized.includes(':'), false);
    assert.equal(sanitized.includes('*'), false);
    assert.equal(sanitized.includes('<'), false);
    assert.equal(sanitized.includes('>'), false);
    assert.equal(sanitized.includes('?'), false);
    assert.equal(sanitized.includes('"'), false);
    assert.equal(sanitized.includes('|'), false);

    assert.throws(
      () => buildInMemoryPdfZip([]),
      (err) => err instanceof PdfGenerationError && err.status === 422
    );

    assert.throws(
      () => buildInMemoryPdfZip([
        { baseFilename: 'test.pdf', bytes: new Uint8Array(0) }
      ]),
      (err) => err instanceof PdfGenerationError && err.status === 422
    );

    const pdfA = new Uint8Array([37, 80, 68, 70, 45, 65]);
    const pdfB = new Uint8Array([37, 80, 68, 70, 45, 66]);

    const entry1 = {
      baseFilename: 'Prueba/Álvarez, Ana - BOLETIN 1 BIMESTRE.pdf',
      bytes: pdfA,
    };
    const entry2 = {
      baseFilename: 'prueba/álvarez, ana - BOLETIN 1 BIMESTRE.pdf'.normalize('NFD'),
      bytes: pdfB,
    };

    const zipBlob = buildInMemoryPdfZip([entry1, entry2]);
    assert.equal(zipBlob.type, 'application/zip');
    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());
    const unzipped = unzipSync(zipBytes);
    const filenames = Object.keys(unzipped);

    assert.equal(filenames.length, 2);
    assert.equal(filenames[0], 'Prueba_Álvarez, Ana - BOLETIN 1 BIMESTRE.pdf');
    assert.match(filenames[1], /\(2\)\.pdf$/);
    assert.deepEqual(unzipped[filenames[0]], pdfA);
    assert.deepEqual(unzipped[filenames[1]], pdfB);
  } finally {
    await vite.close();
  }
});
