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
  LockOutlined,
  RollbackOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { boletinService } from '../services/boletin.service';
import { VistaPorAlumno } from './VistaPorAlumno';
import { staffGradebookAccess } from '../models/gradebookAccess.model';
import {
  getStaffGradebookWorkflow,
  returnStaffGradebookToTeacher,
  setStaffGradebookWorkflowState,
} from '../services/gradebookDataSource.service';
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

const { Text } = Typography;

export const PlanillaCalificacionesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { cicloActual } = useAppStore();
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
  const [transitioningWorkflow, setTransitioningWorkflow] = useState(false);
  const [staffHasUnsavedChanges, setStaffHasUnsavedChanges] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);


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
        if (active) setWorkflow(current);
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
  }, [message, reloadCounter, selectedCursoId, selectedPeriodoId]);

  const selectedPeriodo = useMemo(
    () => periodos.find((p) => p.id === selectedPeriodoId),
    [periodos, selectedPeriodoId]
  );

  const handleReturnToTeacher = () => {
    if (!workflow || workflow.estado !== 'CONTROL_DIRECTIVO') return;
    if (staffHasUnsavedChanges) {
      message.warning('Guardá o descartá los cambios actuales antes de devolver la carga.');
      return;
    }
    modal.confirm({
      title: '¿Devolver la carga a la docente?',
      content: 'Se bloqueará inmediatamente la edición directiva y se generará un enlace nuevo para que la docente realice las correcciones.',
      okText: 'Devolver y generar enlace',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          setTransitioningWorkflow(true);
          const result = await returnStaffGradebookToTeacher(workflow);
          setWorkflow(result.workflow);
          const url = `${window.location.origin}/carga#token=${encodeURIComponent(result.secret)}`;
          let copied = false;
          try {
            await navigator.clipboard.writeText(url);
            copied = true;
          } catch {
            copied = false;
          }
          modal.success({
            title: 'Carga devuelta a la docente',
            content: (
              <Space orientation="vertical">
                <Text>
                  {copied
                    ? 'El enlace nuevo fue copiado. También podés copiarlo desde esta ventana antes de cerrarla.'
                    : 'Copiá ahora el enlace nuevo antes de cerrar esta ventana.'}
                </Text>
                <Text type="secondary">El secreto no podrá recuperarse después.</Text>
                <Text copyable={{ text: url }}>{url}</Text>
              </Space>
            ),
            okText: 'Listo',
          });
        } catch (err) {
          console.error(err);
          message.error('No se pudo devolver la carga a la docente');
          throw err;
        } finally {
          setTransitioningWorkflow(false);
        }
      },
    });
  };

  const handleCloseWorkflow = () => {
    if (!workflow || workflow.estado !== 'CONTROL_DIRECTIVO') return;
    if (staffHasUnsavedChanges) {
      message.warning('Guardá o descartá los cambios actuales antes de cerrar el bimestre.');
      return;
    }
    modal.confirm({
      title: '¿Cerrar definitivamente este bimestre?',
      content: 'La planilla quedará en modo cerrado y no admitirá cambios hasta que un directivo vuelva a abrirla.',
      okText: 'Cerrar bimestre',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setTransitioningWorkflow(true);
          setWorkflow(await setStaffGradebookWorkflowState(workflow, 'CERRADO'));
          message.success('Bimestre cerrado correctamente');
        } catch (err) {
          console.error(err);
          message.error('No se pudo cerrar el bimestre');
          throw err;
        } finally {
          setTransitioningWorkflow(false);
        }
      },
    });
  };

  const handleReopenWorkflow = () => {
    if (!workflow || workflow.estado !== 'CERRADO') return;
    modal.confirm({
      title: '¿Reabrir la revisión directiva?',
      content: 'La planilla volverá a admitir modificaciones institucionales. No se habilitará ningún enlace docente.',
      okText: 'Reabrir revisión',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          setTransitioningWorkflow(true);
          setWorkflow(await setStaffGradebookWorkflowState(workflow, 'CONTROL_DIRECTIVO'));
          message.success('Revisión directiva habilitada');
        } catch (err) {
          console.error(err);
          message.error('No se pudo reabrir la revisión');
          throw err;
        } finally {
          setTransitioningWorkflow(false);
        }
      },
    });
  };



  return (
    <SectionLayout title="Carga de notas de boletines" icon={<TableOutlined />} actions={
        <Space size="middle" wrap>
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
      ) : !workflow ? (
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
      ) : workflow.estado === 'BORRADOR_DOCENTE' ? (
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
      ) : workflow.estado === 'CERRADO' ? (
        <Card>
          <Alert
            type="success"
            showIcon
            title="Bimestre cerrado"
            description={workflow.cerradoPor
              ? `La instancia fue cerrada por ${workflow.cerradoPor} y ya no admite modificaciones.`
              : 'La instancia está cerrada y ya no admite modificaciones.'}
            action={(
              <Button
                icon={<UnlockOutlined />}
                loading={transitioningWorkflow}
                onClick={handleReopenWorkflow}
              >
                Reabrir revisión
              </Button>
            )}
          />
        </Card>
      ) : (
        <Space orientation="vertical" size="middle" className={ui.fullWidth}>
          <Alert
            type="success"
            showIcon
            title="Carga recibida · Control directivo"
            description={workflow.enviadoPor
              ? `${workflow.enviadoPor} envió el bimestre completo. La edición institucional está habilitada.`
              : 'La docente envió el bimestre completo. La edición institucional está habilitada.'}
            action={(
              <Space wrap>
                <Button
                  icon={<RollbackOutlined />}
                  loading={transitioningWorkflow}
                  onClick={handleReturnToTeacher}
                >
                  Solicitar correcciones
                </Button>
                <Button
                  danger
                  icon={<LockOutlined />}
                  loading={transitioningWorkflow}
                  onClick={handleCloseWorkflow}
                >
                  Cerrar bimestre
                </Button>
              </Space>
            )}
          />
          <VistaPorAlumno
            periodoId={selectedPeriodoId || ''}
            alumnos={alumnos}
            cursoMaterias={cursoMaterias}
            valoresEscala={valoresEscala}
            periodo={selectedPeriodo}
            access={staffGradebookAccess}
            onDirtyChange={setStaffHasUnsavedChanges}
          />
        </Space>
      )}

      { }
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
