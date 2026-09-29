import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Select, Space, Spin } from 'antd';
import { ClientResponseError } from 'pocketbase';
import { downloadDocumentProof, getDocumentSnapshot } from '../services/documentSnapshot.service';
import { adaptarInstantaneaDocumental } from './documentSnapshot.adapter';
import { institucionBoletin } from './boletinInstitutionalContent';
import { paginasBoletinDelGrado } from './boletinDocument.model';
import { BoletinDocument } from './BoletinDocument';
import styles from './StaffDocumentPreview.module.css';

export default function StaffDocumentPreview({ inscripcionId, periodoId, onClose }: {
  inscripcionId: string;
  periodoId: string;
  onClose: () => void;
}) {
  const [result, setResult] = useState<ReturnType<typeof adaptarInstantaneaDocumental> | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [huella, setHuella] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [emissionId, setEmissionId] = useState<string | null>(null);
  const downloadController = useRef<AbortController | null>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    getDocumentSnapshot(inscripcionId, periodoId).then(snapshot => {
      if (active) {
        setResult(adaptarInstantaneaDocumental(snapshot, institucionBoletin));
        setHuella(snapshot.huella);
      }
    }).catch((cause: unknown) => {
      if (!active) return;
      setError(cause instanceof ClientResponseError
        ? cause.response.message || 'No se pudo consultar la instantánea del boletín.'
        : 'No se pudo preparar la vista previa. Volvé a intentarlo.');
    });
    return () => { active = false; downloadController.current?.abort(); };
  }, [inscripcionId, periodoId, attempt]);
  const documento = result?.documento;
  const generate = async () => {
    if (generating || !huella) return;
    const controller = new AbortController();
    downloadController.current = controller;
    setGenerating(true);
    setGenerationError('');
    try {
      const { blob, filename, emissionId: savedId } = await downloadDocumentProof(inscripcionId, periodoId, huella, controller.signal);
      if (controller.signal.aborted) return;
      setEmissionId(savedId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (cause) {
      if (!controller.signal.aborted) setGenerationError(cause instanceof Error ? cause.message : 'No se pudo generar el PDF.');
    } finally { if (!controller.signal.aborted) setGenerating(false); }
  };
  return <Modal open title="Vista previa del boletín" width="min(1100px, 96vw)" onCancel={onClose}
    style={{ top: 20 }} styles={{ body: { maxHeight: 'calc(100dvh - 150px)', overflow: 'auto' } }}
    footer={<Space>
      <Button type="primary" loading={generating} disabled={!documento || !!error || !!result?.pendientes.length} onClick={() => void generate()}>{emissionId ? 'Descargar PDF' : 'Generar / descargar PDF'}</Button>
      <Button onClick={onClose}>Cerrar</Button>
    </Space>}>
    <Space orientation="vertical" size="middle" className={styles.content}>
      <Alert type={emissionId ? 'success' : 'info'} showIcon title={emissionId ? 'PDF guardado · vigencia comprobada al descargar' : 'Vista previa de revisión · se verificará si existe un PDF vigente al descargar'} />
      {generationError && <Alert type="error" showIcon title="No se pudo generar el PDF" description={generationError} />}
      {error ? <Alert type="error" showIcon title="No se pudo abrir el boletín" description={error}
        action={<Button onClick={() => { setError(''); setResult(null); setAttempt(value => value + 1); }}>Reintentar</Button>} />
        : !result ? <Spin description="Consultando datos y visados…"><div className={styles.loading} /></Spin> : <>
          {result.bloqueos.length > 0 && <Alert type="error" showIcon title="No se puede preparar este boletín"
            description={<ul>{result.bloqueos.map(item => <li key={item}>{item}</li>)}</ul>} />}
          {result.pendientes.length > 0 && <Alert type="warning" showIcon title="Datos pendientes de integración"
            description={result.pendientes.join(' ')} />}
          {documento && <>
            <Select aria-label="Página del boletín" defaultValue={1} className={styles.pageSelect}
              options={paginasBoletinDelGrado(documento.curso.grado).map((title, index) => ({ value: index + 1, label: `${index + 1}. ${title}` }))}
              onChange={page => container.current?.querySelector(`#pagina-${page}`)?.scrollIntoView({ block: 'start' })} />
            <div ref={container} className={styles.viewport}><BoletinDocument data={documento} /></div>
          </>}
        </>}
    </Space>
  </Modal>;
}
