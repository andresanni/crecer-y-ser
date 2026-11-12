import { useCallback } from 'react';
import { ClientResponseError } from 'pocketbase';
import {
  type BatchStudentReviewItem,
  type PreparedStudentPdf,
  SharedBatchPdfModal,
} from '../../../shared/pdf';
import {
  downloadInformeProof,
  formatInformePdfBaseName,
  formatInformeZipFilename,
  getInformeDocumentSnapshot,
  InformePdfError,
} from '../services/informePdf.service';
import { informesService } from '../services/informes.service';

export default function BatchInformeModal({
  instanciaId,
  scopeTitle,
  onClose,
  onReview,
}: {
  instanciaId: string;
  scopeTitle: string;
  onClose: () => void;
  onReview?: (inscripcionId: string) => void;
}) {
  const loadCourseReview = useCallback(
    async (signal: AbortSignal) => {
      const review = await informesService.getRevision(instanciaId, signal);
      const items: BatchStudentReviewItem[] = review.informes.map((item) => ({
        inscripcionId: item.inscripcionId,
        nombreCompleto: item.nombreCompleto,
        documentalCompleta: item.preparacionDocumental.completa,
        mensajesFaltantesDocumentales:
          item.preparacionDocumental.faltantes.map((issue) => issue.mensaje) || [],
        elegiblePorVisado: item.elegibilidadPdf.elegiblePorVisado,
        motivosVisado: item.elegibilidadPdf.motivos || [],
        visadoIndeterminado: !item.elegibilidadPdf,
      }));
      return {
        alumnosSinIncorporar: review.alumnosSinIncorporar,
        items,
      };
    },
    [instanciaId],
  );

  const prepareStudentPdf = useCallback(
    async (inscripcionId: string, signal: AbortSignal) => {
      const snapshot = await getInformeDocumentSnapshot(instanciaId, inscripcionId, signal);
      signal.throwIfAborted();
      const pdf = await downloadInformeProof(instanciaId, inscripcionId, snapshot.huella, signal);
      return {
        inscripcionId,
        huella: snapshot.huella,
        baseFilename: formatInformePdfBaseName(snapshot.datos),
        bytes: pdf.bytes || new Uint8Array(),
        zipFilename: formatInformeZipFilename(snapshot.datos),
      };
    },
    [instanciaId],
  );

  const revalidateStudentPdf = useCallback(
    async (prepared: PreparedStudentPdf, signal: AbortSignal) => {
      const current = await getInformeDocumentSnapshot(
        instanciaId,
        prepared.inscripcionId,
        signal,
      );
      if (
        current.huella !== prepared.huella ||
        (current.datos && current.datos.instanciaId !== instanciaId)
      ) {
        throw new InformePdfError(
          'Un informe del lote cambió o dejó de estar disponible. Volvé a preparar el lote.',
          409,
        );
      }
    },
    [instanciaId],
  );

  const isMissingApprovalError = useCallback(
    (cause: unknown) =>
      cause instanceof ClientResponseError &&
      cause.response?.elegibilidadPdf?.elegiblePorVisado === false,
    [],
  );

  return (
    <SharedBatchPdfModal
      title={`PDFs del curso · ${scopeTitle}`}
      itemSingularLabel="informe"
      itemPluralLabel="informe(s)"
      maxItemsErrorMessage="El lote admite hasta 100 informes por curso."
      emptyCourseMessage="No hay informes en este curso."
      loadingCourseMessage="Consultando informes…"
      missingApprovalFallbackMessage="Actualizá el informe para comprobar el visado."
      fallbackReadErrorMessage="No se pudo consultar el informe."
      fallbackPrepareErrorMessage="No se pudo preparar el informe."
      loadCourseReview={loadCourseReview}
      prepareStudentPdf={prepareStudentPdf}
      revalidateStudentPdf={revalidateStudentPdf}
      isMissingApprovalError={isMissingApprovalError}
      onClose={onClose}
      onReview={onReview}
    />
  );
}
