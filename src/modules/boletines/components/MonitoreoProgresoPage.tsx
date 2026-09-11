import { MetricCard } from '../../../shared/components/MetricCard';
import ui from '../../../shared/styles/ui.module.css';
import { PageHeader } from '../../../shared/components/PageHeader';
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
  DashboardOutlined,
  ReloadOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  TeamOutlined,
  DownOutlined,
  UpOutlined,
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

export const MonitoreoProgresoPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { cicloActual } = useAppStore();

  // Estados de datos
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string | null>(null);

  const [data, setData] = useState<MonitoreoInstitucionalData>({
    totalAlumnosColegio: 0,
    completadosColegio: 0,
    enProgresoColegio: 0,
    sinIniciarColegio: 0,
    porcentajeGlobalColegio: 0,
    cursosCompletosCount: 0,
    cursosEnProgresoCount: 0,
    cursosSinIniciarCount: 0,
    cursosSinTokenCount: 0,
    cursos: [],
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoMonitoreoCurso>('TODOS');
  const [expandedCursos, setExpandedCursos] = useState<Record<string, boolean>>({});

  const toggleExpandCurso = (cursoId: string) => {
    setExpandedCursos((prev) => ({
      ...prev,
      [cursoId]: !prev[cursoId],
    }));
  };

  // Modal Gestor de Enlaces Mágicos
  const [gestorModalOpen, setGestorModalOpen] = useState<boolean>(false);
  const [selectedCursoForModal, setSelectedCursoForModal] = useState<string | null>(null);

  // 1. Cargar Períodos y Cursos
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

  // 2. Cargar Datos de Monitoreo Global
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
        message.error('Error al cargar datos de monitoreo institucional');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchMonitoreo();
    return () => { active = false; };
  }, [selectedPeriodoId, monitoreoRevision, message]);

  const selectedPeriodo = useMemo(
    () => periodos.find((p) => p.id === selectedPeriodoId),
    [periodos, selectedPeriodoId]
  );

  // Cursos filtrados
  const cursosFiltrados = useMemo(() => {
    if (filtroEstado === 'TODOS') return data.cursos;
    return data.cursos.filter((c) => c.estado === filtroEstado);
  }, [data.cursos, filtroEstado]);

  // Copiar link mágico de la docente
  const handleCopyTokenLink = (tokenStr: string, docenteNombre?: string) => {
    const origin = window.location.origin;
    const publicUrl = `${origin}/carga?token=${tokenStr}`;
    navigator.clipboard.writeText(publicUrl).then(
      () => {
        message.success(`Enlace copiado para ${docenteNombre || 'la docente'}`);
      },
      () => {
        message.error('No se pudo copiar el enlace');
      }
    );
  };

  return (
    <div className={ui.pageSpacious}>
      {/* 1. Encabezado Institucional y Barra de Acciones */}
      <PageHeader title="Monitoreo de boletines" description="Seguimiento del avance de carga por curso y materia." icon={<DashboardOutlined />} actions={
        <Space size="middle" wrap>
          {/* Selector de Bimestre */}
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

          <Tooltip title="Actualizar sondeo en tiempo real">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void loadMonitoreo()}
              loading={loading}
            />
          </Tooltip>
        </Space>
      } />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard title="Avance global" value={`${data.completadosColegio} / ${data.totalAlumnosColegio}`} description={`Alumnos con boletín completo en ${selectedPeriodo?.nombre || 'este período'}.`} loading={loading}>
            <Progress percent={data.porcentajeGlobalColegio} size="small" />
          </MetricCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard title="Grados listos" value={`${data.cursosCompletosCount} / ${data.cursos.length}`} description="Cursos con materias y asistencias completas." tone="success" loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard title="En carga activa" value={data.cursosEnProgresoCount} description="Grados con carga de notas en curso." tone="warning" loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard title="Sin iniciar" value={data.cursosSinIniciarCount} description={data.cursosSinIniciarCount > 0 ? 'Grados que todavía no iniciaron la carga.' : 'Todos los grados iniciaron la carga.'} tone={data.cursosSinIniciarCount > 0 ? 'error' : 'success'} loading={loading} />
        </Col>
      </Row>

      {/* 3. Filtro por Estado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Segmented
          value={filtroEstado}
          onChange={(val) => setFiltroEstado(val as 'TODOS' | EstadoMonitoreoCurso)}
          options={[
            { value: 'TODOS', label: `Todos los Grados (${data.cursos.length})` },
            { value: 'COMPLETO', label: `🟢 Completados (${data.cursosCompletosCount})` },
            { value: 'EN_PROGRESO', label: `🟡 En Progreso (${data.cursosEnProgresoCount})` },
            { value: 'SIN_INICIAR', label: `⚪ Sin Iniciar (${Math.max(0, data.cursosSinIniciarCount - data.cursosSinTokenCount)})` },
            { value: 'SIN_ENLACE', label: `⚠️ Sin Enlace Mágico (${data.cursosSinTokenCount})` },
          ]}
        />

        <Text type="secondary" className={ui.caption}>
          Mostrando {cursosFiltrados.length} de {data.cursos.length} grados
        </Text>
      </div>

      {/* 4. Parrilla de Grados (1° a 7° Grado con Colores Oficiales) */}
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
            const isSinEnlace = cur.estado === 'SIN_ENLACE';
            const isExpanded = Boolean(expandedCursos[cur.cursoId]);

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
                  {/* Encabezado del Grado */}
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
                    <div className={ui.inlineControls}>
                      <Tag
                        style={{
                          backgroundColor: gradeConfig.bgColor,
                          color: gradeConfig.textColor,
                          border: `1px solid ${gradeConfig.borderColor}`,
                          fontWeight: 800,
                          fontSize: 12.5,
                          padding: '1px 8px',
                          borderRadius: 6,
                          margin: 0,
                        }}
                      >
                        {gradeConfig.label}
                      </Tag>
                      <Typography.Text strong style={{ fontSize: 15, color: 'var(--cys-color-text)' }}>
                        {cur.cursoNombre}
                      </Typography.Text>
                    </div>

                    {/* Badge de Estado Semafórico */}
                    {isCompleto ? (
                      <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 700, fontSize: 11, padding: '1px 6px', borderRadius: 6, margin: 0 }}>
                        100% Completo
                      </Tag>
                    ) : isEnProgreso ? (
                      <Tag color="warning" icon={<ClockCircleOutlined />} style={{ fontWeight: 700, fontSize: 11, padding: '1px 6px', borderRadius: 6, margin: 0 }}>
                        {cur.porcentaje}% En Carga
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

                  {/* Barra de Progreso y Resumen de Alumnos */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Space size={6}>
                        <TeamOutlined style={{ color: 'var(--cys-color-text-description)' }} />
                        <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--cys-color-text)' }}>
                          {cur.alumnosCompletos} de {cur.totalAlumnos} alumnos listos
                        </Text>
                      </Space>
                      <Text strong style={{ fontSize: 12.5, color: isCompleto ? 'var(--cys-color-success-text)' : isEnProgreso ? 'var(--cys-color-warning-text)' : "var(--cys-color-text-description)" }}>
                        {cur.porcentaje}%
                      </Text>
                    </div>

                    <Progress
                      percent={cur.porcentaje}
                      showInfo={false}
                      strokeColor={isCompleto ? '#10b981' : isEnProgreso ? '#f59e0b' : '#cbd5e1'}
                      size={['100%', 7]}
                    />

                    <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 11 }}>
                      <span style={{ color: 'var(--cys-color-success-text)', fontWeight: 600 }}>🟢 {cur.alumnosCompletos} Listos</span>
                      <span style={{ color: 'var(--cys-color-warning-text)', fontWeight: 600 }}>🟡 {cur.alumnosEnProgreso} En Curso</span>
                      <span style={{ color: 'var(--cys-color-text-description)', fontWeight: 600 }}>⚪ {cur.alumnosSinIniciar} Pendientes</span>
                    </div>
                  </div>

                  {/* Banner de Estado del Magic Link */}
                  <div
                    style={{
                      background: cur.tokenDocente ? 'var(--cys-color-success-bg)' : 'var(--cys-color-warning-bg)',
                      border: cur.tokenDocente ? '1px solid var(--cys-color-success-border)' : '1px solid var(--cys-color-warning-border)',
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
                      <LinkOutlined style={{ color: cur.tokenDocente ? 'var(--cys-color-success-text)' : 'var(--cys-color-warning-text)', fontSize: 13 }} />
                      <Text strong style={{ fontSize: 11.5, color: cur.tokenDocente ? 'var(--cys-color-success-text)' : 'var(--cys-color-warning-text)' }}>
                        {cur.tokenDocente
                          ? `Docente: ${cur.tokenDocente.docenteNombre || 'Docente de Grado'}`
                          : 'Sin enlace mágico generado'}
                      </Text>
                    </div>

                    {cur.tokenDocente ? (
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyTokenLink(cur.tokenDocente!.token, cur.tokenDocente!.docenteNombre)}
                        style={{ borderRadius: 6, fontSize: 10.5, fontWeight: 600, height: 24, padding: '0 8px' }}
                      >
                        Copiar
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
                        Generar
                      </Button>
                    )}
                  </div>

                  {/* Acciones de Tarjeta: Expansor de Materias y Botón Ver Planilla */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                    <Button
                      size="small"
                      type="text"
                      icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                      onClick={() => toggleExpandCurso(cur.cursoId)}
                      style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--cys-color-text-description)', padding: '0 4px' }}
                    >
                      {isExpanded ? 'Ocultar materias' : `Ver materias (${cur.materias.length})`}
                    </Button>

                    <Button
                      type="primary"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        navigate(`/app/boletines/calificaciones?curso=${cur.cursoId}&periodo=${selectedPeriodoId || ''}`);
                      }}
                      style={{ borderRadius: 6, fontWeight: 600, fontSize: 11.5 }}
                    >
                      Ver Planilla
                    </Button>
                  </div>

                  {/* Sección Expandible: Desglose de Materias */}
                  {isExpanded && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--cys-color-border-secondary)" }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          maxHeight: 160,
                          overflowY: 'auto',
                          paddingRight: 4,
                        }}
                      >
                        {cur.materias.map((m) => {
                          const isMateriaCompleta = m.porcentaje === 100;
                          const isMateriaParcial = m.porcentaje > 0 && m.porcentaje < 100;

                          return (
                            <div
                              key={m.cursoMateriaId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--cys-color-fill-quaternary)',
                                padding: '5px 8px',
                                borderRadius: 6,
                                border: '1px solid var(--cys-color-border-secondary)',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 100 }}>
                                <Text strong style={{ fontSize: 11, color: 'var(--cys-color-text)', display: 'block' }}>
                                  {m.materiaNombre}
                                </Text>
                                {m.docenteNombre && (
                                  <Text type="secondary" style={{ fontSize: 9.5 }}>
                                    {m.docenteNombre}
                                  </Text>
                                )}
                              </div>

                              <div className={ui.tightRow}>
                                <Text style={{ fontSize: 10.5, color: 'var(--cys-color-text-description)' }}>
                                  {m.alumnosEvaluados}/{m.totalAlumnos}
                                </Text>

                                <Tag
                                  color={isMateriaCompleta ? 'success' : isMateriaParcial ? 'warning' : 'default'}
                                  style={{ margin: 0, fontWeight: 700, fontSize: 9.5, minWidth: 38, textAlign: 'center', padding: '0 4px' }}
                                >
                                  {m.porcentaje}%
                                </Tag>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* 5. Modal Gestor de Enlaces Mágicos */}
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
    </div>
  );
};
