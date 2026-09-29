import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BoletinDocument } from './BoletinDocument';
import { adaptarInstantaneaDocumental } from './documentSnapshot.adapter';
import { institucionBoletin } from './boletinInstitutionalContent';
import type { DocumentSnapshot } from './documentSnapshot.model';
import type { BoletinDocumentData } from './boletinDocument.model';
import './preview.css';

export function RenderDocument({ data }: { data: BoletinDocumentData }) {
  useEffect(() => {
    void (async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode()));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!document.fonts.check('700 16px "Merriweather Boletin"') || !document.fonts.check('700 16px "Lato Boletin"')) throw new Error('No se cargaron las fuentes del boletín.');
      if (document.querySelector('[data-text-overflow="true"]')) throw new Error('Una consigna no cabe en la plantilla.');
      document.body.dataset.renderState = 'ready';
    })().catch((error: Error) => {
      document.body.dataset.renderError = error.message;
      document.body.dataset.renderState = 'error';
    });
  }, []);
  return <BoletinDocument data={data} />;
}

if (import.meta.env.DEV) {
  void fetch('/__cys/render-input').then(async response => {
    if (!response.ok) throw new Error('No hay una instantánea para renderizar.');
    const snapshot = await response.json() as DocumentSnapshot;
    const result = adaptarInstantaneaDocumental(snapshot, institucionBoletin);
    if (!result.documento || result.bloqueos.length || result.pendientes.length) throw new Error([...result.bloqueos, ...result.pendientes].join(' '));
    createRoot(document.getElementById('root')!).render(<RenderDocument data={result.documento} />);
  }).catch((error: Error) => {
    document.body.dataset.renderError = error.message;
    document.body.dataset.renderState = 'error';
  });
}
