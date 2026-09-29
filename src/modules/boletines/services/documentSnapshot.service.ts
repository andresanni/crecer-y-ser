import pb from '../../../core/pocketbase';
import type { DocumentSnapshot } from '../documentos/documentSnapshot.model';

export function getDocumentSnapshot(inscripcionId: string, periodoId: string): Promise<DocumentSnapshot> {
  return pb.send(`/api/cys/directivo/boletines/${encodeURIComponent(inscripcionId)}/instantanea`, {
    method: 'GET',
    query: { periodoId },
  });
}

export async function downloadDocumentProof(inscripcionId: string, periodoId: string, huella: string, signal: AbortSignal): Promise<{ blob: Blob; filename: string; emissionId: string | null }> {
  const response = await fetch('/__cys/pdf-prueba', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
    body: JSON.stringify({ inscripcionId, periodoId, huella }),
    signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(error.message || 'No se pudo generar el PDF.');
  }
  if (!response.headers.get('Content-Type')?.includes('application/pdf')) throw new Error('El servicio no devolvió un PDF.');
  const filename = decodeURIComponent(response.headers.get('Content-Disposition')?.split("UTF-8''")[1] || 'boletin-prueba.pdf');
  return { blob: await response.blob(), filename, emissionId: response.headers.get('X-CYS-Emission-Id') };
}
