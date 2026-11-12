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
import { describePdfError, PdfGenerationError } from './pdfError';
import { buildInMemoryPdfZip, triggerBlobDownload } from './pdfZipBuilder';

export type BatchRowStatus =
  | 'Por comprobar'
  | 'Procesando PDF…'
  | 'PDF listo'
  | 'Falta visar'
  | 'Revisar datos'
  | 'Reintentar';

export interface BatchStudentReviewItem {
  inscripcionId: string;
  nombreCompleto: string;
  documentalCompleta: boolean;
  mensajesFaltantesDocumentales: string[];
  elegiblePorVisado: boolean;
  motivosVisado: string[];
  visadoIndeterminado?: boolean;
}

export interface PreparedStudentPdf {
  inscripcionId: string;
  huella: string;
  baseFilename: string;
  bytes: Uint8Array;
  zipFilename: string;
}

export interface SharedBatchPdfModalProps {
  title: string;
  itemSingularLabel: string;
  itemPluralLabel: string;
  maxItemsErrorMessage: string;
  emptyCourseMessage: string;
  loadingCourseMessage: string;
  missingApprovalFallbackMessage: string;
  fallbackReadErrorMessage: string;
  fallbackPrepareErrorMessage: string;
  loadCourseReview: (signal: AbortSignal) => Promise<{
    alumnosSinIncorporar: number;
    items: BatchStudentReviewItem[];
  }>;
  prepareStudentPdf: (
    inscripcionId: string,
    signal: AbortSignal,
  ) => Promise<PreparedStudentPdf>;
  revalidateStudentPdf?: (
    prepared: PreparedStudentPdf,
    signal: AbortSignal,
  ) => Promise<void>;
  isMissingApprovalError?: (cause: unknown) => boolean;
  onClose: () => void;
  onReview?: (inscripcionId: string) => void;
}

interface BatchRow {
  id: string;
  nombre: string;
  estado: BatchRowStatus;
  motivo?: string;
}

