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
} from 'antd';
import {
  ReloadOutlined,
  TableOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { boletinService } from '../services/boletin.service';
import { VistaPorAlumno } from './VistaPorAlumno';
import { RevisionCursoHeader, RevisionCursoOverview } from './RevisionCursoOverview';
import { staffGradebookAccess } from '../models/gradebookAccess.model';
import { getStaffGradebookWorkflow } from '../services/gradebookDataSource.service';
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
    if (!selectedCursoId) return;
    let active = true;
    const fetchCursoData = async () => {
      try {
        setLoadingCursoData(true);
        const cur = cursos.find((c) => c.id === selectedCursoId);

        const [materias, regularAlumnos] = await Promise.all([
          boletinService.getMateriasByCurso(selectedCursoId),
          boletinService.getAlumnosRegularesByCurso(selectedCursoId, cicloActual?.id),
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
    setDetailHasChanges(false);
    setReviewInscripcionId(inscripcionId);
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
          {reviewInscripcionId ? (
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
          ) : (
            <RevisionCursoOverview
              alumnos={alumnos}
              onSelectStudent={handleSelectStudent}
            />
          )}
        </>
      )}
    </SectionLayout>
  );
};
