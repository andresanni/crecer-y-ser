import ui from '../../../shared/styles/ui.module.css';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Select,
  Button,
  Typography,
  Space,
  Tag,
  App,
  Tooltip,
  Row,
  Col,
  Empty,
  Spin,
  Alert,
} from 'antd';
import {
  ReloadOutlined,
  LinkOutlined,
  CalendarOutlined,
  IdcardOutlined,
  TableOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { boletinService } from '../services/boletin.service';
import { VistaPorAlumno } from './VistaPorAlumno';
import { staffGradebookAccess } from '../models/gradebookAccess.model';
import { getStaffGradebookWorkflow } from '../services/gradebookDataSource.service';
import { GestorEnlacesModal } from './GestorEnlacesModal';
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

const { Text } = Typography;

interface PlanillaCalificacionesPageProps {
  onBackToDashboard?: () => void;
}

export const PlanillaCalificacionesPage: React.FC<PlanillaCalificacionesPageProps> = ({
  onBackToDashboard,
}) => {
  const { message } = App.useApp();
  const { cicloActual } = useAppStore();
  useGradebookRealtime();
  const [searchParams] = useSearchParams();
  const urlCursoId = searchParams.get('curso');
  const urlPeriodoId = searchParams.get('periodo');


  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(urlCursoId);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string | null>(urlPeriodoId);


  const [cursoMaterias, setCursoMaterias] = useState<CursoMateria[]>([]);
  const [valoresEscala, setValoresEscala] = useState<ValorEscala[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoInscriptoRow[]>([]);


  const [loadingCursos, setLoadingCursos] = useState(false);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [loadingCursoData, setLoadingCursoData] = useState(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [workflow, setWorkflow] = useState<InstanciaCargaBoletin | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);
  const realtimeWorkflow = useGradebookConcurrencyStore((state) => (
    selectedCursoId && selectedPeriodoId
      ? state.workflows[gradebookScopeKey(selectedCursoId, selectedPeriodoId)]
      : undefined
  ));
  const receiveWorkflow = useGradebookConcurrencyStore((state) => state.receiveWorkflow);


  const [gestorEnlacesOpen, setGestorEnlacesOpen] = useState(false);


  useEffect(() => {
    let active = true;
    const fetchCursos = async () => {
      try {
        setLoadingCursos(true);
        const data = await boletinService.getCursos();
        if (!active) return;
        setCursos(data);
        if (data.length > 0) {
          setSelectedCursoId((prev) => prev || urlCursoId || data[0].id);
        }
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
  }, [message, reloadCounter, urlCursoId]);


  useEffect(() => {
    if (!cicloActual?.id) return;
    let active = true;
    const fetchPeriodos = async () => {
      try {
        setLoadingPeriodos(true);
        const data = await boletinService.getPeriodosByCiclo(cicloActual.id);
        if (!active) return;
        setPeriodos(data);
        if (data.length > 0) {
          setSelectedPeriodoId((prev) => prev || urlPeriodoId || data[0].id);
        }
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
  }, [cicloActual?.id, message, reloadCounter, urlPeriodoId]);


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

  const handleSaveSuccess = (revision?: number) => {
    if (revision === undefined) return;
    setWorkflow((current) => {
      if (!current) return current;
      const next = { ...current, revision };
      receiveWorkflow(workflowVersionFromInstance(next));
      return next;
    });
  };

  const selectedPeriodo = useMemo(
    () => periodos.find((p) => p.id === selectedPeriodoId),
    [periodos, selectedPeriodoId]
  );

  return (
    <SectionLayout title="Carga de notas de boletines" icon={<TableOutlined />} actions={
        <Space size="middle" wrap>
          {onBackToDashboard && (
            <Button icon={<ArrowLeftOutlined />} onClick={onBackToDashboard}>
              Volver a cursos
            </Button>
          )}
          <Button
            icon={<LinkOutlined className={ui.primary} />}
            onClick={() => setGestorEnlacesOpen(true)}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Enlaces Mágicos Docentes
          </Button>
          <Tooltip title="Actualizar datos">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => setReloadCounter((c) => c + 1)}
              loading={loadingCursoData || loadingPeriodos}
            />
          </Tooltip>
        </Space>
      }>

      { }
      <Card
        style={{
          borderRadius: 14,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          border: "1px solid var(--cys-color-border-secondary)",
        }}
        styles={{ body: { padding: '14px 18px' } }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Space orientation="vertical" size={2} className={ui.fullWidth}>
              <Text strong className={ui.secondaryCaption}>
                <IdcardOutlined style={{ marginRight: 4 }} />
                CURSO / GRADO
              </Text>
              <Select
                size="middle"
                className={ui.fullWidth}
                placeholder="Seleccione curso..."
                loading={loadingCursos}
                value={selectedCursoId}
                onChange={(val) => setSelectedCursoId(val)}
                options={cursos.map((c) => ({
                  value: c.id,
                  label: `${c.nombre} (${c.turno})`,
                }))}
              />
            </Space>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Space orientation="vertical" size={2} className={ui.fullWidth}>
              <Text strong className={ui.secondaryCaption}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                PERÍODO ESCOLAR (BIMESTRE)
              </Text>
              <Select
                size="middle"
                className={ui.fullWidth}
                placeholder="Seleccione bimestre..."
                loading={loadingPeriodos}
                value={selectedPeriodoId}
                onChange={(val) => setSelectedPeriodoId(val)}
                options={periodos.map((p) => ({
                  value: p.id,
                  label: p.nombre,
                }))}
              />
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
              }}
            >
              {selectedPeriodo && (
                <Tag
                  style={{
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '5px 12px',
                    background: 'rgba(37, 99, 235, 0.08)',
                    color: 'var(--cys-color-primary-text)',
                    border: '1px solid rgba(37, 99, 235, 0.22)',
                    boxShadow: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    margin: 0,
                  }}
                >
                  <CalendarOutlined style={{ fontSize: 13, color: 'var(--cys-color-primary-text)' }} />
                  <span>{selectedPeriodo.numeroPeriodo}° Bimestre</span>
                </Tag>
              )}
            </div>
          </Col>
        </Row>
      </Card>

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
            description="Emití un enlace mágico para abrir la instancia de este curso y bimestre. El formulario directivo se habilitará cuando la docente envíe la carga completa."
            action={(
              <Button icon={<LinkOutlined />} onClick={() => setGestorEnlacesOpen(true)}>
                Gestionar enlace
              </Button>
            )}
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
        <VistaPorAlumno
          key={`${selectedCursoId}:${selectedPeriodoId}:${reloadCounter}`}
          periodoId={selectedPeriodoId || ''}
          alumnos={alumnos}
          cursoMaterias={cursoMaterias}
          valoresEscala={valoresEscala}
          periodo={selectedPeriodo}
          access={staffGradebookAccess}
          readOnly
          workflowRevision={effectiveWorkflow.revision}
          onSaveSuccess={handleSaveSuccess}
        />
      )}

      <GestorEnlacesModal
        open={gestorEnlacesOpen}
        onClose={() => {
          setGestorEnlacesOpen(false);
          setReloadCounter((value) => value + 1);
        }}
        cursos={cursos}
        periodos={periodos}
        activeCursoId={selectedCursoId}
        activePeriodoId={selectedPeriodoId}
      />
    </SectionLayout>
  );
};
