import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ClientResponseError } from 'pocketbase';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import ui from '../../../shared/styles/ui.module.css';
import {
  TIPOS_INFORME_META,
  type AlumnoInformeRow,
  type RevisionInformeData,
} from '../models/informe.model';
import { createStaffInformeAccess } from '../models/informeAccess.model';
import { informesService } from '../services/informes.service';
import { useInformesRealtime } from '../hooks/useInformesRealtime';
import { VistaInformePorAlumno } from './VistaInformePorAlumno';
import { EditarDocenteInformeModal } from './EditarDocenteInformeModal';
import { DownloadInformeButton } from './DownloadInformeButton';
const BatchInformeModal = React.lazy(() => import('./BatchInformeModal'));
import styles from './RevisionInformePage.module.css';

const { Text } = Typography;

interface RevisionInformePageProps {
  instanciaId: string;
  selectedInscripcionId: string | null;
  onSelectInscripcion: (inscripcionId: string | null) => void;
  onBackToDashboard: () => void;
}

export const RevisionInformePage: React.FC<RevisionInformePageProps> = ({
  instanciaId,
  selectedInscripcionId,
  onSelectInscripcion,
  onBackToDashboard,
}) => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();

  const [review, setReview] = useState<RevisionInformeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [detailHasChanges, setDetailHasChanges] = useState(false);
  const [editingTeacherOpen, setEditingTeacherOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  const detailHasChangesRef = useRef(false);
  useEffect(() => {
    detailHasChangesRef.current = detailHasChanges;
  }, [detailHasChanges]);

  const fetchReview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await informesService.getRevision(instanciaId);
      setReview(data);
    } catch (err) {
      console.error(err);
      if (!silent) {
        message.error('No se pudo cargar la revisión del informe');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [instanciaId, message]);

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      setLoading(true);
      try {
        const data = await informesService.getRevision(instanciaId);
        if (active) setReview(data);
      } catch (err) {
        if (!active) return;
        console.error(err);
        message.error('No se pudo cargar la revisión del informe');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInitial();
    return () => {
      active = false;
    };
  }, [instanciaId, message]);

  const handleRealtimeChange = useCallback(() => {
    if (detailHasChangesRef.current) return;
    void fetchReview(true);
  }, [fetchReview]);

  useInformesRealtime(handleRealtimeChange);

  const staffAccess = useMemo(() => {
    const totalItems = review?.items.length || 0;
    const ds = informesService.createStaffDataSource(instanciaId, totalItems);
    return createStaffInformeAccess(ds);
  }, [instanciaId, review?.items.length]);

  const alumnosList = useMemo<AlumnoInformeRow[]>(() => {
    if (!review) return [];
    return review.informes.map((inf) => ({
      inscripcionId: inf.inscripcionId,
      numeroOrden: inf.numeroOrden,
      apellidos: inf.apellidos,
      nombres: inf.nombres,
      nombreCompleto: inf.nombreCompleto,
      completo: inf.completo,
      itemsRespondidos: inf.itemsRespondidos,
      totalItems: inf.totalItems,
      desempenoGeneralCompleto: Boolean(
        !review.plantilla.requiereDesempenoGeneral || inf.desempenoGeneralValor,
      ),
      estadoVisado: inf.estado,
    }));
  }, [review]);

  const selectedStudentReport = useMemo(
    () => review?.informes.find((inf) => inf.inscripcionId === selectedInscripcionId) || null,
    [review?.informes, selectedInscripcionId],
  );

  const handleBack = () => {
    const goBackAction = () => {
      setDetailHasChanges(false);
      if (selectedInscripcionId) {
        onSelectInscripcion(null);
      } else {
        onBackToDashboard();
      }
    };
    if (!detailHasChanges) {
      goBackAction();
      return;
    }
    modal.confirm({
      title: '¿Volver sin guardar?',
      content: 'Los cambios pendientes de este alumno se perderán.',
      okText: 'Volver sin guardar',
      okType: 'danger',
      cancelText: 'Continuar revisando',
      onOk: goBackAction,
    });
  };

  const handleSyncEnrollments = async () => {
    if (!review) return;
    setApprovalBusy(true);
    try {
      const res = await informesService.sincronizarMatricula(
        instanciaId,
        review.instancia.revision,
      );
      message.success(`${res.incorporados} alumno(s) incorporado(s) a la revisión`);
      await fetchReview();
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 409) {
        message.warning('El informe cambió en otra sesión. Se actualizó el listado.');
        await fetchReview();
      } else {
        const msg = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'No se pudo actualizar la matrícula de la revisión';
        message.error(msg);
      }
    } finally {
      setApprovalBusy(false);
    }
  };

  const handleToggleApproval = () => {
    if (!review || !selectedStudentReport || detailHasChanges || approvalBusy) return;
    const approve = selectedStudentReport.estado !== 'VISADO';
    if (approve && !selectedStudentReport.completo) {
      message.warning('Completá todos los ítems y el desempeño general del alumno antes de visar su informe.');
      return;
    }
    modal.confirm({
      title: approve ? '¿Visar este informe?' : '¿Quitar el visado?',
      content: approve
        ? 'Confirmás que revisaste el informe completo del alumno. Una corrección posterior retirará automáticamente el visado.'
        : 'El informe volverá a quedar pendiente de revisión y los PDFs emitidos de este informe dejarán de estar vigentes.',
      okText: approve ? 'Visar' : 'Quitar visado',
      cancelText: 'Cancelar',
      onOk: async () => {
        setApprovalBusy(true);
        try {
          await informesService.cambiarVisado(
            instanciaId,
            selectedStudentReport.inscripcionId,
            review.instancia.revision,
            selectedStudentReport.revisionContenido,
            approve,
          );
          message.success(approve ? 'Informe visado' : 'Visado quitado');
          await fetchReview(true);
        } catch (error) {
          if (error instanceof ClientResponseError && error.status === 409) {
            message.warning('El informe cambió en otra sesión. Se actualizará el estado.');
            await fetchReview();
          } else {
            message.error('No se pudo actualizar el visado del informe');
          }
          throw error;
        } finally {
          setApprovalBusy(false);
        }
      },
    });
  };

  const tipoMeta = review ? TIPOS_INFORME_META[review.instancia.tipoInforme] : null;
  const teacherFullName = review
    ? `${review.instancia.docenteApellido}, ${review.instancia.docenteNombre}`.trim()
    : '';

  return (
    <SectionLayout
      title="Informes"
      icon={<FileTextOutlined />}
      actions={
        <Space size="middle" wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            {selectedInscripcionId ? 'Volver al listado del curso' : 'Volver al tablero'}
          </Button>
          {review && !selectedInscripcionId && (
            <Button
              disabled={detailHasChanges || review.visados === 0}
              onClick={() => setBatchModalOpen(true)}
            >
              PDFs del curso
            </Button>
          )}
          <Tooltip title="Actualizar datos">
            <Button
              icon={<ReloadOutlined />}
              disabled={detailHasChanges}
              loading={loading}
              onClick={() => void fetchReview()}
              aria-label="Actualizar datos"
            />
          </Tooltip>
        </Space>
      }
    >
      {loading && !review ? (
        <Card className={ui.loadingPanel}>
          <Spin size="large" description="Cargando revisión del informe..." />
        </Card>
      ) : !review ? (
        <Alert
          type="error"
          showIcon
          title="No se pudo consultar la revisión del informe"
          action={<Button onClick={() => void fetchReview()}>Reintentar</Button>}
        />
      ) : (
        <>
          <div className={styles.headerBanner}>
            <div className={styles.headerIdentity}>
              <span className={styles.iconBox} aria-hidden="true">
                <TeamOutlined />
              </span>
              <div className={styles.headerTextGroup}>
                <Typography.Title level={4} className={styles.title}>
                  {review.curso.nombre} · {review.curso.turno}
                  {review.materia ? ` — ${review.materia.nombre}` : ''}
                </Typography.Title>
                <Typography.Text type="secondary" className={styles.subtitle}>
                  {tipoMeta?.tituloCorto || review.instancia.tipoInforme} · Ciclo {review.ciclo.ano}
                </Typography.Text>
              </div>
            </div>

            <div className={styles.teacherMeta}>
              <Tag icon={<UserOutlined />} color="blue" style={{ margin: 0, fontWeight: 600 }}>
                Docente: {teacherFullName}
              </Tag>
              <Button
                size="small"
                icon={<EditOutlined />}
                disabled={detailHasChanges}
                onClick={() => setEditingTeacherOpen(true)}
              >
                Editar docente
              </Button>
            </div>
          </div>

          {review.alumnosSinIncorporar > 0 && (
            <Alert
              type="warning"
              showIcon
              title={`${review.alumnosSinIncorporar} alumno(s) ingresaron después de la entrega`}
              description="Incorporalos a la revisión para completar sus informes sin modificar los visados existentes."
              action={
                <Button loading={approvalBusy} onClick={() => void handleSyncEnrollments()}>
                  Actualizar matrícula
                </Button>
              }
            />
          )}

          {selectedInscripcionId && selectedStudentReport ? (
            <>
              {!selectedStudentReport.preparacionDocumental.completa && (
                <Alert
                  type="warning"
                  showIcon
                  title="Faltan datos documentales para emitir el PDF de este informe"
                  description={selectedStudentReport.preparacionDocumental.faltantes
                    .map((f) => f.mensaje)
                    .join(' ')}
                  action={
                    <Space size={8}>
                      {selectedStudentReport.preparacionDocumental.faltantes.some(
                        (f) => f.origen === 'docente',
                      ) && (
                        <Button size="small" onClick={() => setEditingTeacherOpen(true)}>
                          Completar docente
                        </Button>
                      )}
                      {selectedStudentReport.preparacionDocumental.faltantes.some(
                        (f) => f.origen === 'alumno',
                      ) && (
                        <Button
                          size="small"
                          onClick={() =>
                            navigate(
                              `/app/alumnos?alumno=${encodeURIComponent(selectedStudentReport.preparacionDocumental.alumnoId)}`,
                            )
                          }
                        >
                          Abrir ficha del alumno
                        </Button>
                      )}
                    </Space>
                  }
                />
              )}

              <VistaInformePorAlumno
                key={`${instanciaId}:${selectedInscripcionId}`}
                plantilla={review.plantilla}
                items={review.items}
                alumnos={alumnosList}
                access={staffAccess}
                readOnly
                workflowRevision={review.instancia.revision}
                initialInscripcionId={selectedInscripcionId}
                onStudentChange={(nextId) => onSelectInscripcion(nextId)}
                studentNavigationDisabled={approvalBusy}
                onPendingChangesChange={setDetailHasChanges}
                onSaveSuccess={() => void fetchReview(true)}
                reviewControls={
                  <div className={styles.reviewControls}>
                    <Tag
                      color={selectedStudentReport.estado === 'VISADO' ? 'success' : 'warning'}
                      icon={
                        selectedStudentReport.estado === 'VISADO' ? (
                          <CheckCircleOutlined />
                        ) : (
                          <ClockCircleOutlined />
                        )
                      }
                      className={styles.reviewStatus}
                    >
                      {selectedStudentReport.estado === 'VISADO' ? 'VISADO' : 'SIN VISAR'}
                    </Tag>
                    <Button
                      type={selectedStudentReport.estado === 'VISADO' ? 'default' : 'primary'}
                      disabled={detailHasChanges}
                      loading={approvalBusy}
                      onClick={handleToggleApproval}
                    >
                      {selectedStudentReport.estado === 'VISADO' ? 'Quitar visado' : 'Visar'}
                    </Button>
                    <DownloadInformeButton
                      instanciaId={review.instancia.id}
                      inscripcionId={selectedStudentReport.inscripcionId}
                      disabled={
                        detailHasChanges ||
                        approvalBusy ||
                        !selectedStudentReport.elegibilidadPdf.elegibleParaPdf
                      }
                    />
                  </div>
                }
              />
            </>
          ) : (
            <Card className={styles.container} styles={{ body: { padding: 0 } }}>
              <div className={styles.toolbar}>
                <Space size={8} wrap>
                  <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>
                    Plantilla: {review.plantilla.tituloTabla} ({review.items.length} ítems)
                  </Tag>
                </Space>
                <Tag
                  color={
                    review.visados === review.totalInformes && review.totalInformes > 0
                      ? 'success'
                      : 'processing'
                  }
                  className={styles.reviewProgress}
                >
                  {review.visados} de {review.totalInformes} informes visados
                </Tag>
              </div>

              <div className={styles.content}>
                {review.informes.length === 0 ? (
                  <Empty description="No hay informes entregados en este curso" />
                ) : (
                  <Row gutter={[12, 12]}>
                    {review.informes.map((inf, idx) => (
                      <Col xs={24} md={12} key={inf.inscripcionId}>
                        <button
                          type="button"
                          className={styles.studentCard}
                          onClick={() => onSelectInscripcion(inf.inscripcionId)}
                        >
                          <div className={styles.studentIdentity}>
                            <span className={styles.orderNumber}>
                              {inf.numeroOrden ?? idx + 1}
                            </span>
                            <div className={styles.studentName}>
                              <Text strong>{inf.nombreCompleto}</Text>
                              <div className={styles.studentTags}>
                                <Tag
                                  className={styles.statusTag}
                                  color={inf.estado === 'VISADO' ? 'success' : 'warning'}
                                >
                                  {inf.estado === 'VISADO' ? 'Visado' : 'Pendiente de visado'}
                                </Tag>
                                {!inf.completo && (
                                  <Tag color="error" className={styles.secondaryTag}>
                                    Incompleto ({inf.itemsRespondidos}/{inf.totalItems})
                                  </Tag>
                                )}
                                {!inf.preparacionDocumental.completa && (
                                  <Tag color="warning" className={styles.secondaryTag}>
                                    Faltan datos para PDF
                                  </Tag>
                                )}
                              </div>
                            </div>
                          </div>
                          <ArrowRightOutlined className={styles.arrow} />
                        </button>
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            </Card>
          )}

          <EditarDocenteInformeModal
            open={editingTeacherOpen}
            instanciaId={review.instancia.id}
            docenteNombreInicial={review.instancia.docenteNombre}
            docenteApellidoInicial={review.instancia.docenteApellido}
            expectedRevision={review.instancia.revision}
            onClose={() => setEditingTeacherOpen(false)}
            onSaved={() => void fetchReview(true)}
          />

          {batchModalOpen && (
            <React.Suspense fallback={null}>
              <BatchInformeModal
                instanciaId={review.instancia.id}
                scopeTitle={`${review.curso.nombre}${review.materia ? ` — ${review.materia.nombre}` : ''}`}
                onClose={() => setBatchModalOpen(false)}
                onReview={(inscripcionId) => onSelectInscripcion(inscripcionId)}
              />
            </React.Suspense>
          )}
        </>
      )}
    </SectionLayout>
  );
};