export function SharedBatchPdfModal({
  title,
  itemSingularLabel,
  itemPluralLabel,
  maxItemsErrorMessage,
  emptyCourseMessage,
  loadingCourseMessage,
  missingApprovalFallbackMessage,
  fallbackReadErrorMessage,
  fallbackPrepareErrorMessage,
  loadCourseReview,
  prepareStudentPdf,
  revalidateStudentPdf,
  isMissingApprovalError,
  onClose,
  onReview,
}: SharedBatchPdfModalProps) {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [preparedPdfs, setPreparedPdfs] = useState<PreparedStudentPdf[]>([]);
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
    setPreparedPdfs([]);
    setExtra(0);
    try {
      const review = await loadCourseReview(current.signal);
      if (current.signal.aborted) return;
      setReviewLoading(false);
      setExtra(review.alumnosSinIncorporar);
      if (review.items.length > 100) {
        throw new Error(maxItemsErrorMessage);
      }
      setRows(
        review.items.map((item) => ({
          id: item.inscripcionId,
          nombre: item.nombreCompleto,
          estado: 'Por comprobar',
        })),
      );
      for (const item of review.items) {
        current.signal.throwIfAborted();
        const update = (estado: BatchRowStatus, motivo?: string) =>
          setRows((previous) =>
            previous.map((row) =>
              row.id === item.inscripcionId ? { ...row, estado, motivo } : row,
            ),
          );
        if (!item.documentalCompleta) {
          update('Revisar datos', item.mensajesFaltantesDocumentales.join(' '));
          continue;
        }
        if (!item.elegiblePorVisado) {
          update(
            item.visadoIndeterminado ? 'Revisar datos' : 'Falta visar',
            item.motivosVisado.join(' ') || missingApprovalFallbackMessage,
          );
          continue;
        }
        update('Procesando PDF…');
        try {
          const prepared = await prepareStudentPdf(item.inscripcionId, current.signal);
          current.signal.throwIfAborted();
          setPreparedPdfs((previous) => [...previous, prepared]);
          update('PDF listo');
        } catch (cause) {
          if (current.signal.aborted) return;
          if (cause instanceof PdfGenerationError && cause.status === 429) {
            setError(
              'El servicio está terminando otro PDF. Esperá unos segundos y seleccioná Actualizar PDFs del curso.',
            );
          }
          const needsReview =
            (cause instanceof ClientResponseError || cause instanceof PdfGenerationError) &&
            cause.status === 422;
          const missingApproval = isMissingApprovalError
            ? isMissingApprovalError(cause)
            : false;
          update(
            missingApproval ? 'Falta visar' : needsReview ? 'Revisar datos' : 'Reintentar',
            describePdfError(cause, fallbackReadErrorMessage, fallbackPrepareErrorMessage),
          );
        }
      }
    } catch (cause) {
      if (!current.signal.aborted) {
        setError(describePdfError(cause, fallbackReadErrorMessage, fallbackPrepareErrorMessage));
      }
    } finally {
      if (!current.signal.aborted && controller.current === current) {
        setOperation(null);
        setReviewLoading(false);
        controller.current = null;
      }
    }
  }, [
    fallbackPrepareErrorMessage,
    fallbackReadErrorMessage,
    isMissingApprovalError,
    loadCourseReview,
    maxItemsErrorMessage,
    missingApprovalFallbackMessage,
    prepareStudentPdf,
  ]);

  useEffect(() => {
    const start = window.setTimeout(() => void prepare(), 0);
    return () => {
      window.clearTimeout(start);
      controller.current?.abort();
    };
  }, [prepare]);

  const download = async () => {
    if (controller.current || !preparedPdfs.length) return;
    const current = new AbortController();
    controller.current = current;
    setOperation('zip');
    setError('');
    try {
      if (revalidateStudentPdf) {
        for (const prepared of preparedPdfs) {
          current.signal.throwIfAborted();
          await revalidateStudentPdf(prepared, current.signal);
        }
      }
      current.signal.throwIfAborted();
      const blob = buildInMemoryPdfZip(
        preparedPdfs.map((item) => ({
          baseFilename: item.baseFilename,
          bytes: item.bytes,
        })),
      );
      const zipFilename =
        preparedPdfs[preparedPdfs.length - 1]?.zipFilename || 'DOCUMENTOS.zip';
      triggerBlobDownload(blob, zipFilename);
    } catch (cause) {
      if (!current.signal.aborted) {
        setError(describePdfError(cause, fallbackReadErrorMessage, fallbackPrepareErrorMessage));
      }
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
  const itemDisplayLabel =
    itemPluralLabel ||
    (itemSingularLabel.endsWith('n')
      ? `${itemSingularLabel}(es)`
      : `${itemSingularLabel}(s)`);

  return (
    <Modal
      open
      title={title}
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
            disabled={busy || !preparedPdfs.length}
            onClick={() => void download()}
          >
            {operation === 'zip'
              ? 'Descargando PDFs…'
              : `Descargar PDFs (${preparedPdfs.length})`}
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
            title={`${pendingApproval} ${itemDisplayLabel} pendientes de visado. La descarga incluirá sólo los PDFs listos.`}
          />
        )}
        {!!needsReview && (
          <Alert
            type="warning"
            showIcon
            title={`${needsReview} ${itemDisplayLabel} requieren revisar sus datos antes de descargar.`}
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
        {operation !== 'pdfs' && preparedPdfs.length > 0 && (
          <Typography.Text>{preparedPdfs.length} PDFs listos para descargar.</Typography.Text>
        )}
        <Table<BatchRow>
          loading={reviewLoading}
          locale={{
            emptyText: reviewLoading
              ? loadingCourseMessage
              : error
                ? 'No se pudo consultar el curso.'
                : emptyCourseMessage,
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
              render: (estado: BatchRowStatus, row) => (
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
