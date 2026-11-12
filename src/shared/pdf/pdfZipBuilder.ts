import { zipSync } from 'fflate';
import { PdfGenerationError } from './pdfError';

export function sanitizePdfFilename(name: string): string {
  return [...name]
    .map((char) => (char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char))
    .join('')
    .slice(0, 180);
}

export interface InMemoryPdfEntry {
  baseFilename: string;
  bytes: Uint8Array;
}

export function buildInMemoryPdfZip(entries: InMemoryPdfEntry[]): Blob {
  if (!entries || !entries.length) {
    throw new PdfGenerationError('No hay documentos para empaquetar.', 422);
  }

  const names = new Set<string>();
  const files: Record<string, Uint8Array> = {};
  let totalBytes = 0;

  for (const entry of entries) {
    if (!entry.bytes || entry.bytes.byteLength === 0) {
      throw new PdfGenerationError('El documento PDF está vacío.', 422);
    }
    totalBytes += entry.bytes.byteLength;
    if (totalBytes > 100 * 1024 * 1024) {
      throw new PdfGenerationError('El lote supera el límite de 100 MB.', 422);
    }

    const rawBase = sanitizePdfFilename(entry.baseFilename.replace(/\.pdf$/i, '')) || 'documento';
    let filename = `${rawBase}.pdf`;
    let duplicate = 2;

    while (names.has(filename.normalize('NFC').toLocaleLowerCase('es'))) {
      filename = `${rawBase} (${duplicate}).pdf`;
      duplicate += 1;
    }

    names.add(filename.normalize('NFC').toLocaleLowerCase('es'));
    files[filename] = entry.bytes;
  }

  const zipped = zipSync(files, { level: 0 });
  return new Blob([new Uint8Array(zipped)], { type: 'application/zip' });
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
