import { useCallback } from 'react';
import { SharedDownloadPdfButton } from '../../../shared/pdf';
import {
  downloadInformeProof,
  getInformeDocumentSnapshot,
} from '../services/informePdf.service';

export function DownloadInformeButton({
  instanciaId,
  inscripcionId,
  disabled,
}: {
  instanciaId: string;
  inscripcionId: string;
  disabled: boolean;
}) {
  const handleDownload = useCallback(
    async (signal: AbortSignal) => {
      const snapshot = await getInformeDocumentSnapshot(instanciaId, inscripcionId, signal);
      signal.throwIfAborted();
      return downloadInformeProof(instanciaId, inscripcionId, snapshot.huella, signal);
    },
    [instanciaId, inscripcionId],
  );

  return (
    <SharedDownloadPdfButton
      disabled={disabled}
      onDownload={handleDownload}
      successMessage="Descarga de informe iniciada"
      fallbackReadErrorMessage="No se pudo consultar el informe."
      fallbackDownloadErrorMessage="No se pudo descargar el PDF del informe."
    />
  );
}
