import pb from '../../../core/pocketbase';
import type { DocumentSnapshot } from '../documentos/documentSnapshot.model';

export function getDocumentSnapshot(inscripcionId: string, periodoId: string): Promise<DocumentSnapshot> {
  return pb.send(`/api/cys/directivo/boletines/${encodeURIComponent(inscripcionId)}/instantanea`, {
    method: 'GET',
    query: { periodoId },
  });
}
