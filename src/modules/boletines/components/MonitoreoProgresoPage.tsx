import ui from '../../../shared/styles/ui.module.css';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
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
  TeamOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { boletinService } from '../services/boletin.service';
import { useAppStore } from '../../../store/appStore';
import { getGradeColorConfig } from '../../alumnos/utils/gradeColors';
import { GestorEnlacesModal } from './GestorEnlacesModal';
import type {
  Periodo,
  MonitoreoInstitucionalData,
  EstadoMonitoreoCurso,
} from '../models/boletin.model';
import type { Curso } from '../../inscripciones/models/inscripcion.model';

const { Text } = Typography;

export const CargaNotasDashboardPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { cicloActual } = useAppStore();


  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string | null>(null);

  const [data, setData] = useState<MonitoreoInstitucionalData>({
    cursosCompletosCount: 0,
    cursosEnProgresoCount: 0,
    cursosPausadosCount: 0,
    cursosSinIniciarCount: 0,
    cursosSinTokenCount: 0,
    cursos: [],
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoMonitoreoCurso>('TODOS');


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
  }, [selectedPeriodoId, monitoreoRevision, message]);

  const cursosFiltrados = useMemo(() => {
    if (filtroEstado === 'TODOS') return data.cursos;
    return data.cursos.filter((c) => c.estado === filtroEstado);
  }, [data.cursos, filtroEstado]);


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
          onChange={(val) => setFiltroEstado(val as 'TODOS' | EstadoMonitoreoCurso)}
          options={[
            { value: 'TODOS', label: `Todos los Grados (${data.cursos.length})` },
            {
              value: 'COMPLETO',
              label: <span className={ui.tightRow}><CheckCircleOutlined /> Completados ({data.cursosCompletosCount})</span>,
            },
            {
              value: 'EN_PROGRESO',
              label: <span className={ui.tightRow}><ClockCircleOutlined /> En progreso ({data.cursosEnProgresoCount})</span>,
            },
            {
              value: 'PAUSADO',
              label: <span className={ui.tightRow}><PauseCircleOutlined /> Pausados ({data.cursosPausadosCount})</span>,
            },
            {
              value: 'SIN_INICIAR',
              label: <span className={ui.tightRow}><MinusCircleOutlined /> Sin iniciar ({Math.max(0, data.cursosSinIniciarCount - data.cursosSinTokenCount)})</span>,
            },
            {
              value: 'SIN_ENLACE',
              label: <span className={ui.tightRow}><ExclamationCircleOutlined /> Sin enlace ({data.cursosSinTokenCount})</span>,
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
        <Row gutter={[16, 16]}>
          {cursosFiltrados.map((cur) => {
            const gradeConfig = getGradeColorConfig(cur.cursoNombre);
            const isCompleto = cur.estado === 'COMPLETO';
            const isEnProgreso = cur.estado === 'EN_PROGRESO';
            const isPausado = cur.estado === 'PAUSADO';
            const isSinEnlace = cur.estado === 'SIN_ENLACE';
            const hasDelivery = cur.entregado;

            return (
              <Col xs={24} md={12} xl={8} key={cur.cursoId}>
                <Card
                  style={{
                    borderRadius: 14,
                    borderTop: `4px solid ${gradeConfig.textColor}`,
                    borderRight: '1px solid var(--cys-color-border-secondary)',
                    borderBottom: '1px solid var(--cys-color-border-secondary)',
                    borderLeft: '1px solid var(--cys-color-border-secondary)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                    background: 'var(--cys-color-bg-container, #ffffff)',
                  }}
                  styles={{ body: { padding: '16px 18px' } }}
                >
                  { }
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <Tag
                      style={{
                        backgroundColor: gradeConfig.bgColor,
                        color: gradeConfig.textColor,
                        border: `1px solid ${gradeConfig.borderColor}`,
                        fontWeight: 800,
                        fontSize: 16,
                        lineHeight: 1.35,
                        padding: '4px 12px',
                        borderRadius: 8,
                        margin: 0,
                      }}
                    >
                      {gradeConfig.label}
                    </Tag>

                    { }
                    {isCompleto ? (
                      <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 700, fontSize: 11, padding: '1px 6px', borderRadius: 6, margin: 0 }}>
                        100% Completo
                      </Tag>
                    ) : isEnProgreso ? (
                      <Tag color="warning" icon={<ClockCircleOutlined />} style={{ fontWeight: 700, fontSize: 11, padding: '1px 6px', borderRadius: 6, margin: 0 }}>
                        {cur.porcentaje === 100 ? 'Lista para entregar' : `${cur.porcentaje}% En Carga`}
                      </Tag>
                    ) : isPausado ? (
                      <Tag color="warning" icon={<PauseCircleOutlined />} style={{ fontWeight: 700, fontSize: 11, padding: '1px 6px', borderRadius: 6, margin: 0 }}>
                        {cur.porcentaje}% Pausada
                      </Tag>
                    ) : isSinEnlace ? (
                      <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ fontWeight: 700, fontSize: 11, padding: '1px 6px', borderRadius: 6, margin: 0 }}>
                        Sin Enlace
                      </Tag>
                    ) : (
                      <Tag color="default" icon={<ClockCircleOutlined />} style={{ fontWeight: 700, fontSize: 11, padding: '1px 6px', borderRadius: 6, margin: 0 }}>
                        0% Sin Iniciar
                      </Tag>
                    )}
                  </div>

                  { }
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Space size={6}>
                        <TeamOutlined style={{ color: 'var(--cys-color-text-description)' }} />
                        <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--cys-color-text)' }}>
                          {cur.alumnosCompletos} de {cur.totalAlumnos} alumnos listos
                        </Text>
                      </Space>
                      <Text strong style={{ fontSize: 12.5, color: isCompleto ? 'var(--cys-color-success-text)' : isEnProgreso || isPausado ? 'var(--cys-color-warning-text)' : "var(--cys-color-text-description)" }}>
                        {cur.porcentaje}%
                      </Text>
                    </div>

                    <Progress
                      percent={cur.porcentaje}
                      showInfo={false}
                      strokeColor={isCompleto ? '#10b981' : isEnProgreso || isPausado ? '#f59e0b' : '#cbd5e1'}
                      size={['100%', 7]}
                    />

                    <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--cys-color-success-text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircleOutlined /> {cur.alumnosCompletos} Listos
                      </span>
                      <span style={{ color: 'var(--cys-color-warning-text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ClockCircleOutlined /> {cur.alumnosEnProgreso} En curso
                      </span>
                      <span style={{ color: 'var(--cys-color-text-description)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MinusCircleOutlined /> {cur.alumnosSinIniciar} Pendientes
                      </span>
                    </div>
                  </div>

                  { }
                  <div
                    style={{
                      background: cur.tokenDocente || isCompleto ? 'var(--cys-color-success-bg)' : 'var(--cys-color-warning-bg)',
                      border: cur.tokenDocente || isCompleto ? '1px solid var(--cys-color-success-border)' : '1px solid var(--cys-color-warning-border)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    <div className={ui.tightRow}>
                      {isCompleto
                        ? <CheckCircleOutlined style={{ color: 'var(--cys-color-success-text)', fontSize: 13 }} />
                        : isPausado
                          ? <PauseCircleOutlined style={{ color: 'var(--cys-color-warning-text)', fontSize: 13 }} />
                          : <LinkOutlined style={{ color: cur.tokenDocente ? 'var(--cys-color-success-text)' : 'var(--cys-color-warning-text)', fontSize: 13 }} />}
                      <Text strong style={{ fontSize: 11.5, color: cur.tokenDocente || isCompleto ? 'var(--cys-color-success-text)' : 'var(--cys-color-warning-text)' }}>
                        {isCompleto
                          ? 'Carga completa'
                          : cur.tokenDocente
                          ? `Docente: ${cur.tokenDocente.docenteNombre || 'Docente de Grado'}`
                          : isPausado
                          ? 'Carga pausada · sin acceso docente'
                          : 'Sin enlace mágico generado'}
                      </Text>
                    </div>

                    {!isCompleto && (cur.tokenDocente ? (
                      <Button
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={() => {
                          setSelectedCursoForModal(cur.cursoId);
                          setGestorModalOpen(true);
                        }}
                        style={{ borderRadius: 6, fontSize: 10.5, fontWeight: 600, height: 24, padding: '0 8px' }}
                      >
                        Gestionar
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        type="primary"
                        icon={<LinkOutlined />}
                        onClick={() => {
                          setSelectedCursoForModal(cur.cursoId);
                          setGestorModalOpen(true);
                        }}
                        style={{ borderRadius: 6, fontSize: 10.5, fontWeight: 600, height: 24, padding: '0 8px' }}
                      >
                        {isPausado ? 'Reanudar' : 'Generar'}
                      </Button>
                    ))}
                  </div>

                  { }
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 4 }}>
                    <Button
                      type={hasDelivery ? 'primary' : 'default'}
                      size="small"
                      icon={hasDelivery ? <EyeOutlined /> : <MinusCircleOutlined />}
                      disabled={!hasDelivery}
                      onClick={() => {
                        if (!hasDelivery) return;
                        navigate(`/app/boletines/calificaciones?curso=${cur.cursoId}&periodo=${selectedPeriodoId || ''}`);
                      }}
                      style={{ borderRadius: 6, fontWeight: 600, fontSize: 11.5 }}
                    >
                      {hasDelivery ? 'Abrir curso' : 'Sin entrega'}
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
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
