import type { Plugin } from 'vite';
import { chromium } from 'playwright-core';
import { PDFDocument } from 'pdf-lib';
import type { AddressInfo } from 'node:net';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { DocumentSnapshot } from '../src/modules/boletines/documentos/documentSnapshot.model.ts';
import type { InformeDocumentSnapshot } from '../src/modules/informes/documentos/informeSnapshot.model.ts';

class PdfError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface PdfRuntime {
  root?: string;
  port: () => number | undefined;
  allowedOrigins?: string[];
  renderOrigin?: string;
  chromium?: boolean;
  routePath?: string;
  informeRoutePath?: string;
}

const REPORT_ROUTES = [
  '/__cys/pdf-informe',
  '/api/cys/pdf/informe/generar',
  '/api/cys/pdf-informe/generar',
];

const BOLETIN_ROUTES = [
  '/__cys/pdf-prueba',
  '/api/cys/pdf/generar',
];

const safe = (name: string) =>
  [...name]
    .map((char) => (char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char))
    .join('')
    .slice(0, 180);

const validId = (value: unknown): value is string =>
  typeof value === 'string' && (/^[a-z0-9]{15}$/.test(value) || /^[a-z0-9_-]{3,30}$/.test(value));

const validHuella = (value: unknown): value is string =>
  typeof value === 'string' && (/^[a-f0-9]{64}$/.test(value) || /^[a-z0-9_-]{8,64}$/.test(value));

const reportFilename = (datos: InformeDocumentSnapshot['datos']) => {
  const prefix =
    datos.tipoInforme === 'CICLO_FINAL'
      ? 'INFORME FINAL'
      : datos.tipoInforme === 'PRIMER_CUATRIMESTRE'
        ? 'INFORME 1 CUATRIMESTRE'
        : 'INFORME 1 BIMESTRE';
  const suffix = datos.materia?.etiquetaPdf
    ? ` - ${datos.materia.etiquetaPdf.toUpperCase()}`
    : '';
  return safe(`${datos.alumno.apellidos}, ${datos.alumno.nombres} - ${prefix}${suffix}`);
};

const boletinFilename = (datos: DocumentSnapshot['datos']) =>
  safe(`${datos.alumno.apellidos}, ${datos.alumno.nombres} - BOLETIN ${datos.bimestreCorte} BIMESTRE`);

async function renderDocumentWithChromium(
  renderOrigin: string,
  htmlPath: string,
  inputPath: string,
  snapshot: unknown,
  documentTitle: string,
  useChromiumSandbox?: boolean,
): Promise<Buffer> {
  const browser = await chromium.launch({
    ...(useChromiumSandbox && process.platform === 'linux' ? { chromiumSandbox: true } : { channel: 'msedge' }),
    headless: true,
    timeout: 20000,
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== renderOrigin) return route.abort();
      if (url.pathname === inputPath) return route.fulfill({ json: snapshot });
      return route.continue();
    });
    await page.emulateMedia({ media: 'print' });
    await page.goto(`${renderOrigin}${htmlPath}`, { timeout: 30000 });
    await page.locator('body[data-render-state]').waitFor({ state: 'attached', timeout: 30000 });
    const failure = await page.locator('body').getAttribute('data-render-error');
    if (failure) throw new PdfError(failure, 422);
    await page.evaluate((title) => {
      const doc = (globalThis as { document?: { title: string } }).document;
      if (doc) doc.title = title;
    }, documentTitle);
    return await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
  } finally {
    await browser.close();
  }
}

async function validatePdfPages(pdf: Buffer, expectedPages: number, errorMessage: string): Promise<void> {
  const parsed = await PDFDocument.load(pdf);
  if (
    parsed.getPageCount() !== expectedPages ||
    parsed.getPages().some((page) => Math.abs(page.getWidth() - 595) > 2 || Math.abs(page.getHeight() - 842) > 2)
  ) {
    throw new PdfError(errorMessage, 422);
  }
}

