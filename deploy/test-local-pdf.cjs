const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { PDFDocument } = require('pdf-lib');

test('Generación local stateless: autenticación, vigencia, generación en caliente de boletín e informe', async () => {
  const materias = Array.from({ length: 10 }, (_, m) => ({
    id: `m${m}`,
    materiaNombre: `Materia ${m}`,
    ordenVisual: m,
    formativa: m < 2,
    criterios: Array.from({ length: 5 }, (_, c) => ({
      id: `c${m}-${c}`,
      texto: `Concepto de prueba ${c}`,
      orden: c,
    })),
  }));

  const snapshot1 = {
    huella: 'a'.repeat(64),
    datos: {
      versionContrato: 1,
      curso: { nombre: '1°' },
      ciclo: { ano: 2026 },
      bimestreCorte: 1,
      alumno: { apellidos: 'Prueba', nombres: 'Estudiante', dni: '00000000' },
      responsable: { apellidos: 'Prueba', nombres: 'Tutor' },
      materias,
      escala: [{ id: 'nota', etiqueta: 'Destacado', pesoNumerico: 6 }],
      dependencias: [{ bimestre: 1, vigente: true }],
      periodos: [
        {
          bimestre: 1,
          evaluaciones: materias.map((m) => ({
            cursoMateriaId: m.id,
            ppi: false,
            calificacionGeneralId: m.formativa ? null : 'nota',
            criterios: m.criterios.map((c) => ({ criterioId: c.id, valorEscalaId: 'nota' })),
          })),
          cierre: { asistencias: 0, inasistencias: 0, llegadasTarde: 0, observaciones: '' },
        },
      ],
      apoyos: { poseeApoyos: 'NO', cualesApoyos: '', promocionoConAcompanamiento: null },
    },
  };

  const materias2 = [...materias, { ...materias[9], id: 'mextra' }];
  const snapshot2 = {
    huella: '2'.repeat(64),
    datos: {
      ...snapshot1.datos,
      curso: { nombre: '4°' },
      materias: materias2,
      escala: [{ id: 'nota', etiqueta: 'Destacado 10', pesoNumerico: 10 }],
      periodos: [
        {
          bimestre: 1,
          evaluaciones: materias2.map((m) => ({
            cursoMateriaId: m.id,
            ppi: false,
            calificacionGeneralId: m.formativa ? null : 'nota',
            criterios: m.criterios.map((c) => ({ criterioId: c.id, valorEscalaId: 'nota' })),
          })),
          cierre: { asistencias: 0, inasistencias: 0, llegadasTarde: 0, observaciones: '' },
        },
      ],
    },
  };

  const reportSnapshot = {
    elegible: true,
    huella: 'huella-inf-1',
    datos: {
      instanciaId: 'inst-1',
      inscripcionId: 'enrollment-1',
      tipoInforme: 'PRIMER_BIMESTRE',
      instancia: { tipo: 'informe_area_1b' },
      ciclo: { id: 'c1', nombre: '2026', ano: 2026 },
      curso: { id: 'k1', nombre: '1°', grado: '1°', gradoNumero: 1, turno: 'Mañana' },
      materia: { id: 'm1', nombre: 'Música', codigoEspecial: 'MUS', etiquetaPdf: 'Música' },
      docente: { nombre: 'Docente', apellido: 'Prueba' },
      direccion: { nombre: 'MYRIAM', apellido: 'ADDUCCI' },
      alumno: { id: 's1', apellidos: 'Pérez', nombres: 'Juan', numeroOrden: 1 },
      plantilla: {
        id: 't1',
        codigo: 'PLANTILLA_1',
        tipoInforme: 'PRIMER_BIMESTRE',
        materiaId: 'm1',
        gradoDesde: 1,
        gradoHasta: 3,
        tituloTabla: 'Criterios pedagógicos',
        escalaItems: [{ codigo: 'S', etiqueta: 'Satisfactorio' }],
        mostrarLeyendaEscala: true,
        requiereDesempenoGeneral: true,
        escalaDesempenoGeneral: [{ codigo: 'MB', etiqueta: 'Muy Bueno' }],
        permiteObservaciones: true,
      },
      items: [
        {
          id: 'it1',
          plantillaId: 't1',
          bloqueNombre: null,
          bloqueOrden: null,
          ordenVisual: 1,
          pagina: 1,
          texto: 'Participación y compromiso',
        },
      ],
      contenido: { informeTexto: 'Desempeño muy satisfactorio.' },
      evaluacion: {
        desempenoGeneralCodigo: 'MB',
        desempenoGeneralEtiqueta: 'Muy Bueno',
        observaciones: 'Desempeño muy satisfactorio.',
        respuestas: [{ itemId: 'it1', valorCodigo: 'S' }],
      },
      visado: {
        generacionVisado: 1,
        revisionVisada: 1,
        visadoAt: '2026-05-01',
        visadoPor: 'Dirección',
      },
    },
  };

  let readsEnrollment1 = 0;
  let staleReads = 0;
  let reportReads = 0;

  const backend = http.createServer((req, res) => {
    assert.equal(req.headers.authorization, 'sesion-sintetica');
    res.setHeader('Content-Type', 'application/json');

    if (req.url.includes('/api/cys/directivo/informes/')) {
      reportReads++;
      res.end(JSON.stringify(reportSnapshot));
      return;
    }

    if (req.url.includes('enrollment-unapproved')) {
      res.statusCode = 422;
      res.end(JSON.stringify({ message: 'Falta visado' }));
      return;
    }

    if (req.url.includes('enrollment-stale')) {
      staleReads++;
      res.end(
        JSON.stringify({
          ...snapshot1,
          huella: staleReads > 1 ? 'b'.repeat(64) : snapshot1.huella,
        })
      );
      return;
    }

    if (req.url.includes('enrollment-2')) {
      res.end(JSON.stringify(snapshot2));
      return;
    }

    readsEnrollment1++;
    res.end(JSON.stringify(snapshot1));
  });

  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));

  const context = vm.createContext({
    exports: {},
    require,
    URL,
    fetch,
    AbortSignal,
    Buffer,
    FormData,
    Blob,
    Uint8Array,
    process,
  });

  vm.runInContext(
    ts.transpileModule(fs.readFileSync('scripts/local-pdf-plugin.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText,
    context
  );

  assert.equal(typeof context.exports.createLocalPdfMiddleware, 'function');

  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  const vite = await createServer({
    configFile: false,
    plugins: [react(), context.exports.localPdfPlugin(`http://127.0.0.1:${backend.address().port}`)],
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'error',
  });

  try {
    await vite.listen();
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;

    const input1 = {
      inscripcionId: 'enrollment-1',
      periodoId: 'periodo-0000001',
      huella: snapshot1.huella,
    };

    const call = (headers = {}, data = input1, path = '/__cys/pdf-prueba') =>
      fetch(`${origin}${path}`, {
        method: 'POST',
        headers: {
          Origin: origin,
          Authorization: 'sesion-sintetica',
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
      });

    assert.equal((await call({ Authorization: '' })).status, 401);
    assert.equal((await call({ Origin: 'https://example.org' })).status, 403);
    assert.equal((await call({}, { ...input1, huella: 'c'.repeat(64) })).status, 409);

    const unapproved = await call({}, { ...input1, inscripcionId: 'enrollment-unapproved' });
    assert.equal(unapproved.status, 422);

    readsEnrollment1 = 0;
    const firstCall = await call();
    assert.equal(firstCall.status, 200, await firstCall.clone().text());
    assert.equal(firstCall.headers.get('cache-control'), 'no-store');
    assert.equal(firstCall.headers.get('X-CYS-PDF-Result'), 'generated');
    const firstBytes = Buffer.from(await firstCall.arrayBuffer());
    const parsed1 = await PDFDocument.load(firstBytes);
    assert.equal(parsed1.getPageCount(), 13);
    assert.ok(
      parsed1
        .getPages()
        .every((p) => Math.abs(p.getWidth() - 595) <= 2 && Math.abs(p.getHeight() - 842) <= 2)
    );
    assert.equal(readsEnrollment1, 2);

    const secondCall = await call();
    assert.equal(secondCall.status, 200, await secondCall.clone().text());
    assert.equal(secondCall.headers.get('X-CYS-PDF-Result'), 'generated');
    const secondBytes = Buffer.from(await secondCall.arrayBuffer());
    const parsedSecond = await PDFDocument.load(secondBytes);
    assert.equal(parsedSecond.getPageCount(), 13);
    assert.equal(readsEnrollment1, 4);

    const secondCycleCall = await call({}, {
      inscripcionId: 'enrollment-2',
      periodoId: 'periodo-0000001',
      huella: snapshot2.huella,
    });
    assert.equal(secondCycleCall.status, 200, await secondCycleCall.clone().text());
    assert.equal(secondCycleCall.headers.get('X-CYS-PDF-Result'), 'generated');
    const secondCycleBytes = Buffer.from(await secondCycleCall.arrayBuffer());
    const parsed2 = await PDFDocument.load(secondCycleBytes);
    assert.equal(parsed2.getPageCount(), 14);
    assert.ok(
      parsed2
        .getPages()
        .every((p) => Math.abs(p.getWidth() - 595) <= 2 && Math.abs(p.getHeight() - 842) <= 2)
    );

    staleReads = 0;
    const staleCall = await call({}, { ...input1, inscripcionId: 'enrollment-stale' });
    assert.equal(staleCall.status, 409);
    const staleError = await staleCall.json();
    assert.match(staleError.message, /cambiaron durante la generación/);

    reportReads = 0;
    const reportCall = await call(
      {},
      {
        instanciaId: 'inst-1',
        inscripcionId: 'enrollment-1',
        huella: reportSnapshot.huella,
      },
      '/__cys/pdf-informe'
    );
    assert.equal(reportCall.status, 200, await reportCall.clone().text());
    assert.equal(reportCall.headers.get('X-CYS-PDF-Result'), 'generated');
    assert.equal(reportReads, 2);
    const reportBytes = Buffer.from(await reportCall.arrayBuffer());
    const parsedReport = await PDFDocument.load(reportBytes);
    assert.equal(parsedReport.getPageCount(), 1);
    assert.ok(
      parsedReport
        .getPages()
        .every((p) => Math.abs(p.getWidth() - 595) <= 2 && Math.abs(p.getHeight() - 842) <= 2)
    );
  } finally {
    await vite.close();
    await new Promise((resolve) => backend.close(resolve));
  }
});
