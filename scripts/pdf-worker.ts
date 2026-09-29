import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createPdfMiddleware } from './local-pdf-plugin.ts';

const root = resolve(process.env.CYS_PDF_ROOT || process.cwd());
const port = Number(process.env.CYS_PDF_PORT || 8093);
const key = process.env.CYS_PDF_WORKER_KEY;
const allowedOrigins = (process.env.CYS_PDF_ORIGINS || '').split(',').filter(Boolean);
if (!key || !allowedOrigins.length) throw new Error('Falta configurar el generador PDF.');
const handler = createPdfMiddleware(process.env.CYS_POCKETBASE_URL || 'http://127.0.0.1:8090', key, {
  root, port: () => port, allowedOrigins, renderOrigin: `http://127.0.0.1:${port}`, chromium: true,
});
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
const server = createServer((request, response) => {
  void handler(request, response, () => {
    void (async () => {
      const path = new URL(request.url || '/', 'http://localhost').pathname;
      if (path === '/health') { response.end('ok'); return; }
      const base = resolve(root, 'dist-render');
      const file = resolve(base, `.${decodeURIComponent(path)}`);
      if (!file.startsWith(base + sep) || !types[extname(file)] || request.method !== 'GET') { response.writeHead(404).end(); return; }
      try {
        const bytes = await readFile(file);
        response.setHeader('Content-Type', types[extname(file)]);
        response.setHeader('Cache-Control', 'no-store');
        response.end(bytes);
      } catch { response.writeHead(404).end(); }
    })().catch(() => response.writeHead(400).end());
  });
});
server.requestTimeout = 60000;
server.headersTimeout = 15000;
server.listen(port, '127.0.0.1');
