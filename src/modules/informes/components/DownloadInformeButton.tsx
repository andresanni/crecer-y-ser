import { useEffect, useRef, useState } from 'react';
import { App, Button } from 'antd';
import { ClientResponseError } from 'pocketbase';
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
      const snapshot = await getInformeDocumentSnapshot(
        instanciaId,
        inscripcionId,
        current.signal,
      );
      current.signal.throwIfAborted();
      const { blob, filename } = await downloadInformeProof(
        instanciaId,
        inscripcionId,
        snapshot.huella,
        current.signal,
      );
      current.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      message.success('Descarga de informe iniciada');
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (cause) {
      if (!current.signal.aborted) {
        message.error(
          cause instanceof ClientResponseError
            ? String(cause.response.message || 'No se pudo consultar el informe.')
            : cause instanceof Error
              ? cause.message
              : 'No se pudo descargar el PDF del informe.',
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
