import { useEffect, useRef, useState } from 'react';
import { App, Button } from 'antd';
import { ClientResponseError } from 'pocketbase';
import { triggerBlobDownload } from './pdfZipBuilder';

export interface SharedDownloadPdfButtonProps {
  disabled: boolean;
  onDownload: (signal: AbortSignal) => Promise<{ blob: Blob; filename: string }>;
  successMessage?: string;
  fallbackReadErrorMessage?: string;
  fallbackDownloadErrorMessage?: string;
}

export function SharedDownloadPdfButton({
  disabled,
  onDownload,
  successMessage = 'Descarga iniciada',
  fallbackReadErrorMessage = 'No se pudo consultar el documento.',
  fallbackDownloadErrorMessage = 'No se pudo descargar el PDF.',
}: SharedDownloadPdfButtonProps) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => {
    if (disabled) controller.current?.abort();
  }, [disabled]);

  const download = async () => {
    if (disabled || controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(true);

    try {
      const { blob, filename } = await onDownload(current.signal);
      current.signal.throwIfAborted();
      triggerBlobDownload(blob, filename);
      message.success(successMessage);
    } catch (cause) {
      if (!current.signal.aborted) {
        message.error(
          cause instanceof ClientResponseError
            ? String(cause.response?.message || fallbackReadErrorMessage)
            : cause instanceof Error
              ? cause.message
              : fallbackDownloadErrorMessage,
        );
      }
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setBusy(false);
      }
    }
  };

  return (
    <Button loading={busy} disabled={disabled} onClick={() => void download()}>
      {busy ? 'Procesando PDF…' : 'Descargar PDF'}
    </Button>
  );
}