export function createPdfMiddleware(
  pocketBaseUrl: string,
  workerKeyOrRuntime?: string | PdfRuntime,
  maybeRuntime?: PdfRuntime,
) {
  const runtime: PdfRuntime =
    typeof workerKeyOrRuntime === 'string'
      ? (maybeRuntime ?? { port: () => undefined })
      : (workerKeyOrRuntime ?? { port: () => undefined });
  let busy = false;
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const reqUrl = request.url || '';
    const isReportRoute =
      REPORT_ROUTES.includes(reqUrl) || (runtime.informeRoutePath ? reqUrl === runtime.informeRoutePath : false);
    const isBoletinRoute =
      BOLETIN_ROUTES.includes(reqUrl) || (runtime.routePath ? reqUrl === runtime.routePath : false);
    if (!isReportRoute && !isBoletinRoute) return next();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    let acquired = false;
    try {
      const port = runtime.port();
      if (!port || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress || '')) {
        throw new PdfError('Disponible sólo en desarrollo local.', 403);
      }
      const origin = request.headers.origin;
      const allowed = runtime.allowedOrigins || [`http://127.0.0.1:${port}`, `http://localhost:${port}`, `http://[::1]:${port}`];
      if (!origin || !allowed.includes(origin)) throw new PdfError('Origen no admitido.', 403);
      if (runtime.allowedOrigins) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
        response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-CYS-PDF-Result');
      }
      if (request.method === 'OPTIONS') {
        response.statusCode = 204;
        response.end();
        return;
      }
      if (request.method !== 'POST') throw new PdfError('Método no admitido.', 405);
      const renderOrigin = runtime.renderOrigin || origin;
      const pb = new URL(pocketBaseUrl);
      if (pb.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(pb.hostname)) {
        throw new PdfError('La prueba requiere PocketBase local.', 503);
      }
      const authorization = request.headers.authorization;
      if (!authorization) throw new PdfError('Ingresá nuevamente a la aplicación.', 401);
      let body = '';
      for await (const chunk of request) {
        body += chunk.toString();
        if (body.length > 4096) throw new PdfError('Solicitud demasiado grande.', 413);
      }
      let input: {
        inscripcionId?: string;
        periodoId?: string;
        instanciaId?: string;
        huella?: string;
      };
      try {
        input = JSON.parse(body);
      } catch {
        throw new PdfError('Solicitud inválida.', 400);
      }

      if (isReportRoute) {
        if (!input || !validId(input.instanciaId) || !validId(input.inscripcionId) || !validHuella(input.huella)) {
          throw new PdfError('Solicitud de informe inválida.', 400);
        }
        if (busy) throw new PdfError('Hay otro PDF en preparación. Volvé a intentarlo en unos segundos.', 429);
        busy = true;
        acquired = true;
        const readSnapshot = async (): Promise<InformeDocumentSnapshot> => {
          const result = await fetch(
            new URL(`/api/cys/directivo/informes/${input.instanciaId}/alumnos/${input.inscripcionId}/instantanea`, pb),
            {
              headers: { Authorization: authorization },
              signal: AbortSignal.timeout(15000),
            },
          );
          if (!result.ok) {
            const payload = (await result.json().catch(() => ({}))) as { message?: string };
            throw new PdfError(payload.message || 'No se pudieron validar los datos y el visado del informe.', result.status);
          }
          return result.json() as Promise<InformeDocumentSnapshot>;
        };
        const snapshot = await readSnapshot();
        if (snapshot.huella !== input.huella) {
          throw new PdfError('El informe cambió. Actualizá los datos y volvé a descargar el PDF.', 409);
        }
        const baseName = reportFilename(snapshot.datos);
        const pdf = await renderDocumentWithChromium(
          renderOrigin,
          '/informe-render.html',
          '/__cys/render-informe-input',
          snapshot,
          baseName,
          runtime.chromium,
        );
        const itemPages = new Set(snapshot.datos.items.map((it) => it.pagina || 1)).size;
        const expectedPages =
          !snapshot.datos.plantilla.requiereDesempenoGeneral &&
          snapshot.datos.plantilla.permiteObservaciones
            ? itemPages + 1
            : itemPages;
        await validatePdfPages(pdf, expectedPages, 'La paginación del PDF de informe requiere revisión.');
        const current = await readSnapshot();
        if (current.huella !== snapshot.huella) {
          throw new PdfError(
            'Los datos o el visado del informe cambiaron durante la generación. Actualizá los datos y volvé a descargar el PDF.',
            409,
          );
        }
        const name = `${baseName}.pdf`;
        response.setHeader('Content-Type', 'application/pdf');
        response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
        response.setHeader('X-CYS-PDF-Result', 'generated');
        response.end(pdf);
        return;
      }

      if (!input || !validId(input.inscripcionId) || !validId(input.periodoId) || !validHuella(input.huella)) {
        throw new PdfError('Solicitud inválida.', 400);
      }
      if (busy) throw new PdfError('Hay otro PDF en preparación. Volvé a intentarlo en unos segundos.', 429);
      busy = true;
      acquired = true;
      const readSnapshot = async (): Promise<DocumentSnapshot> => {
        const result = await fetch(
          new URL(`/api/cys/directivo/boletines/${input.inscripcionId}/instantanea?periodoId=${input.periodoId}`, pb),
          {
            headers: { Authorization: authorization },
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!result.ok) {
          const payload = (await result.json().catch(() => ({}))) as { message?: string };
          throw new PdfError(payload.message || 'No se pudieron validar los datos y visados.', result.status);
        }
        return result.json() as Promise<DocumentSnapshot>;
      };
      const snapshot = await readSnapshot();
      if (snapshot.huella !== input.huella) {
        throw new PdfError('El boletín cambió. Actualizá los datos y volvé a descargar el PDF.', 409);
      }
      const baseName = boletinFilename(snapshot.datos);
      const pdf = await renderDocumentWithChromium(
        renderOrigin,
        '/boletin-render.html',
        '/__cys/render-input',
        snapshot,
        baseName,
        runtime.chromium,
      );
      const expectedPages = Number(snapshot.datos.curso.nombre.trim()[0]) >= 4 ? 14 : 13;
      await validatePdfPages(pdf, expectedPages, 'La paginación del PDF requiere revisión.');
      const current = await readSnapshot();
      if (current.huella !== snapshot.huella) {
        throw new PdfError(
          'Los datos o visados cambiaron durante la generación. Actualizá los datos y volvé a descargar el PDF.',
          409,
        );
      }
      const name = `${baseName}.pdf`;
      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
      response.setHeader('X-CYS-PDF-Result', 'generated');
      response.end(pdf);
    } catch (error) {
      response.statusCode = error instanceof PdfError ? error.status : 503;
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          message:
            error instanceof PdfError
              ? error.message
              : 'No se pudo generar el PDF. El servicio de impresión no está disponible; volvé a intentarlo.',
        }),
      );
    } finally {
      if (acquired) busy = false;
    }
  };
}

export function localPdfPlugin(pocketBaseUrl: string): Plugin {
  return {
    name: 'cys-local-pdf',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(
        createPdfMiddleware(pocketBaseUrl, {
          root: server.config.root,
          port: () => (server.httpServer?.address() as AddressInfo | null)?.port,
        }),
      );
    },
  };
}

export const createLocalPdfMiddleware = createPdfMiddleware;
export const createProductionPdfListener = createPdfMiddleware;
