import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { InformeDocument } from './InformeDocument';
import type { InformeDocumentSnapshot, InformeDocumentSnapshotDatos } from './informeSnapshot.model';

export function RenderInformeDocument({ data }: { data: InformeDocumentSnapshotDatos }) {
  useEffect(() => {
    void (async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      document.body.dataset.renderState = 'ready';
    })().catch((error: Error) => {
      document.body.dataset.renderError = error.message;
      document.body.dataset.renderState = 'error';
    });
  }, []);
  return <InformeDocument data={data} />;
}

if (import.meta.env.DEV || import.meta.env.VITE_DOCUMENT_RENDER === 'true') {
  void fetch('/__cys/render-informe-input')
    .then(async (response) => {
      if (!response.ok) throw new Error('No hay una instantánea de informe para renderizar.');
      const snapshot = (await response.json()) as InformeDocumentSnapshot;
      createRoot(document.getElementById('root')!).render(
        <RenderInformeDocument data={snapshot.datos} />,
      );
    })
    .catch((error: Error) => {
      document.body.dataset.renderError = error.message;
      document.body.dataset.renderState = 'error';
    });
}
