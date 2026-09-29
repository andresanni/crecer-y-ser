import { zipSync } from 'fflate';
import type { Plugin } from 'vite';
import { chromium } from 'playwright-core';
import { PDFDocument } from 'pdf-lib';
import type { AddressInfo } from 'node:net';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DocumentSnapshot } from '../src/modules/boletines/documentos/documentSnapshot.model.ts';

class PdfError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

interface PdfRuntime {
  root: string;
  port: () => number | undefined;
  allowedOrigins?: string[];
  renderOrigin?: string;
  chromium?: boolean;
}

export function createPdfMiddleware(pocketBaseUrl: string, workerKey: string, runtime: PdfRuntime) {
  let busy = false;
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
        if (!['/__cys/pdf-prueba', '/__cys/pdf-lote', '/api/cys/pdf/generar', '/api/cys/pdf/lote'].includes(request.url || '')) return next();
        const batch = request.url === '/__cys/pdf-lote' || request.url === '/api/cys/pdf/lote';
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        let acquired = false;
        try {
          const port = runtime.port();
          if (!port || !['127.0.0.1', '::1'].includes(request.socket.remoteAddress || '')) throw new PdfError('Disponible sólo en desarrollo local.', 403);
          const origin = request.headers.origin;
          const allowed = runtime.allowedOrigins || [`http://127.0.0.1:${port}`, `http://localhost:${port}`, `http://[::1]:${port}`];
          if (!origin || !allowed.includes(origin)) throw new PdfError('Origen no admitido.', 403);
          if (runtime.allowedOrigins) {
            response.setHeader('Access-Control-Allow-Origin', origin);
            response.setHeader('Vary', 'Origin');
            response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
            response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-CYS-Emission-Id');
          }
          if (request.method === 'OPTIONS') { response.statusCode = 204; response.end(); return; }
          if (request.method !== 'POST') throw new PdfError('Método no admitido.', 405);
          const renderOrigin = runtime.renderOrigin || origin;
          const pb = new URL(pocketBaseUrl);
          if (pb.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(pb.hostname)) throw new PdfError('La prueba requiere PocketBase local.', 503);
          const authorization = request.headers.authorization;
          if (!authorization) throw new PdfError('Ingresá nuevamente a la aplicación.', 401);
          let body = '';
          for await (const chunk of request) {
            body += chunk.toString();
            if (body.length > (batch ? 32000 : 4096)) throw new PdfError('Solicitud demasiado grande.', 413);
          }
          let input: { inscripcionId?: string; periodoId?: string; huella?: string; cursoId?: string; emisiones?: Array<{ inscripcionId: string; huella: string; emisionId: string }> };
          try { input = JSON.parse(body); } catch { throw new PdfError('Solicitud inválida.', 400); }
          const templateVersion = () => {
            const hash = createHash('sha256');
            const scan = (directory: string) => {
              for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
                const file = join(directory, entry.name);
                if (entry.isDirectory()) scan(file);
                else { hash.update(file); hash.update(readFileSync(file)); }
              }
            };
            scan(join(runtime.root, 'src/modules/boletines/documentos'));
            scan(join(runtime.root, 'public/boletines'));
            return hash.digest('hex');
          };
          if (batch) {
            const validId = (value: unknown) => typeof value === 'string' && /^[a-z0-9]{15}$/.test(value);
            if (!input || !validId(input.cursoId) || !validId(input.periodoId) || !Array.isArray(input.emisiones) || !input.emisiones.length || input.emisiones.length > 100 || input.emisiones.some(item => !item || !validId(item.inscripcionId) || !validId(item.emisionId) || !/^[a-f0-9]{64}$/.test(item.huella)) || new Set(input.emisiones.map(item => item.inscripcionId)).size !== input.emisiones.length) throw new PdfError('Lote inválido (máximo 100 boletines).', 400);
            if (!workerKey) throw new PdfError('Configurá el almacenamiento de emisiones antes de descargar lotes.', 503);
            if (busy) throw new PdfError('Hay otro PDF o ZIP en preparación. Volvé a intentarlo.', 429);
            busy = true;
            acquired = true;
            const version = templateVersion();
            const headers = { Authorization: authorization };
            const read = async (path: string) => {
              if (response.destroyed) throw new PdfError('Descarga cancelada.', 409);
              const result = await fetch(new URL(path, pb), { headers, signal: AbortSignal.timeout(15000) });
              if (!result.ok) throw new PdfError('Un boletín del lote cambió o dejó de estar disponible. Volvé a preparar el lote.', result.status);
              return result;
            };
            const validate = async (item: typeof input.emisiones[number]) => {
              const snapshot = await (await read(`/api/cys/directivo/boletines/${item.inscripcionId}/instantanea?periodoId=${input.periodoId}`)).json() as DocumentSnapshot;
              if (snapshot.huella !== item.huella || snapshot.datos.curso.id !== input.cursoId) throw new PdfError('Cambió un boletín o no pertenece al curso seleccionado.', 409);
              const lookup = await (await read(`/api/cys/directivo/boletines/${item.inscripcionId}/emisiones?periodoId=${input.periodoId}&version=${version}`)).json() as { emision: { id: string; huella: string } | null };
              if (lookup.emision?.id !== item.emisionId || lookup.emision.huella !== item.huella) throw new PdfError('Una emisión ya no corresponde a la versión vigente.', 409);
              return snapshot;
            };
            const files: Record<string, Uint8Array> = Object.create(null);
            const names = new Set<string>();
            let size = 0;
            let zipName = 'BOLETINES.zip';
            const safe = (name: string) => [...name].map(char => char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char).join('').slice(0, 180);
            for (const item of input.emisiones) {
              const { datos } = await validate(item);
              const pdf = await read(`/api/cys/directivo/emisiones/${item.emisionId}/archivo?download=1`);
              if (!pdf.headers.get('content-type')?.includes('application/pdf')) throw new PdfError('Una emisión no devolvió un PDF.', 502);
              const bytes = new Uint8Array(await pdf.arrayBuffer());
              size += bytes.byteLength;
              if (size > 100 * 1024 * 1024) throw new PdfError('El lote supera el límite de 100 MB.', 413);
              const base = safe(`${datos.alumno.apellidos}, ${datos.alumno.nombres} - BOLETIN ${datos.bimestreCorte} BIMESTRE`);
              let name = `${base}.pdf`;
              let duplicate = 2;
              while (names.has(name.normalize('NFC').toLocaleLowerCase('es'))) name = `${base} (${duplicate++}).pdf`;
              names.add(name.normalize('NFC').toLocaleLowerCase('es'));
              files[name] = bytes;
              zipName = `${safe(`${datos.curso.nombre} - BOLETINES ${datos.bimestreCorte} BIMESTRE - ${datos.ciclo.ano}`)}.zip`;
            }
            for (const item of input.emisiones) await validate(item);
            if (templateVersion() !== version) throw new PdfError('Cambió la plantilla. Volvé a preparar el lote.', 409);
            const zip = zipSync(files, { level: 0 });
            response.setHeader('Content-Type', 'application/zip');
            response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`);
            response.end(Buffer.from(zip));
            return;
          }
          if (!input || !/^[a-z0-9]{15}$/.test(input.inscripcionId || '') || !/^[a-z0-9]{15}$/.test(input.periodoId || '') || !/^[a-f0-9]{64}$/.test(input.huella || '')) throw new PdfError('Solicitud inválida.', 400);
          if (busy) throw new PdfError('Hay otro PDF en preparación. Volvé a intentarlo en unos segundos.', 429);
          busy = true;
          acquired = true;
          const readSnapshot = async (): Promise<DocumentSnapshot> => {
            const result = await fetch(new URL(`/api/cys/directivo/boletines/${input.inscripcionId}/instantanea?periodoId=${input.periodoId}`, pb), { headers: { Authorization: authorization }, signal: AbortSignal.timeout(15000) });
            if (!result.ok) {
              const payload = await result.json().catch(() => ({})) as { message?: string };
              throw new PdfError(payload.message || 'No se pudieron validar los datos y visados.', result.status);
            }
            return result.json() as Promise<DocumentSnapshot>;
          };
          const snapshot = await readSnapshot();
          if (snapshot.huella !== input.huella) throw new PdfError('El boletín cambió. Cerrá y volvé a abrir la vista previa.', 409);
          const version = templateVersion();
          const deliver = async (id: string) => {
            const stored = await fetch(new URL(`/api/cys/directivo/emisiones/${id}/archivo?download=1`, pb), { headers: { Authorization: authorization }, signal: AbortSignal.timeout(15000) });
            if (!stored.ok) throw new PdfError('La emisión ya no está vigente. Volvé a generar el boletín.', stored.status);
            response.setHeader('Content-Type', 'application/pdf');
            const student = snapshot.datos.alumno;
            const filename = [...`${student.apellidos}, ${student.nombres} - BOLETIN ${snapshot.datos.bimestreCorte} BIMESTRE.pdf`].map(char => char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char).join('');
            response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
            response.setHeader('X-CYS-Emission-Id', id);
            response.end(Buffer.from(await stored.arrayBuffer()));
          };
          if (workerKey) {
            const prior = await fetch(new URL(`/api/cys/directivo/boletines/${input.inscripcionId}/emisiones?periodoId=${input.periodoId}&version=${version}`, pb), { headers: { Authorization: authorization }, signal: AbortSignal.timeout(15000) });
            if (!prior.ok) throw new PdfError('No se pudo consultar la emisión guardada.', prior.status);
            const value = await prior.json() as { emision: { id: string; huella: string } | null };
            if (value.emision?.huella === snapshot.huella) { await deliver(value.emision.id); return; }
          }
          const browser = await chromium.launch({ ...(runtime.chromium ? { chromiumSandbox: true } : { channel: 'msedge' }), headless: true, timeout: 20000 });
          let pdf: Buffer;
          try {
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.route('**/*', async route => {
              const url = new URL(route.request().url());
              if (url.origin !== renderOrigin) return route.abort();
              if (url.pathname === '/__cys/render-input') return route.fulfill({ json: snapshot });
              return route.continue();
            });
            await page.emulateMedia({ media: 'print' });
            await page.goto(`${renderOrigin}/boletin-render.html`, { timeout: 30000 });
            await page.locator('body[data-render-state]').waitFor({ state: 'attached', timeout: 30000 });
            const failure = await page.locator('body').getAttribute('data-render-error');
            if (failure) throw new PdfError(failure, 422);
            pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
          } finally { await browser.close(); }
          const parsed = await PDFDocument.load(pdf);
          const expectedPages = Number(snapshot.datos.curso.nombre.trim()[0]) >= 4 ? 14 : 13;
          if (parsed.getPageCount() !== expectedPages || parsed.getPages().some(page => Math.abs(page.getWidth() - 595) > 2 || Math.abs(page.getHeight() - 842) > 2)) throw new PdfError('La paginación del PDF requiere revisión.', 422);
          const current = await readSnapshot();
          if (current.huella !== snapshot.huella) throw new PdfError('Los datos o visados cambiaron durante la generación. Volvé a abrir la vista previa.', 409);
          if (templateVersion() !== version) throw new PdfError('Cambió la plantilla durante la generación. Volvé a intentarlo.', 409);
          if (workerKey) {
            const form = new FormData();
            form.set('periodoId', input.periodoId!);
            form.set('huella', snapshot.huella);
            form.set('version', version);
            form.set('archivoSha256', createHash('sha256').update(pdf).digest('hex'));
            form.set('archivo', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), 'boletin.pdf');
            const published = await fetch(new URL(`/api/cys/directivo/boletines/${input.inscripcionId}/emisiones`, pb), { method: 'POST', headers: { Authorization: authorization, 'X-CYS-PDF-Worker': workerKey }, body: form, signal: AbortSignal.timeout(30000) });
            if (!published.ok) throw new PdfError('No se pudo guardar la emisión; verificá los visados y volvé a intentarlo.', published.status);
            const saved = await published.json() as { id: string };
            await deliver(saved.id);
            return;
          }
          const { alumno, bimestreCorte } = snapshot.datos;
          const name = [...`${alumno.apellidos}, ${alumno.nombres} - BOLETIN ${bimestreCorte} BIMESTRE.pdf`].map(char => char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char).join('');
          response.setHeader('Content-Type', 'application/pdf');
          response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
          response.end(pdf);
        } catch (error) {
          response.statusCode = error instanceof PdfError ? error.status : 503;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ message: error instanceof PdfError ? error.message : 'No se pudo generar el PDF. El servicio de impresión no está disponible; volvé a intentarlo.' }));
        } finally { if (acquired) busy = false; }
  };
}

export function localPdfPlugin(pocketBaseUrl: string, workerKey = ''): Plugin {
  return {
    name: 'cys-local-pdf',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(createPdfMiddleware(pocketBaseUrl, workerKey, {
        root: server.config.root,
        port: () => (server.httpServer?.address() as AddressInfo | null)?.port,
      }));
    },
  };
}
