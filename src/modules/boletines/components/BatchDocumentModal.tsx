import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Progress, Space, Table, Tag } from 'antd';
import { ClientResponseError } from 'pocketbase';
import { getStaffGradebookReview } from '../services/gradebookDataSource.service';
import { downloadDocumentBatch, downloadDocumentProof, getDocumentSnapshot, type BatchEmission } from '../services/documentSnapshot.service';

interface BatchRow {
  id: string;
  nombre: string;
  estado: 'Pendiente' | 'Preparando' | 'Guardado' | 'Excluido';
  motivo?: string;
}

export default function BatchDocumentModal({ cursoId, periodoId, cursoNombre, onClose }: {
  cursoId: string;
  periodoId: string;
  cursoNombre: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [emissions, setEmissions] = useState<BatchEmission[]>([]);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const [extra, setExtra] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const describe = (cause: unknown) => cause instanceof ClientResponseError
    ? String(cause.response.message || 'No se pudo consultar el boletín.')
    : cause instanceof Error ? cause.message : 'No se pudo preparar el boletín.';
  const prepare = async () => {
    if (controller.current && !controller.current.signal.aborted) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setStarted(true);
    setError('');
    setRows([]);
    setEmissions([]);
    setExtra(0);
    try {
      const review = await getStaffGradebookReview(cursoId, periodoId);
      if (current.signal.aborted) return;
      setExtra(review.alumnosSinIncorporar);
      if (review.boletines.length > 100) throw new Error('El lote admite hasta 100 boletines por curso.');
      setRows(review.boletines.map(item => ({ id: item.inscripcionId, nombre: item.nombreCompleto, estado: 'Pendiente' })));
      for (const item of review.boletines) {
        current.signal.throwIfAborted();
        const update = (estado: BatchRow['estado'], motivo?: string) => setRows(previous => previous.map(row => row.id === item.inscripcionId ? { ...row, estado, motivo } : row));
        if (!item.elegibilidadPdf?.elegiblePorVisados) {
          update('Excluido', item.elegibilidadPdf?.motivos.join(' ') || 'Faltan visados vigentes.');
          continue;
        }
        update('Preparando');
        try {
          const snapshot = await getDocumentSnapshot(item.inscripcionId, periodoId, current.signal);
          current.signal.throwIfAborted();
          const pdf = await downloadDocumentProof(item.inscripcionId, periodoId, snapshot.huella, current.signal);
          current.signal.throwIfAborted();
          if (!pdf.emissionId) throw new Error('El PDF no quedó almacenado. Revisá la configuración del generador.');
          setEmissions(previous => [...previous, { inscripcionId: item.inscripcionId, huella: snapshot.huella, emisionId: pdf.emissionId! }]);
          update('Guardado');
        } catch (cause) {
          if (current.signal.aborted) return;
          update('Excluido', describe(cause));
        }
      }
    } catch (cause) {
      if (!current.signal.aborted) setError(describe(cause));
    } finally {
      if (!current.signal.aborted) { setBusy(false); controller.current = null; }
    }
  };
  const download = async () => {
    if (controller.current || !emissions.length) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setError('');
    try {
      const { blob, filename } = await downloadDocumentBatch(cursoId, periodoId, emissions, current.signal);
      current.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (cause) {
      if (!current.signal.aborted) setError(describe(cause));
    } finally {
      if (!current.signal.aborted) { setBusy(false); controller.current = null; }
    }
  };
  const close = () => { controller.current?.abort(); onClose(); };
  const processed = rows.filter(row => row.estado === 'Guardado' || row.estado === 'Excluido').length;
  const excluded = rows.filter(row => row.estado === 'Excluido').length;
  return <Modal open title={`PDFs del curso · ${cursoNombre}`} width={850} onCancel={close}
    footer={<Space wrap>
      <Button onClick={close}>{busy ? 'Interrumpir y cerrar' : 'Cerrar'}</Button>
      <Button disabled={busy} onClick={() => void prepare()}>{started ? 'Volver a preparar' : 'Preparar PDFs del curso'}</Button>
      <Button type="primary" loading={busy} disabled={busy || !emissions.length} onClick={() => void download()}>
        Descargar ZIP ({emissions.length} PDFs)
      </Button>
    </Space>}>
    <Space orientation="vertical" size="middle">
      <Alert type="info" showIcon title="Se incluirán los boletines con todos sus visados vigentes"
        description="Se reutilizan los PDFs ya guardados. Mantené esta ventana abierta durante la preparación; al descargar se vuelve a comprobar la vigencia del lote." />
      {!!error && <Alert type="error" showIcon title={error} />}
      {!!extra && <Alert type="warning" showIcon title={`${extra} alumno(s) todavía no incorporados a la revisión: no se incluirán.`} />}
      {!!excluded && <Alert type="warning" showIcon title={`${excluded} boletín(es) excluido(s). El ZIP incluirá sólo los ${emissions.length} preparados.`} />}
      {started && <Progress percent={rows.length ? Math.round(processed / rows.length * 100) : 0} status={busy ? 'active' : excluded || error ? 'exception' : undefined} />}
      <Table<BatchRow> size="small" rowKey="id" dataSource={rows} pagination={false} scroll={{ y: 320 }} columns={[
        { title: 'Alumno/a', dataIndex: 'nombre' },
        { title: 'Estado', dataIndex: 'estado', render: (estado: BatchRow['estado']) => <Tag color={estado === 'Guardado' ? 'success' : estado === 'Excluido' ? 'warning' : 'processing'}>{estado}</Tag> },
        { title: 'Detalle', dataIndex: 'motivo' },
      ]} />
    </Space>
  </Modal>;
}
