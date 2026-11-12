import pb from '../../../core/pocketbase';
import {
  type GeneratedPdfResponse,
  PdfGenerationError as DocumentPdfError,
  type PdfGenerationResult as PdfResult,
  requestGeneratedPdf,
  sanitizePdfFilename,
} from '../../../shared/pdf';
import type { DocumentSnapshot } from '../documentos/documentSnapshot.model';

export { DocumentPdfError, type PdfResult };

export function getDocumentSnapshot(
  inscripcionId: string,
  periodoId: string,
  signal?: AbortSignal,
): Promise<DocumentSnapshot> {
  return pb.send(`/api/cys/directivo/boletines/${encodeURIComponent(inscripcionId)}/instantanea`, {
    method: 'GET',
    query: { periodoId },
    signal,
    requestKey: null,
  });
}

export function formatBulletinPdfBaseName(datos: DocumentSnapshot['datos']): string {
  if (!datos?.alumno) {
    return 'boletin';
  }
  return sanitizePdfFilename(
    `${datos.alumno.apellidos}, ${datos.alumno.nombres} - BOLETIN ${datos.bimestreCorte} BIMESTRE`,
  );
}

export function formatBulletinZipFilename(datos: DocumentSnapshot['datos']): string {
  if (!datos?.curso) {
    return 'boletines.zip';
  }
  return `${sanitizePdfFilename(
    `${datos.curso.nombre} - BOLETINES ${datos.bimestreCorte} BIMESTRE - ${datos.ciclo.ano}`,
  )}.zip`;
}

export function downloadDocumentProof(
  inscripcionId: string,
  periodoId: string,
  huella: string,
  signal: AbortSignal,
): Promise<GeneratedPdfResponse> {
  return requestGeneratedPdf(
    import.meta.env.DEV ? '/__cys/pdf-prueba' : `${pb.baseURL}/api/cys/pdf/generar`,
    { inscripcionId, periodoId, huella },
    signal,
    'boletin-prueba.pdf',
    'No se pudo generar el PDF.',
  );
}
