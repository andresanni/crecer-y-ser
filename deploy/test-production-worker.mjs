import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = existsSync('/opt/cys-pdf/current')
  ? '/opt/cys-pdf/current'
  : fileURLToPath(new URL('..', import.meta.url));

const pluginPath = existsSync('/opt/cys-pdf/current/scripts/local-pdf-plugin.ts')
  ? '/opt/cys-pdf/current/scripts/local-pdf-plugin.ts'
  : pathToFileURL(resolve(root, 'scripts/local-pdf-plugin.ts')).href;

const { createProductionPdfListener } = await import(pluginPath);
const require = createRequire(resolve(root, 'package.json'));
const { PDFDocument } = require('pdf-lib');

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

const boletinSnapshot = {
  huella: 'a'.repeat(64),
  datos: {
    versionContrato: 1,
    curso: { id: 'c'.repeat(15), nombre: '1°' },
    ciclo: { ano: 2026 },
    bimestreCorte: 1,
    alumno: { id: 's'.repeat(15), apellidos: 'Prueba', nombres: 'Sintetica', dni: '00000000' },
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

const informeSnapshot = {
  elegible: true,
  huella: 'b'.repeat(64),
  datos: {
    instanciaId: 'i'.repeat(15),
    inscripcionId: 'a'.repeat(15),
    tipoInforme: 'PRIMER_BIMESTRE',
    ciclo: { id: 'c'.repeat(15), nombre: '2026', ano: 2026 },
    curso: { id: 'c'.repeat(15), nombre: '1°', grado: '1°', gradoNumero: 1, turno: 'Mañana' },
    materia: { id: 'm'.repeat(15), nombre: 'Música', codigoEspecial: 'MUS', etiquetaPdf: 'Música' },
    docente: { nombre: 'Docente', apellido: 'Prueba' },
    direccion: { nombre: 'MYRIAM', apellido: 'ADDUCCI' },
    alumno: { id: 's'.repeat(15), apellidos: 'Alumno', nombres: 'Sintetico', numeroOrden: 1 },
    plantilla: {
      id: 't'.repeat(15),
      codigo: 'PLANTILLA_1',
      tipoInforme: 'PRIMER_BIMESTRE',
      materiaId: 'm'.repeat(15),
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
        plantillaId: 't'.repeat(15),
        bloqueNombre: null,
        bloqueOrden: null,
        ordenVisual: 1,
        pagina: 1,
        texto: 'Participación y desempeño',
      },
    ],
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

let boletinReads = 0;
let informeReads = 0;
const backend = createServer(async (req, res) => {
  if (req.headers.authorization !== 'synthetic-session') {
    res.writeHead(401).end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  if (req.url.includes('/api/cys/directivo/informes/')) {
    informeReads++;
    res.end(JSON.stringify(informeSnapshot));
    return;
  }
  if (req.url.includes('/instantanea')) {
    boletinReads++;
    res.end(JSON.stringify(boletinSnapshot));
    return;
  }
  res.writeHead(404).end();
});

await new Promise((r) => backend.listen(18095, '127.0.0.1', r));

const origins = [
  'https://www.creceryser.edu.ar',
  'https://creceryser.edu.ar',
  'https://crecer-y-ser-ten.vercel.app',
];

const handler = createProductionPdfListener('http://127.0.0.1:18095', {
  root,
  port: () => 18094,
  allowedOrigins: origins,
  renderOrigin: 'http://127.0.0.1:18094',
  chromium: true,
  routePath: '/api/cys/pdf/generar',
  informeRoutePath: '/api/cys/pdf/informe/generar',
});

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

async function serveStatic(req, res) {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  if (path === '/health') {
    res.end('ok');
    return;
  }
  const base = resolve(root, 'dist-render');
  const file = resolve(base, `.${decodeURIComponent(path)}`);
  if (!file.startsWith(base + sep) || !types[extname(file)] || req.method !== 'GET') {
    res.writeHead(404).end();
    return;
  }
  try {
    const bytes = await readFile(file);
    res.setHeader('Content-Type', types[extname(file)]);
    res.setHeader('Cache-Control', 'no-store');
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
}

const server = createServer((req, res) => {
  void handler(req, res, () => {
    void serveStatic(req, res).catch(() => res.writeHead(400).end());
  });
});

await new Promise((r) => server.listen(18094, '127.0.0.1', r));

try {
  for (const origin of origins) {
    for (const path of ['/api/cys/pdf/generar', '/api/cys/pdf/informe/generar']) {
      const preflight = await fetch('http://127.0.0.1:18094' + path, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      });
      if (preflight.status !== 204 || preflight.headers.get('Access-Control-Allow-Origin') !== origin) {
        throw new Error('Production origin preflight');
      }
    }
  }

  const foreign = await fetch('http://127.0.0.1:18094/api/cys/pdf/generar', {
    method: 'OPTIONS',
    headers: { Origin: 'https://foreign.example' },
  });
  if (foreign.status !== 403 || foreign.headers.has('Access-Control-Allow-Origin')) {
    throw new Error('Foreign origin accepted');
  }

  const headers = {
    Origin: origins[0],
    Authorization: 'synthetic-session',
    'Content-Type': 'application/json',
  };

  boletinReads = 0;
  const boletinRes = await fetch('http://127.0.0.1:18094/api/cys/pdf/generar', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inscripcionId: 'a'.repeat(15),
      periodoId: 'p'.repeat(15),
      huella: boletinSnapshot.huella,
    }),
  });
  if (!boletinRes.ok) throw new Error(await boletinRes.text());
  if (boletinRes.headers.get('X-CYS-PDF-Result') !== 'generated') throw new Error('Boletin result header');
  if (!boletinRes.headers.get('Access-Control-Expose-Headers')?.includes('X-CYS-PDF-Result')) {
    throw new Error('Result header not exposed');
  }
  const boletinPdf = await boletinRes.arrayBuffer();
  const boletinDoc = await PDFDocument.load(boletinPdf);
  if (boletinDoc.getPageCount() !== 13) {
    throw new Error(`Boletin pages: expected 13, got ${boletinDoc.getPageCount()}`);
  }
  if (boletinReads !== 2) {
    throw new Error(`Boletin snapshot reads: expected 2, got ${boletinReads}`);
  }

  informeReads = 0;
  const informeRes = await fetch('http://127.0.0.1:18094/api/cys/pdf/informe/generar', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      instanciaId: 'i'.repeat(15),
      inscripcionId: 'a'.repeat(15),
      huella: informeSnapshot.huella,
    }),
  });
  if (!informeRes.ok) throw new Error(await informeRes.text());
  if (informeRes.headers.get('X-CYS-PDF-Result') !== 'generated') throw new Error('Informe result header');
  const informePdf = await informeRes.arrayBuffer();
  const informeDoc = await PDFDocument.load(informePdf);
  if (informeDoc.getPageCount() !== 1) {
    throw new Error(`Informe pages: expected 1, got ${informeDoc.getPageCount()}`);
  }
  if (informeReads !== 2) {
    throw new Error(`Informe snapshot reads: expected 2, got ${informeReads}`);
  }

  console.log(
    JSON.stringify({
      productionWorker: 'ok',
      boletinPages: 13,
      informePages: 1,
      boletinReads,
      informeReads,
    })
  );
} finally {
  server.close();
  backend.close();
}
