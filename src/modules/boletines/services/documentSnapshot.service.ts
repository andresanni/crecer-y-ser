import pb from '../../../core/pocketbase';
import type { DocumentSnapshot } from '../documentos/documentSnapshot.model';

export function getDocumentSnapshot(inscripcionId: string, periodoId: string, signal?: AbortSignal): Promise<DocumentSnapshot> {
  return pb.send(`/api/cys/directivo/boletines/${encodeURIComponent(inscripcionId)}/instantanea`, {
    method: 'GET',
    query: { periodoId },
    signal,
    requestKey: null,
  });
}

export type PdfResult = 'generated' | 'reused' | 'unknown';

export class DocumentPdfError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface BatchEmission {
  inscripcionId: string;
  huella: string;
  emisionId: string;
}

export async function downloadDocumentBatch(cursoId: string, periodoId: string, emisiones: BatchEmission[], signal: AbortSignal) {
  const response = await fetch(import.meta.env.DEV ? '/__cys/pdf-lote' : `${pb.baseURL}/api/cys/pdf/lote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
    body: JSON.stringify({ cursoId, periodoId, emisiones }),
    signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string };
    throw new DocumentPdfError(error.message || 'No se pudo descargar el ZIP.', response.status);
  }
  if (!response.headers.get('Content-Type')?.includes('application/zip')) throw new Error('El servicio no devolvió un ZIP.');
  return {
    blob: await response.blob(),
    filename: decodeURIComponent(response.headers.get('Content-Disposition')?.split("UTF-8''")[1] || 'boletines.zip'),
  };
}

export async function downloadDocumentProof(inscripcionId: string, periodoId: string, huella: string, signal: AbortSignal): Promise<{ blob: Blob; filename: string; emissionId: string | null; result: PdfResult }> {
  const response = await fetch(import.meta.env.DEV ? '/__cys/pdf-prueba' : `${pb.baseURL}/api/cys/pdf/generar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
    body: JSON.stringify({ inscripcionId, periodoId, huella }),
    signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string };
    throw new DocumentPdfError(error.message || 'No se pudo generar el PDF.', response.status);
  }
  if (!response.headers.get('Content-Type')?.includes('application/pdf')) throw new Error('El servicio no devolvió un PDF.');
  const filename = decodeURIComponent(response.headers.get('Content-Disposition')?.split("UTF-8''")[1] || 'boletin-prueba.pdf');
  const result = response.headers.get('X-CYS-PDF-Result');
  return { blob: await response.blob(), filename, emissionId: response.headers.get('X-CYS-Emission-Id'), result: result === 'generated' || result === 'reused' ? result : 'unknown' };
}
