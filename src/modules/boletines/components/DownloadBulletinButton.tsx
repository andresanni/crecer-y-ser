import { useCallback } from 'react';
import { SharedDownloadPdfButton } from '../../../shared/pdf';
import { downloadDocumentProof, getDocumentSnapshot } from '../services/documentSnapshot.service';

export function DownloadBulletinButton({
  inscripcionId,
  periodoId,
  disabled,
}: {
  inscripcionId: string;
  periodoId: string;
  disabled: boolean;
}) {
  const handleDownload = useCallback(
    async (signal: AbortSignal) => {
      const snapshot = await getDocumentSnapshot(inscripcionId, periodoId, signal);
      signal.throwIfAborted();
      return downloadDocumentProof(inscripcionId, periodoId, snapshot.huella, signal);
    },
    [inscripcionId, periodoId],
  );

  return (
    <SharedDownloadPdfButton
      disabled={disabled}
      onDownload={handleDownload}
      successMessage="Descarga iniciada"
      fallbackReadErrorMessage="No se pudo consultar el boletín."
      fallbackDownloadErrorMessage="No se pudo descargar el PDF."
    />
  );
}
