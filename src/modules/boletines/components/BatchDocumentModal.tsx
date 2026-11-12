import { useCallback } from 'react';
import { ClientResponseError } from 'pocketbase';
import {
  type BatchStudentReviewItem,
  type PreparedStudentPdf,
  SharedBatchPdfModal,
} from '../../../shared/pdf';
import {
  DocumentPdfError,
  downloadDocumentProof,
  formatBulletinPdfBaseName,
  formatBulletinZipFilename,
  getDocumentSnapshot,
} from '../services/documentSnapshot.service';
import { getStaffGradebookReview } from '../services/gradebookDataSource.service';

export default function BatchDocumentModal({
  cursoId,
  periodoId,
  cursoNombre,
  onClose,
  onReview,
}: {
  cursoId: string;
  periodoId: string;
  cursoNombre: string;
  onClose: () => void;
  onReview?: (inscripcionId: string) => void;
}) {
  const loadCourseReview = useCallback(
    async (signal: AbortSignal) => {
      const review = await getStaffGradebookReview(cursoId, periodoId, signal);
      const items: BatchStudentReviewItem[] = review.boletines.map((item) => ({
        inscripcionId: item.inscripcionId,
        nombreCompleto: item.nombreCompleto,
        documentalCompleta: item.preparacionDocumental?.completa !== false,
        mensajesFaltantesDocumentales:
          item.preparacionDocumental?.faltantes.map((issue) => issue.mensaje) || [],
        elegiblePorVisado: Boolean(item.elegibilidadPdf?.elegiblePorVisados),
        motivosVisado: item.elegibilidadPdf?.motivos || [],
        visadoIndeterminado: !item.elegibilidadPdf,
      }));
      return {
        alumnosSinIncorporar: review.alumnosSinIncorporar,
        items,
      };
    },
    [cursoId, periodoId],
  );

  const prepareStudentPdf = useCallback(
    async (inscripcionId: string, signal: AbortSignal) => {
      const snapshot = await getDocumentSnapshot(inscripcionId, periodoId, signal);
      signal.throwIfAborted();
      const pdf = await downloadDocumentProof(inscripcionId, periodoId, snapshot.huella, signal);
      return {
        inscripcionId,
        huella: snapshot.huella,
        baseFilename: formatBulletinPdfBaseName(snapshot.datos),
        bytes: pdf.bytes || new Uint8Array(),
        zipFilename: formatBulletinZipFilename(snapshot.datos),
      };
    },
    [periodoId],
  );

  const revalidateStudentPdf = useCallback(
    async (prepared: PreparedStudentPdf, signal: AbortSignal) => {
      const current = await getDocumentSnapshot(prepared.inscripcionId, periodoId, signal);
      if (
        current.huella !== prepared.huella ||
        (current.datos?.curso && current.datos.curso.id !== cursoId)
      ) {
        throw new DocumentPdfError(
          'Un boletín del lote cambió o dejó de estar disponible. Volvé a preparar el lote.',
          409,
        );
      }
    },
    [cursoId, periodoId],
  );

  const isMissingApprovalError = useCallback(
    (cause: unknown) =>
      cause instanceof ClientResponseError &&
      cause.response?.elegibilidadPdf?.elegiblePorVisados === false,
    [],
  );

  return (
    <SharedBatchPdfModal
      title={`PDFs del curso · ${cursoNombre}`}
      itemSingularLabel="boletín"
      itemPluralLabel="boletín(es)"
      maxItemsErrorMessage="El lote admite hasta 100 boletines por curso."
      emptyCourseMessage="No hay boletines en este curso."
      loadingCourseMessage="Consultando boletines…"
      missingApprovalFallbackMessage="Actualizá el curso para comprobar el visado."
      fallbackReadErrorMessage="No se pudo consultar el boletín."
      fallbackPrepareErrorMessage="No se pudo preparar el boletín."
      loadCourseReview={loadCourseReview}
      prepareStudentPdf={prepareStudentPdf}
      revalidateStudentPdf={revalidateStudentPdf}
      isMissingApprovalError={isMissingApprovalError}
      onClose={onClose}
      onReview={onReview}
    />
  );
}
