import ui from '../../../shared/styles/ui.module.css';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  App,
  Tooltip,
  Empty,
  Spin,
  Alert,
  Tag,
} from 'antd';
import {
  ReloadOutlined,
  TableOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { ClientResponseError } from 'pocketbase';
import { boletinService } from '../services/boletin.service';
import { VistaPorAlumno } from './VistaPorAlumno';
import { RevisionCursoHeader, RevisionCursoOverview } from './RevisionCursoOverview';
import { staffGradebookAccess } from '../models/gradebookAccess.model';
import {
  changeStaffBulletinApproval,
  getStaffGradebookReview,
  getStaffGradebookWorkflow,
  synchronizeStaffReviewEnrollments,
  type StaffReviewDto,
} from '../services/gradebookDataSource.service';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import type {
  CursoMateria,
  Periodo,
  ValorEscala,
  AlumnoInscriptoRow,
  InstanciaCargaBoletin,
} from '../models/boletin.model';
import { useAppStore } from '../../../store/appStore';
import { useGradebookRealtime } from '../hooks/useGradebookRealtime';
import {
  gradebookScopeKey,
  useGradebookConcurrencyStore,
  workflowVersionFromInstance,
} from '../store/gradebookConcurrencyStore';

interface PlanillaCalificacionesPageProps {
  onBackToDashboard?: () => void;
}

export const PlanillaCalificacionesPage: React.FC<PlanillaCalificacionesPageProps> = ({
  onBackToDashboard,
}) => {
  const { message, modal } = App.useApp();
  const { cicloActual } = useAppStore();
  useGradebookRealtime();
  const [searchParams] = useSearchParams();
  const urlCursoId = searchParams.get('curso');
  const urlPeriodoId = searchParams.get('periodo');


  const [cursos, setCursos] = useState<Curso[]>([]);
  const selectedCursoId = urlCursoId;
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const selectedPeriodoId = urlPeriodoId;


  const [cursoMaterias, setCursoMaterias] = useState<CursoMateria[]>([]);
  const [valoresEscala, setValoresEscala] = useState<ValorEscala[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoInscriptoRow[]>([]);


  const [loadingCursos, setLoadingCursos] = useState(false);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [loadingCursoData, setLoadingCursoData] = useState(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [workflow, setWorkflow] = useState<InstanciaCargaBoletin | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [reviewInscripcionId, setReviewInscripcionId] = useState<string | null>(null);
  const [detailHasChanges, setDetailHasChanges] = useState(false);
  const [reviewSnapshot, setReview] = useState<StaffReviewDto | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const realtimeWorkflow = useGradebookConcurrencyStore((state) => (
    selectedCursoId && selectedPeriodoId
      ? state.workflows[gradebookScopeKey(selectedCursoId, selectedPeriodoId)]
      : undefined
  ));
  const receiveWorkflow = useGradebookConcurrencyStore((state) => state.receiveWorkflow);


  useEffect(() => {
    let active = true;
    const fetchCursos = async () => {
      try {
        setLoadingCursos(true);
        const data = await boletinService.getCursos();
        if (!active) return;
        setCursos(data);
      } catch (err) {
        console.error(err);
        message.error('Error al cargar cursos');
      } finally {
        if (active) setLoadingCursos(false);
      }
    };
    void fetchCursos();
    return () => {
      active = false;
    };
  }, [message, reloadCounter]);


  useEffect(() => {
    if (!cicloActual?.id) return;
    let active = true;
    const fetchPeriodos = async () => {
      try {
        setLoadingPeriodos(true);
        const data = await boletinService.getPeriodosByCiclo(cicloActual.id);
        if (!active) return;
        setPeriodos(data);
      } catch (err) {
        console.error(err);
        message.error('Error al cargar períodos escolares');
      } finally {
        if (active) setLoadingPeriodos(false);
      }
    };
    void fetchPeriodos();
    return () => {
      active = false;
    };
  }, [cicloActual?.id, message, reloadCounter]);


  useEffect(() => {
    if (!selectedCursoId || !cicloActual?.id) return;
    let active = true;
    const fetchCursoData = async () => {
      try {
        setLoadingCursoData(true);
        const cur = cursos.find((c) => c.id === selectedCursoId);

        const [materias, regularAlumnos] = await Promise.all([
          boletinService.getMateriasByCurso(selectedCursoId, cicloActual.id),
          boletinService.getAlumnosByCursoCiclo(selectedCursoId, cicloActual.id),
        ]);

        if (!active) return;
        setCursoMaterias(materias);
        setAlumnos(regularAlumnos);

        if (cur?.escalaId) {
          const vals = await boletinService.getValoresByEscala(cur.escalaId);
          if (active) setValoresEscala(vals);
        } else {
          const escalas = await boletinService.getEscalasCalificacion();
          if (escalas.length > 0) {
            const vals = await boletinService.getValoresByEscala(escalas[0].id);
            if (active) setValoresEscala(vals);
          } else {
            if (active) setValoresEscala([]);
          }
        }
      } catch (err) {
        console.error(err);
        message.error('Error al cargar datos del curso');
      } finally {
        if (active) setLoadingCursoData(false);
      }
    };
    void fetchCursoData();
    return () => {
      active = false;
    };
  }, [selectedCursoId, cursos, cicloActual?.id, message, reloadCounter]);

  useEffect(() => {
    if (!selectedCursoId || !selectedPeriodoId) {
      return;
    }
    let active = true;
    const fetchWorkflow = async () => {
      try {
        setLoadingWorkflow(true);
        const current = await getStaffGradebookWorkflow(selectedCursoId, selectedPeriodoId);
        if (active) {
          setWorkflow(current);
          if (current) receiveWorkflow(workflowVersionFromInstance(current));
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setWorkflow(null);
          message.error('No se pudo consultar el estado de la carga docente');
        }
      } finally {
        if (active) setLoadingWorkflow(false);
      }
    };
    void fetchWorkflow();
    return () => {
      active = false;
    };
  }, [message, receiveWorkflow, reloadCounter, selectedCursoId, selectedPeriodoId]);

  const effectiveWorkflow = useMemo<InstanciaCargaBoletin | null>(() => {
    if (!realtimeWorkflow) return workflow;
    return {
      id: realtimeWorkflow.id,
      cursoId: realtimeWorkflow.cursoId,
      periodoId: realtimeWorkflow.periodoId,
      estado: realtimeWorkflow.estado,
      revision: realtimeWorkflow.revision,
      enviadoAt: workflow?.enviadoAt,
      enviadoPor: workflow?.enviadoPor,
      createdAt: workflow?.createdAt || '',
      updatedAt: workflow?.updatedAt || '',
    };
  }, [realtimeWorkflow, workflow]);
  const review = effectiveWorkflow?.estado === 'CONTROL_DIRECTIVO'
    && reviewSnapshot?.instancia.id === effectiveWorkflow.id
    && reviewSnapshot.instancia.revision === effectiveWorkflow.revision
    ? reviewSnapshot
    : null;

  useEffect(() => {
    if (!selectedCursoId || !selectedPeriodoId || effectiveWorkflow?.estado !== 'CONTROL_DIRECTIVO') {
      return;
    }
    let active = true;
    const fetchReview = async () => {
      setReviewLoading(true);
      setReview(null);
      try {
        const data = await getStaffGradebookReview(selectedCursoId, selectedPeriodoId);
        if (active) setReview(data);
      } catch (error) {
        if (active) {
          console.error(error);
          message.error('No se pudo consultar el estado de los visados');
        }
      } finally {
        if (active) setReviewLoading(false);
      }
    };
    void fetchReview();
    return () => { active = false; };
  }, [selectedCursoId, selectedPeriodoId, effectiveWorkflow?.estado, effectiveWorkflow?.revision, reloadCounter, message]);

  const handleSaveSuccess = useCallback((revision?: number) => {
    if (revision === undefined) return;
    setWorkflow((current) => {
      if (!current) return current;
      const next = { ...current, revision };
      receiveWorkflow(workflowVersionFromInstance(next));
      return next;
    });
  }, [receiveWorkflow]);

  const selectedPeriodo = useMemo(
    () => periodos.find((p) => p.id === selectedPeriodoId),
    [periodos, selectedPeriodoId]
  );
  const selectedCurso = useMemo(
    () => cursos.find((curso) => curso.id === selectedCursoId),
    [cursos, selectedCursoId],
  );
  const reviewStudents = useMemo(() => {
    const included = new Set(review?.boletines.map((item) => item.inscripcionId) || []);
    return alumnos.filter((alumno) => alumno.estado !== 'Baja' || included.has(alumno.inscripcionId));
  }, [alumnos, review]);

  const handleBack = () => {
    if (!reviewInscripcionId) {
      onBackToDashboard?.();
      return;
    }
    if (!detailHasChanges) {
      setReviewInscripcionId(null);
      return;
    }
    modal.confirm({
      title: '¿Volver al listado sin guardar?',
      content: 'Los cambios pendientes de este alumno se perderán.',
      okText: 'Volver sin guardar',
      okType: 'danger',
      cancelText: 'Continuar revisando',
      onOk: () => {
        setDetailHasChanges(false);
        setReviewInscripcionId(null);
      },
    });
  };

  const handleSelectStudent = (inscripcionId: string) => {
    if (!review?.boletines.some((item) => item.inscripcionId === inscripcionId)) {
      message.warning('Actualizá la matrícula de la revisión antes de abrir este boletín.');
      return;
    }
    setDetailHasChanges(false);
    setReviewInscripcionId(inscripcionId);
  };

  const handleSyncEnrollments = async () => {
    if (!review || !selectedCursoId || !selectedPeriodoId) return;
    setApprovalBusy(true);
    try {
      const result = await synchronizeStaffReviewEnrollments(
        selectedCursoId,
        selectedPeriodoId,
        review.instancia.revision,
      );
      handleSaveSuccess(result.instancia.revision);
      setReloadCounter((value) => value + 1);
      message.success(`${result.incorporados} alumno(s) incorporado(s) a la revisión`);
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 409) {
        setReloadCounter((value) => value + 1);
        message.warning('El curso cambió en otra sesión. Revisá la matrícula actualizada.');
      } else {
        message.error('No se pudo actualizar la matrícula de la revisión');
      }
    } finally {
      setApprovalBusy(false);
    }
  };

  const selectedBulletin = review?.boletines.find((item) => item.inscripcionId === reviewInscripcionId);
  const handleApproval = (approve: boolean) => {
    if (!selectedBulletin || !selectedPeriodoId || !review || detailHasChanges) return;
    modal.confirm({
      title: approve ? '¿Visar este boletín?' : '¿Retirar el visado?',
      content: approve
        ? 'Confirmás que revisaste el boletín completo. Una corrección posterior retirará automáticamente el visado.'
        : 'El boletín volverá a quedar pendiente de revisión.',
      okText: approve ? 'Visar' : 'Retirar visado',
      onOk: async () => {
        setApprovalBusy(true);
        try {
          const result = await changeStaffBulletinApproval(
            selectedBulletin.inscripcionId,
            selectedPeriodoId,
            review.instancia.revision,
            selectedBulletin.revisionContenido,
            approve,
          );
          handleSaveSuccess(result.instancia.revision);
          message.success(approve ? 'Boletín visado' : 'Visado retirado');
        } catch (error) {
          if (error instanceof ClientResponseError && error.status === 409) {
            message.warning('El curso cambió en otra sesión. Se actualizará el estado antes de continuar.');
            setReloadCounter((value) => value + 1);
          } else {
            message.error('No se pudo actualizar el visado');
          }
          throw error;
        } finally {
          setApprovalBusy(false);
        }
      },
    });
  };

  return (
    <SectionLayout title="Carga de notas de boletines" icon={<TableOutlined />} actions={
        <Space size="middle" wrap>
          {(reviewInscripcionId || onBackToDashboard) && (
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              {reviewInscripcionId ? 'Volver al listado del curso' : 'Volver a cursos'}
            </Button>
          )}
          <Tooltip title="Actualizar datos">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => setReloadCounter((c) => c + 1)}
              loading={loadingCursos || loadingCursoData || loadingPeriodos}
            />
          </Tooltip>
        </Space>
      }>

      { }
      {!selectedCursoId || !selectedPeriodoId ? (
        <Card className={ui.emptyPanel}>
          <Empty description="Seleccione un curso y un bimestre para consultar la carga" />
        </Card>
      ) : loadingCursoData || loadingWorkflow ? (
        <Card className={ui.loadingPanel}>
          <Spin description="Cargando la instancia del curso..." />
        </Card>
      ) : cursoMaterias.length === 0 ? (
        <Card className={ui.emptyPanel}>
          <Empty description="Este curso no tiene materias asignadas. Configure la malla curricular en el Constructor de Boletines." />
        </Card>
      ) : !effectiveWorkflow ? (
        <Card>
          <Alert
            type="info"
            showIcon
            title="La carga docente todavía no fue iniciada"
            description="Volvé al tablero de cursos para iniciar la carga docente de este curso y bimestre."
          />
        </Card>
      ) : effectiveWorkflow.estado === 'BORRADOR_DOCENTE' ? (
        <Card>
          <Alert
            type="warning"
            showIcon
            title="Carga docente en curso"
            description="La docente puede guardar avances con su enlace. Para evitar ediciones concurrentes, el formulario directivo se habilitará automáticamente cuando envíe el bimestre completo."
            action={(
              <Button icon={<ReloadOutlined />} onClick={() => setReloadCounter((value) => value + 1)}>
                Consultar estado
              </Button>
            )}
          />
        </Card>
      ) : (
        <>
          <RevisionCursoHeader
            cursoNombre={selectedCurso ? `${selectedCurso.nombre} · ${selectedCurso.turno}` : 'Curso'}
            periodoNombre={selectedPeriodo?.nombre || 'Período escolar'}
          />
          <Space wrap>
            <Tag color={review?.etapa === 'LISTO_PARA_PDF' ? 'success' : 'processing'}>
              {review ? `${review.visados} de ${review.totalBoletines} boletines visados` : 'Consultando visados'}
            </Tag>
            {review?.etapa === 'LISTO_PARA_PDF' && <Tag color="success">Listo para generar PDFs</Tag>}
          </Space>
          {review && review.alumnosSinIncorporar > 0 && (
            <Alert
              type="warning"
              showIcon
              title={`${review.alumnosSinIncorporar} alumno(s) ingresaron después de la entrega`}
              description="Incorporalos a la revisión para completar sus boletines sin modificar los visados existentes."
              action={<Button loading={approvalBusy} onClick={() => void handleSyncEnrollments()}>Actualizar matrícula</Button>}
            />
          )}
          {reviewInscripcionId ? (
            <>
            <Space wrap>
              <Tag color={selectedBulletin?.estado === 'VISADO' ? 'success' : 'warning'}>
                {selectedBulletin?.estado === 'VISADO' ? 'Visado' : 'Pendiente de visado'}
              </Tag>
              <Button
                type={selectedBulletin?.estado === 'VISADO' ? 'default' : 'primary'}
                disabled={!selectedBulletin || detailHasChanges || reviewLoading}
                loading={approvalBusy}
                onClick={() => handleApproval(selectedBulletin?.estado !== 'VISADO')}
              >
                {selectedBulletin?.estado === 'VISADO' ? 'Retirar visado' : 'Visar boletín'}
              </Button>
            </Space>
            <VistaPorAlumno
              key={`${selectedCursoId}:${selectedPeriodoId}:${reviewInscripcionId}:${reloadCounter}`}
              periodoId={selectedPeriodoId || ''}
              alumnos={alumnos}
              cursoMaterias={cursoMaterias}
              valoresEscala={valoresEscala}
              periodo={selectedPeriodo}
              access={staffGradebookAccess}
              readOnly
              workflowRevision={effectiveWorkflow.revision}
              onSaveSuccess={handleSaveSuccess}
              onRevisionObserved={handleSaveSuccess}
              initialInscripcionId={reviewInscripcionId}
              onPendingChangesChange={setDetailHasChanges}
            />
            </>
          ) : reviewLoading ? (
            <Card className={ui.loadingPanel}>
              <Spin description="Consultando boletines entregados..." />
            </Card>
          ) : !review ? (
            <Alert
              type="error"
              showIcon
              title="No se pudo consultar la revisión del curso"
              action={<Button onClick={() => setReloadCounter((value) => value + 1)}>Reintentar</Button>}
            />
          ) : (
            <RevisionCursoOverview
              alumnos={reviewStudents}
              boletines={review.boletines}
              onSelectStudent={handleSelectStudent}
            />
          )}
        </>
      )}
    </SectionLayout>
  );
};
