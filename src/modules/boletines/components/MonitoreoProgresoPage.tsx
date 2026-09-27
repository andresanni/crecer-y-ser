import ui from '../../../shared/styles/ui.module.css';
import styles from './MonitoreoProgresoPage.module.css';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Table,
  Progress,
  Tag,
  Typography,
  Space,
  Button,
  Tooltip,
  Empty,
  Spin,
  App,
  Alert,
  Badge,
} from 'antd';
import {
  TableOutlined,
  ReloadOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { boletinService } from '../services/boletin.service';
import { useAppStore } from '../../../store/appStore';
import { getGradeColorConfig } from '../../alumnos/utils/gradeColors';
import { GestorEnlacesModal } from './GestorEnlacesModal';
import type {
  Periodo,
  MonitoreoInstitucionalData,
} from '../models/boletin.model';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import { useGradebookRealtime } from '../hooks/useGradebookRealtime';
import { useGradebookConcurrencyStore } from '../store/gradebookConcurrencyStore';

const { Text } = Typography;
type CursoMonitoreo = MonitoreoInstitucionalData['cursos'][number];
const REALTIME_REFRESH_DELAY_MS = 1200;
const REALTIME_REFRESH_MAX_WAIT_MS = 4000;

interface CargaNotasDashboardPageProps {
  periodoId: string;
  onBackToPeriodSelection: () => void;
}

export const CargaNotasDashboardPage: React.FC<CargaNotasDashboardPageProps> = ({
  periodoId,
  onBackToPeriodSelection,
}) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { cicloActual } = useAppStore();
  useGradebookRealtime();


  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [data, setData] = useState<MonitoreoInstitucionalData>({
    cursos: [],
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'pending' | 'refreshing'>('refreshing');
  const [loadError, setLoadError] = useState(false);
  const refreshMonitoreo = useRef<(immediate?: boolean) => void>(() => undefined);


  const [gestorModalOpen, setGestorModalOpen] = useState<boolean>(false);
  const [selectedCursoForModal, setSelectedCursoForModal] = useState<string | null>(null);


  useEffect(() => {
    let active = true;
    const fetchInitData = async () => {
      try {
        const cursosData = await boletinService.getCursos();
        if (!active) return;
        setCursos(cursosData);

        if (cicloActual?.id) {
          const periodosData = await boletinService.getPeriodosByCiclo(cicloActual.id);
          if (!active) return;
          setPeriodos(periodosData);
        }
      } catch (err) {
        console.error(err);
        message.error('Error al cargar cursos y períodos');
      }
    };

    void fetchInitData();
    return () => {
      active = false;
    };
  }, [cicloActual?.id, message]);


  useEffect(() => {
    let active = true;
    let inFlight = false;
    let dirty = false;
    let immediateAfterFlight = false;
    let pendingSince = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      pendingSince = 0;
      inFlight = true;
      setSyncStatus('refreshing');
      try {
        const res = await boletinService.getMonitoreoInstitucional(periodoId);
        if (!active) return;
        setData(res);
        setHasLoaded(true);
        setLoadError(false);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setLoadError(true);
        message.error('Error al cargar el estado de los cursos');
      } finally {
        inFlight = false;
        if (active) {
          if (dirty) {
            const immediate = immediateAfterFlight;
            dirty = false;
            immediateAfterFlight = false;
            schedule(immediate);
          } else {
            setSyncStatus('idle');
          }
        }
      }
    };

    const schedule = (immediate = false) => {
      if (!active) return;
      if (inFlight) {
        dirty = true;
        immediateAfterFlight ||= immediate;
        if (!pendingSince) pendingSince = Date.now();
        return;
      }
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (immediate) {
        void run();
        return;
      }
      if (!pendingSince) pendingSince = Date.now();
      const remaining = REALTIME_REFRESH_MAX_WAIT_MS - (Date.now() - pendingSince);
      setSyncStatus('pending');
      timer = setTimeout(() => void run(), Math.min(REALTIME_REFRESH_DELAY_MS, Math.max(0, remaining)));
    };

    refreshMonitoreo.current = schedule;
    const unsubscribe = useGradebookConcurrencyStore.subscribe((state, previous) => {
      if (state.periodSequences[periodoId] !== previous.periodSequences[periodoId]) {
        schedule();
      }
    });
    void run();

    return () => {
      active = false;
      unsubscribe();
      if (timer) clearTimeout(timer);
      refreshMonitoreo.current = () => undefined;
    };
  }, [periodoId, message]);

  const selectedPeriodo = useMemo(
    () => periodos.find((periodo) => periodo.id === periodoId),
    [periodoId, periodos],
  );

  const columns: ColumnsType<CursoMonitoreo> = [
    {
      title: 'GRADO',
      dataIndex: 'cursoNombre',
      key: 'grado',
      width: '9%',
      className: styles.gradeColumn,
      render: (cursoNombre: string) => {
        const gradeConfig = getGradeColorConfig(cursoNombre);
        return (
          <Tag
            style={{
              backgroundColor: 'var(--cys-color-primary-bg)',
              color: 'var(--cys-color-primary-text)',
              border: '1px solid var(--cys-color-primary-border)',
              fontWeight: 800,
              fontSize: 14,
              padding: '3px 10px',
              borderRadius: 7,
              margin: 0,
            }}
          >
            {gradeConfig.shortLabel}
          </Tag>
        );
      },
    },
    {
      title: 'LLENADO',
      key: 'progreso',
      width: '23%',
      render: (_, cur) => {
        const isCompleto = cur.estado === 'COMPLETO';
        const isEnProgreso = cur.estado === 'EN_PROGRESO';
        const isPausado = cur.estado === 'PAUSADO';
        return (
          <div className={styles.progressCell}>
            <div className={styles.progressMeta}>
              <Text strong style={{ fontSize: 12.5 }}>{cur.alumnosCompletos} de {cur.totalAlumnos} alumnos</Text>
              <Text strong style={{ fontSize: 12.5, color: isCompleto ? 'var(--cys-color-success-text)' : isEnProgreso || isPausado ? 'var(--cys-color-warning-text)' : 'var(--cys-color-text-description)' }}>
                {cur.porcentaje}%
              </Text>
            </div>
            <Progress
              percent={cur.porcentaje}
              showInfo={false}
              strokeColor={isCompleto ? '#10b981' : isEnProgreso || isPausado ? '#f59e0b' : '#cbd5e1'}
              size="small"
            />
          </div>
        );
      },
    },
    {
      title: 'REVISIÓN',
      key: 'revision',
      width: '23%',
      render: (_, cur) => {
        if (!cur.entregado) {
          return <Text type="secondary">No habilitada · espera la entrega</Text>;
        }
        const porcentaje = cur.totalBoletines > 0
          ? Math.round((cur.visados / cur.totalBoletines) * 100)
          : 0;
        return (
          <div className={styles.progressCell}>
            <div className={styles.progressMeta}>
              <Text strong style={{ fontSize: 12.5 }}>{cur.visados} de {cur.totalBoletines} visados</Text>
              <Text strong style={{ fontSize: 12.5 }}>{porcentaje}%</Text>
            </div>
            <Progress
              percent={porcentaje}
              showInfo={false}
              strokeColor={cur.etapa === 'LISTO_PARA_PDF' ? 'var(--cys-color-success-text)' : 'var(--cys-color-primary-text)'}
              size="small"
            />
          </div>
        );
      },
    },
    {
      title: 'ESTADO',
      key: 'estado',
      width: '16%',
      render: (_, cur) => {
        if (cur.etapa === 'LISTO_PARA_PDF') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Listo para PDF</Tag>;
        }
        if (cur.etapa === 'REVISION_DIRECTIVA') {
          return <Tag color="processing" icon={<EyeOutlined />}>En revisión</Tag>;
        }
        if (cur.etapa === 'PENDIENTE_CONFIGURACION') {
          return <Tag color="default" icon={<ExclamationCircleOutlined />}>Configurar criterios</Tag>;
        }
        if (cur.etapa === 'CARGA_DOCENTE') {
          return <Tag color="warning" icon={<ClockCircleOutlined />} style={{ fontWeight: 700, fontSize: 12, padding: '2px 7px', borderRadius: 6, margin: 0 }}>En carga</Tag>;
        }
        if (cur.etapa === 'CARGA_PAUSADA') {
          return <Tag color="warning" icon={<PauseCircleOutlined />} style={{ fontWeight: 700, fontSize: 12, padding: '2px 7px', borderRadius: 6, margin: 0 }}>Pausada</Tag>;
        }
        if (cur.etapa === 'PENDIENTE_EMISION') {
          return <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ fontWeight: 700, fontSize: 12, padding: '2px 7px', borderRadius: 6, margin: 0 }}>Sin enlace</Tag>;
        }
        return <Tag color="default" icon={<ClockCircleOutlined />} style={{ fontWeight: 700, fontSize: 12, padding: '2px 7px', borderRadius: 6, margin: 0 }}>Sin iniciar</Tag>;
      },
    },
    {
      title: 'DOCENTE',
      key: 'docente',
      width: '15%',
      render: (_, cur) => cur.tokenDocente ? (
        <Space size={6}>
          <LinkOutlined style={{ color: 'var(--cys-color-primary-text)' }} />
          <Text strong>{cur.tokenDocente.docenteNombre || 'Docente de grado'}</Text>
        </Space>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'ACCIONES',
      key: 'acciones',
      width: '14%',
      render: (_, cur) => {
        const isPausado = cur.estado === 'PAUSADO';
        if (cur.entregado) {
          return (
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/app/boletines/calificaciones?curso=${cur.cursoId}&periodo=${encodeURIComponent(periodoId)}`)}
              className={styles.actionButton}
            >
              Abrir curso
            </Button>
          );
        }
        return (
          <Button
            type={cur.tokenDocente ? 'default' : 'primary'}
            icon={<LinkOutlined />}
            onClick={() => {
              setSelectedCursoForModal(cur.cursoId);
              setGestorModalOpen(true);
            }}
            className={styles.actionButton}
          >
            {cur.tokenDocente ? 'Gestionar' : isPausado ? 'Reanudar' : 'Generar'}
          </Button>
        );
      },
    },
  ];


  return (
    <SectionLayout title="Carga de notas" icon={<TableOutlined />} actions={
        <Space size="middle" wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={onBackToPeriodSelection}>
            Cambiar bimestre
          </Button>

          <Tag color="blue" icon={<CalendarOutlined />}>
            {selectedPeriodo?.nombre || 'Bimestre seleccionado'}
          </Tag>

          <Button
            icon={<LinkOutlined className={ui.primary} />}
            onClick={() => {
              setSelectedCursoForModal(null);
              setGestorModalOpen(true);
            }}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Gestor de Enlaces Mágicos
          </Button>

          <Tooltip title={syncStatus === 'pending' ? 'Hay cambios pendientes · actualizar ahora' : 'Actualizar estado de los cursos'}>
            <Badge dot={syncStatus === 'pending'}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refreshMonitoreo.current(true)}
                loading={syncStatus === 'refreshing'}
                aria-label={syncStatus === 'pending' ? 'Actualizar ahora: hay cambios pendientes' : 'Actualizar estado de los cursos'}
              />
            </Badge>
          </Tooltip>
        </Space>
      }>

      {!hasLoaded && syncStatus === 'refreshing' ? (
        <Card style={{ textAlign: 'center', padding: 80, borderRadius: 16 }}>
          <Spin size="large" tip="Calculando estado de avance de la escuela..." />
        </Card>
      ) : !hasLoaded && loadError ? (
        <Alert
          type="error"
          showIcon
          title="No se pudo cargar el estado de los cursos"
          action={<Button onClick={() => refreshMonitoreo.current(true)}>Reintentar</Button>}
        />
      ) : data.cursos.length === 0 ? (
        <Card className={ui.loadingPanel}>
          <Empty description="No hay grados para este bimestre." />
        </Card>
      ) : (
        <Card className="students-card">
          <Table
            className="students-table"
            columns={columns}
            dataSource={data.cursos}
            rowKey="cursoId"
            pagination={false}
            tableLayout="fixed"
            scroll={{ x: 980 }}
          />
        </Card>
      )}

      { }
      <GestorEnlacesModal
        open={gestorModalOpen}
        onClose={() => {
          setGestorModalOpen(false);
          refreshMonitoreo.current(true);
        }}
        cursos={cursos}
        periodos={periodos}
        activeCursoId={selectedCursoForModal}
        activePeriodoId={periodoId}
      />
    </SectionLayout>
  );
};
