import pb from '../../../core/pocketbase';
import type { InformeDocumentSnapshot } from '../documentos/informeSnapshot.model';

export function getInformeDocumentSnapshot(
  instanciaId: string,
  inscripcionId: string,
  signal?: AbortSignal,
): Promise<InformeDocumentSnapshot> {
  return pb.send(
    `/api/cys/directivo/informes/${encodeURIComponent(instanciaId)}/alumnos/${encodeURIComponent(inscripcionId)}/instantanea`,
    {
      method: 'GET',
      signal,
      requestKey: null,
    },
  );
}

export type InformePdfResult = 'generated' | 'reused' | 'unknown';

export class InformePdfError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface InformeBatchEmission {
  inscripcionId: string;
  huella: string;
  emisionId: string;
}

export async function downloadInformeBatch(
  instanciaId: string,
  emisiones: InformeBatchEmission[],
  signal: AbortSignal,
) {
  const response = await fetch(
    import.meta.env.DEV ? '/__cys/pdf-informe-lote' : `${pb.baseURL}/api/cys/pdf-informe/lote`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({ instanciaId, emisiones }),
      signal,
    },
  );
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string };
    throw new InformePdfError(error.message || 'No se pudo descargar el ZIP de informes.', response.status);
  }
  if (!response.headers.get('Content-Type')?.includes('application/zip')) {
    throw new Error('El servicio no devolvió un ZIP.');
  }
  return {
    blob: await response.blob(),
    filename: decodeURIComponent(
      response.headers.get('Content-Disposition')?.split("UTF-8''")[1] || 'informes.zip',
    ),
  };
}

export async function downloadInformeProof(
  instanciaId: string,
  inscripcionId: string,
  huella: string,
  signal: AbortSignal,
): Promise<{
  blob: Blob;
  filename: string;
  emissionId: string | null;
  result: InformePdfResult;
}> {
  const response = await fetch(
    import.meta.env.DEV ? '/__cys/pdf-informe' : `${pb.baseURL}/api/cys/pdf-informe/generar`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({ instanciaId, inscripcionId, huella }),
      signal,
    },
  );
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string };
    throw new InformePdfError(error.message || 'No se pudo generar el PDF del informe.', response.status);
  }
  if (!response.headers.get('Content-Type')?.includes('application/pdf')) {
    throw new Error('El servicio no devolvió un PDF.');
  }
  const filename = decodeURIComponent(
    response.headers.get('Content-Disposition')?.split("UTF-8''")[1] || 'informe.pdf',
  );
  const result = response.headers.get('X-CYS-PDF-Result');
  return {
    blob: await response.blob(),
    filename,
    emissionId: response.headers.get('X-CYS-Emission-Id'),
    result: result === 'generated' || result === 'reused' ? result : 'unknown',
  };
}
