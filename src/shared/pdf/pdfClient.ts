import pb from '../../core/pocketbase';
import { PdfGenerationError } from './pdfError';

export type PdfGenerationResult = 'generated' | 'reused' | 'unknown';

export interface GeneratedPdfResponse {
  blob: Blob;
  bytes: Uint8Array;
  filename: string;
  result: PdfGenerationResult;
}

export async function requestGeneratedPdf(
  url: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
  defaultFilename = 'documento.pdf',
  defaultErrorMessage = 'No se pudo generar el PDF.',
): Promise<GeneratedPdfResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string };
    throw new PdfGenerationError(error.message || defaultErrorMessage, response.status);
  }

  if (!response.headers.get('Content-Type')?.includes('application/pdf')) {
    throw new Error('El servicio no devolvió un PDF.');
  }

  const disposition = response.headers.get('Content-Disposition') || '';
  const encodedPart = disposition.split("UTF-8''")[1];
  const filename = encodedPart ? decodeURIComponent(encodedPart) : defaultFilename;

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const blob = new Blob([bytes], { type: 'application/pdf' });

  const rawResult = response.headers.get('X-CYS-PDF-Result');
  const result: PdfGenerationResult =
    rawResult === 'generated' || rawResult === 'reused' ? rawResult : 'unknown';

  return {
    blob,
    bytes,
    filename,
    result,
  };
}
