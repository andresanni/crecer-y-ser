import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { ClientResponseError } from 'pocketbase';
import { informesService } from '../services/informes.service';
import {
  downloadInformeBatch,
  downloadInformeProof,
  getInformeDocumentSnapshot,
  InformePdfError,
  type InformeBatchEmission,
} from '../services/informePdf.service';

interface BatchRow {
  id: string;
  nombre: string;
  estado:
    | 'Por comprobar'
    | 'Procesando PDF…'
    | 'PDF listo'
    | 'Falta visar'
    | 'Revisar datos'
    | 'Reintentar';
  motivo?: string;
}

const describe = (cause: unknown) =>
  cause instanceof ClientResponseError
    ? String(cause.response.message || 'No se pudo consultar el informe.')
    : cause instanceof Error
      ? cause.message
      : 'No se pudo preparar el informe.';

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
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [emissions, setEmissions] = useState<InformeBatchEmission[]>([]);
  const [operation, setOperation] = useState<'pdfs' | 'zip' | null>('pdfs');
  const busy = operation !== null;
  const [reviewLoading, setReviewLoading] = useState(true);
  const [error, setError] = useState('');
  const [extra, setExtra] = useState(0);
  const controller = useRef<AbortController | null>(null);

  const prepare = useCallback(async () => {
    if (controller.current && !controller.current.signal.aborted) return;
    const current = new AbortController();
    controller.current = current;
    setOperation('pdfs');
    setReviewLoading(true);
    setError('');
    setRows([]);
    setEmissions([]);
    setExtra(0);
    try {
      const review = await informesService.getRevision(instanciaId, current.signal);
      if (current.signal.aborted) return;
      setReviewLoading(false);
      setExtra(review.alumnosSinIncorporar);
      if (review.informes.length > 100) {
        throw new Error('El lote admite hasta 100 informes por curso.');
      }
      setRows(
        review.informes.map((item) => ({
          id: item.inscripcionId,
          nombre: item.nombreCompleto,
          estado: 'Por comprobar',
        })),
      );
      for (const item of review.informes) {
        current.signal.throwIfAborted();
        const update = (estado: BatchRow['estado'], motivo?: string) =>
          setRows((previous) =>
            previous.map((row) =>
              row.id === item.inscripcionId ? { ...row, estado, motivo } : row,
            ),
          );
        if (!item.preparacionDocumental.completa) {
          update(
            'Revisar datos',
            item.preparacionDocumental.faltantes.map((issue) => issue.mensaje).join(' '),
          );
          continue;
        }
        if (!item.elegibilidadPdf.elegiblePorVisado) {
          update(
            'Falta visar',
            item.elegibilidadPdf.motivos.join(' ') ||
              'Actualizá el informe para comprobar el visado.',
          );
          continue;
        }
        update('Procesando PDF…');
        try {
          const snapshot = await getInformeDocumentSnapshot(
            instanciaId,
            item.inscripcionId,
            current.signal,
          );
          current.signal.throwIfAborted();
          const pdf = await downloadInformeProof(
            instanciaId,
            item.inscripcionId,
            snapshot.huella,
            current.signal,
          );
          current.signal.throwIfAborted();
          if (!pdf.emissionId) {
            throw new Error('No se pudo preparar el PDF. Volvé a intentarlo.');
          }
          setEmissions((previous) => [
            ...previous,
            {
              inscripcionId: item.inscripcionId,
              huella: snapshot.huella,
              emisionId: pdf.emissionId!,
            },
          ]);
          update('PDF listo');
        } catch (cause) {
          if (current.signal.aborted) return;
          if (cause instanceof InformePdfError && cause.status === 429) {
            setError(
              'El servicio está terminando otro PDF. Esperá unos segundos y seleccioná Actualizar PDFs del curso.',
            );
          }
          const needsReview =
            (cause instanceof ClientResponseError || cause instanceof InformePdfError) &&
            cause.status === 422;
          const missingApproval =
            cause instanceof ClientResponseError &&
            cause.response.elegibilidadPdf?.elegiblePorVisado === false;
          update(
            missingApproval ? 'Falta visar' : needsReview ? 'Revisar datos' : 'Reintentar',
            describe(cause),
          );
        }
      }
    } catch (cause) {
      if (!current.signal.aborted) setError(describe(cause));
    } finally {
      if (!current.signal.aborted && controller.current === current) {
        setOperation(null);
        setReviewLoading(false);
        controller.current = null;
      }
    }
  }, [instanciaId]);

  useEffect(() => {
    const start = window.setTimeout(() => void prepare(), 0);
    return () => {
      window.clearTimeout(start);
      controller.current?.abort();
    };
  }, [prepare]);

  const download = async () => {
    if (controller.current || !emissions.length) return;
    const current = new AbortController();
    controller.current = current;
    setOperation('zip');
    setError('');
    try {
      const { blob, filename } = await downloadInformeBatch(
        instanciaId,
        emissions,
        current.signal,
      );
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
      if (!current.signal.aborted) {
        setOperation(null);
        controller.current = null;
      }
    }
  };

  const close = () => {
    controller.current?.abort();
    onClose();
  };

  const processed = rows.filter(
    (row) => row.estado !== 'Por comprobar' && row.estado !== 'Procesando PDF…',
  ).length;
  const pendingApproval = rows.filter((row) => row.estado === 'Falta visar').length;
  const needsReview = rows.filter((row) => row.estado === 'Revisar datos').length;
  const failed = rows.filter((row) => row.estado === 'Reintentar').length;

  return (
    <Modal
      open
      title={`PDFs del curso · ${scopeTitle}`}
      width={850}
      onCancel={close}
      footer={
        <Space wrap>
          <Button onClick={close}>{busy ? 'Interrumpir y cerrar' : 'Cerrar'}</Button>
          <Button
            loading={operation === 'pdfs'}
            disabled={busy}
            onClick={() => void prepare()}
          >
            {operation === 'pdfs' ? 'Procesando PDFs…' : 'Actualizar PDFs del curso'}
          </Button>
          <Button
            type="primary"
            loading={operation === 'zip'}
            disabled={busy || !emissions.length}
            onClick={() => void download()}
          >
            {operation === 'zip'
              ? 'Descargando PDFs…'
              : `Descargar PDFs (${emissions.length})`}
          </Button>
        </Space>
      }
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {!!error && <Alert type="error" showIcon title={error} />}
        {!!extra && (
          <Alert
            type="warning"
            showIcon
            title={`${extra} alumno(s) todavía no incorporados a la revisión: no se incluirán.`}
          />
        )}
        {!!pendingApproval && (
          <Alert
            type="warning"
            showIcon
            title={`${pendingApproval} informe(s) pendientes de visado. La descarga incluirá sólo los PDFs listos.`}
          />
        )}
        {!!needsReview && (
          <Alert
            type="warning"
            showIcon
            title={`${needsReview} informe(s) requieren revisar sus datos antes de descargar.`}
          />
        )}
        {!!failed && (
          <Alert
            type="error"
            showIcon
            title={`No se pudieron obtener ${failed} PDF(s). Podés volver a intentarlo con Actualizar PDFs del curso.`}
          />
        )}
        {rows.length > 0 && (
          <Progress
            percent={rows.length ? Math.round((processed / rows.length) * 100) : 0}
            status={
              operation === 'pdfs'
                ? 'active'
                : failed || error
                  ? 'exception'
                  : pendingApproval || needsReview
                    ? 'normal'
                    : undefined
            }
          />
        )}
        {operation !== 'pdfs' && emissions.length > 0 && (
          <Typography.Text>{emissions.length} PDFs listos para descargar.</Typography.Text>
        )}
        <Table<BatchRow>
          loading={reviewLoading}
          locale={{
            emptyText: reviewLoading
              ? 'Consultando informes…'
              : error
                ? 'No se pudo consultar el curso.'
                : 'No hay informes en este curso.',
          }}
          size="small"
          rowKey="id"
          dataSource={rows}
          pagination={false}
          scroll={{ y: 320 }}
          columns={[
            { title: 'Alumno/a', dataIndex: 'nombre' },
            {
              title: 'Estado',
              dataIndex: 'estado',
              render: (estado: BatchRow['estado'], row) => (
                <Space wrap>
                  <Tooltip title={row.motivo}>
                    <Tag
                      color={
                        estado === 'PDF listo'
                          ? 'success'
                          : estado === 'Reintentar'
                            ? 'error'
                            : estado === 'Falta visar' || estado === 'Revisar datos'
                              ? 'warning'
                              : 'processing'
                      }
                    >
                      {estado}
                    </Tag>
                  </Tooltip>
                  {estado === 'Revisar datos' && onReview && (
                    <Button
                      size="small"
                      onClick={() => {
                        onClose();
                        onReview(row.id);
                      }}
                    >
                      Completar datos
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Space>
    </Modal>
  );
}
