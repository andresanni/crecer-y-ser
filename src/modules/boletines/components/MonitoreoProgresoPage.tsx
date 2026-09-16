import ui from '../../../shared/styles/ui.module.css';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Progress,
  Tag,
  Typography,
  Space,
  Button,
  Select,
  Segmented,
  Tooltip,
  Empty,
  Spin,
  App,
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
  MinusCircleOutlined,
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

export const CargaNotasDashboardPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { cicloActual } = useAppStore();
  useGradebookRealtime();


  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string | null>(null);
  const realtimePeriodSequence = useGradebookConcurrencyStore((state) => (
    selectedPeriodoId ? state.periodSequences[selectedPeriodoId] || 0 : 0
  ));

  const [data, setData] = useState<MonitoreoInstitucionalData>({
    cursosCompletosCount: 0,
    cursosEnProgresoCount: 0,
    cursosPausadosCount: 0,
    cursosSinIniciarCount: 0,
    cursosSinTokenCount: 0,
    cursos: [],
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'COMPLETO' | 'INCOMPLETO'>('TODOS');


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
          if (periodosData.length > 0) {
            setSelectedPeriodoId((prev) => prev || periodosData[0].id);
          }
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


  const [monitoreoRevision, setMonitoreoRevision] = useState(0);
  const loadMonitoreo = () => setMonitoreoRevision((value) => value + 1);
  useEffect(() => {
    if (!selectedPeriodoId) return;
    let active = true;
    const fetchMonitoreo = async () => {
      try {
        setLoading(true);
        const res = await boletinService.getMonitoreoInstitucional(selectedPeriodoId);
        if (active) setData(res);
      } catch (err) {
        if (!active) return;
        console.error(err);
        message.error('Error al cargar el estado de los cursos');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchMonitoreo();
    return () => { active = false; };
  }, [selectedPeriodoId, monitoreoRevision, realtimePeriodSequence, message]);

  const cursosFiltrados = useMemo(() => {
    if (filtroEstado === 'TODOS') return data.cursos;
    if (filtroEstado === 'COMPLETO') return data.cursos.filter((c) => c.estado === 'COMPLETO');
    return data.cursos.filter((c) => c.estado !== 'COMPLETO');
  }, [data.cursos, filtroEstado]);

  const columns: ColumnsType<CursoMonitoreo> = [
    {
      title: 'GRADO',
      dataIndex: 'cursoNombre',
      key: 'grado',
      width: 180,
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
            {gradeConfig.label}
          </Tag>
        );
      },
    },
    {
      title: 'AVANCE',
      key: 'progreso',
      width: 260,
      render: (_, cur) => {
        const isCompleto = cur.estado === 'COMPLETO';
        const isEnProgreso = cur.estado === 'EN_PROGRESO';
        const isPausado = cur.estado === 'PAUSADO';
        return (
          <div style={{ width: 210 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <Text strong style={{ fontSize: 12.5 }}>{cur.alumnosCompletos} de {cur.totalAlumnos} alumnos</Text>
              <Text strong style={{ fontSize: 12.5, color: isCompleto ? 'var(--cys-color-success-text)' : isEnProgreso || isPausado ? 'var(--cys-color-warning-text)' : 'var(--cys-color-text-description)' }}>
                {cur.porcentaje}%
              </Text>
            </div>
            <Progress
              percent={cur.porcentaje}
              showInfo={false}
              strokeColor={isCompleto ? '#10b981' : isEnProgreso || isPausado ? '#f59e0b' : '#cbd5e1'}
              size={[210, 7]}
            />
          </div>
        );
      },
    },
    {
      title: 'ESTADO',
      key: 'estado',
      width: 190,
      render: (_, cur) => {
        if (cur.estado === 'COMPLETO') {
          return <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 700, fontSize: 12, padding: '2px 7px', borderRadius: 6, margin: 0 }}>Completo</Tag>;
        }
        if (cur.estado === 'EN_PROGRESO') {
          return <Tag color="warning" icon={<ClockCircleOutlined />} style={{ fontWeight: 700, fontSize: 12, padding: '2px 7px', borderRadius: 6, margin: 0 }}>{cur.porcentaje === 100 ? 'Lista para entregar' : 'En carga'}</Tag>;
        }
        if (cur.estado === 'PAUSADO') {
          return <Tag color="warning" icon={<PauseCircleOutlined />} style={{ fontWeight: 700, fontSize: 12, padding: '2px 7px', borderRadius: 6, margin: 0 }}>Pausada</Tag>;
        }
        if (cur.estado === 'SIN_ENLACE') {
          return <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ fontWeight: 700, fontSize: 12, padding: '2px 7px', borderRadius: 6, margin: 0 }}>Sin enlace</Tag>;
        }
        return <Tag color="default" icon={<ClockCircleOutlined />} style={{ fontWeight: 700, fontSize: 12, padding: '2px 7px', borderRadius: 6, margin: 0 }}>Sin iniciar</Tag>;
      },
    },
    {
      title: 'DOCENTE',
      key: 'docente',
      width: 220,
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
      width: 250,
      render: (_, cur) => {
        const isCompleto = cur.estado === 'COMPLETO';
        const isPausado = cur.estado === 'PAUSADO';
        return (
          <Space size={8} wrap>
            {!isCompleto && (
              <Button
                size="small"
                type={cur.tokenDocente ? 'default' : 'primary'}
                icon={<LinkOutlined />}
                onClick={() => {
                  setSelectedCursoForModal(cur.cursoId);
                  setGestorModalOpen(true);
                }}
                style={{ borderRadius: 6, fontSize: 11.5, fontWeight: 600, height: 28, padding: '0 10px' }}
              >
                {cur.tokenDocente ? 'Gestionar' : isPausado ? 'Reanudar' : 'Generar'}
              </Button>
            )}
            <Button
              type={cur.entregado ? 'primary' : 'default'}
              size="small"
              icon={cur.entregado ? <EyeOutlined /> : <MinusCircleOutlined />}
              disabled={!cur.entregado}
              onClick={() => {
                if (!cur.entregado) return;
                navigate(`/app/boletines/calificaciones?curso=${cur.cursoId}&periodo=${selectedPeriodoId || ''}`);
              }}
              style={{ borderRadius: 6, fontWeight: 600, fontSize: 11.5, height: 28 }}
            >
              {cur.entregado ? 'Abrir curso' : 'Sin entrega'}
            </Button>
          </Space>
        );
      },
    },
  ];


  return (
    <SectionLayout title="Carga de notas" icon={<TableOutlined />} actions={
        <Space size="middle" wrap>
          { }
          <div className={ui.inlineControls}>
            <Text strong style={{ fontSize: 13, color: 'var(--cys-color-text-description)' }}>
              Bimestre / Período:
            </Text>
            <Select
              style={{ width: 170 }}
              value={selectedPeriodoId}
              onChange={(val) => setSelectedPeriodoId(val)}
              options={periodos.map((p) => ({
                value: p.id,
                label: p.nombre,
              }))}
            />
          </div>

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

          <Tooltip title="Actualizar estado de los cursos">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void loadMonitoreo()}
              loading={loading}
            />
          </Tooltip>
        </Space>
      }>

      { }
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Segmented
          value={filtroEstado}
          onChange={(val) => setFiltroEstado(val as 'TODOS' | 'COMPLETO' | 'INCOMPLETO')}
          options={[
            { value: 'TODOS', label: `Todos (${data.cursos.length})` },
            {
              value: 'COMPLETO',
              label: <span className={ui.tightRow}><CheckCircleOutlined /> Completos ({data.cursosCompletosCount})</span>,
            },
            {
              value: 'INCOMPLETO',
              label: <span className={ui.tightRow}><MinusCircleOutlined /> Incompletos ({data.cursos.length - data.cursosCompletosCount})</span>,
            },
          ]}
        />

        <Text type="secondary" className={ui.caption}>
          Mostrando {cursosFiltrados.length} de {data.cursos.length} grados
        </Text>
      </div>

      { }
      {loading ? (
        <Card style={{ textAlign: 'center', padding: 80, borderRadius: 16 }}>
          <Spin size="large" tip="Calculando estado de avance de la escuela..." />
        </Card>
      ) : cursosFiltrados.length === 0 ? (
        <Card className={ui.loadingPanel}>
          <Empty description="No hay grados en esta categoría de filtro." />
        </Card>
      ) : (
        <Card className="students-card">
          <Table
            className="students-table"
            columns={columns}
            dataSource={cursosFiltrados}
            rowKey="cursoId"
            pagination={false}
            scroll={{ x: 1050 }}
          />
        </Card>
      )}

      { }
      <GestorEnlacesModal
        open={gestorModalOpen}
        onClose={() => {
          setGestorModalOpen(false);
          void loadMonitoreo();
        }}
        cursos={cursos}
        periodos={periodos}
        activeCursoId={selectedCursoForModal}
        activePeriodoId={selectedPeriodoId}
      />
    </SectionLayout>
  );
};
