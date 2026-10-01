import { useEffect, useRef, useState } from 'react';
import { App, Button } from 'antd';
import { ClientResponseError } from 'pocketbase';
import { downloadDocumentProof, getDocumentSnapshot } from '../services/documentSnapshot.service';

export function DownloadBulletinButton({ inscripcionId, periodoId, disabled }: {
  inscripcionId: string;
  periodoId: string;
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
      const snapshot = await getDocumentSnapshot(inscripcionId, periodoId, current.signal);
      current.signal.throwIfAborted();
      const { blob, filename } = await downloadDocumentProof(inscripcionId, periodoId, snapshot.huella, current.signal);
      current.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      message.success('Descarga iniciada');
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (cause) {
      if (!current.signal.aborted) {
        message.error(cause instanceof ClientResponseError
          ? String(cause.response.message || 'No se pudo consultar el boletín.')
          : cause instanceof Error ? cause.message : 'No se pudo descargar el PDF.');
      }
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setBusy(false);
      }
    }
  };

  return <Button loading={busy} disabled={disabled} onClick={() => void download()}>{busy ? 'Procesando PDF…' : 'Descargar PDF'}</Button>;
}
