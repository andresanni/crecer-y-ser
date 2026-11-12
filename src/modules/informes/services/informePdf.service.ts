import pb from '../../../core/pocketbase';
import {
  type GeneratedPdfResponse,
  PdfGenerationError as InformePdfError,
  type PdfGenerationResult as InformePdfResult,
  requestGeneratedPdf,
  sanitizePdfFilename,
} from '../../../shared/pdf';
import type { InformeDocumentSnapshot } from '../documentos/informeSnapshot.model';

export { InformePdfError, type InformePdfResult };

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

export function formatInformePdfBaseName(datos: InformeDocumentSnapshot['datos']): string {
  if (!datos?.alumno) {
    return 'informe';
  }
  const prefix =
    datos.tipoInforme === 'CICLO_FINAL'
      ? 'INFORME FINAL'
      : datos.tipoInforme === 'PRIMER_CUATRIMESTRE'
        ? 'INFORME 1 CUATRIMESTRE'
        : 'INFORME 1 BIMESTRE';
  const suffix = datos.materia?.etiquetaPdf
    ? ` - ${datos.materia.etiquetaPdf.toUpperCase()}`
    : '';
  return sanitizePdfFilename(
    `${datos.alumno.apellidos}, ${datos.alumno.nombres} - ${prefix}${suffix}`,
  );
}

export function formatInformeZipFilename(datos: InformeDocumentSnapshot['datos']): string {
  if (!datos?.curso) {
    return 'informes.zip';
  }
  const subjLabel = datos.materia?.etiquetaPdf
    ? ` - ${datos.materia.etiquetaPdf.toUpperCase()}`
    : '';
  return `${sanitizePdfFilename(
    `${datos.curso.nombre}${subjLabel} - INFORMES ${datos.ciclo.ano}`,
  )}.zip`;
}

export function downloadInformeProof(
  instanciaId: string,
  inscripcionId: string,
  huella: string,
  signal: AbortSignal,
): Promise<GeneratedPdfResponse> {
  return requestGeneratedPdf(
    import.meta.env.DEV ? '/__cys/pdf-informe' : `${pb.baseURL}/api/cys/pdf/informe/generar`,
    { instanciaId, inscripcionId, huella },
    signal,
    'informe.pdf',
    'No se pudo generar el PDF del informe.',
  );
}
