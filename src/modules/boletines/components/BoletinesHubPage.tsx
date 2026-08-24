import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Space,
  Badge,
  Spin,
  Tooltip,
} from 'antd';
import {
  ScheduleOutlined,
  TableOutlined,
  DashboardOutlined,
  SettingOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../store/appStore';
import { boletinService } from '../services/boletin.service';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import type { Periodo } from '../models/boletin.model';

const { Title, Text, Paragraph } = Typography;

export const BoletinesHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { cicloActual } = useAppStore();

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadContextData = async () => {
    try {
      setLoading(true);
      const cursosData = await boletinService.getCursos();
      setCursos(cursosData);

      if (cicloActual?.id) {
        const periodosData = await boletinService.getPeriodosByCiclo(cicloActual.id);
        setPeriodos(periodosData);
      }
    } catch (err) {
      console.error('Error al cargar datos del Hub de Boletines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContextData();
  }, [cicloActual?.id]);

  const activePeriodo = periodos[0]?.nombre || 'Período Activo';

  const hubSections = [
    {
      key: 'calificaciones',
      title: 'Carga de Calificaciones',
      badge: 'OPERATORIA DOCENTE',
      badgeColor: 'blue',
      icon: <TableOutlined />,
      iconBg: 'linear-gradient(135deg, #2563eb, #3b82f6)',
      iconShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
      description:
        'Planilla de calificaciones individualizada por alumno, evaluación de los 5 criterios pedagógicos oficiales, registro de inasistencias y cierres de bimestre.',
      features: [
        'Evaluación integral por alumno',
        '5 Criterios pedagógicos oficiales',
        'Asistencias y observaciones',
        'Soporte PPI / Apoyos pedagógicos',
      ],
      route: '/app/boletines/calificaciones',
      buttonText: 'Abrir Planilla de Calificaciones',
      buttonType: 'primary' as const,
    },
    {
      key: 'monitoreo',
      title: 'Monitoreo y Seguimiento',
      badge: 'GESTIÓN DIRECTIVA',
      badgeColor: 'success',
      icon: <DashboardOutlined />,
      iconBg: 'linear-gradient(135deg, #059669, #10b981)',
      iconShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
      description:
        'Tablero de control institucional en tiempo real. Supervisión del avance de carga de notas por curso, materias pendientes y gestión de Enlaces Mágicos.',
      features: [
        'Sondeo de avance en tiempo real',
        'Detección de materias incompletas',
        'Gestor de Enlaces Mágicos a docentes',
        'Exportación de planillas y reportes',
      ],
      route: '/app/boletines/monitoreo',
      buttonText: 'Ver Tablero de Monitoreo',
      buttonType: 'primary' as const,
    },
    {
      key: 'constructor',
      title: 'Constructor Curricular',
      badge: 'CONFIGURACIÓN ANUAL',
      badgeColor: 'purple',
      icon: <SettingOutlined />,
      iconBg: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      iconShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
      description:
        'Administración y estructuración anual de la malla académica. Asignación de materias por curso, configuración de los 5 criterios y períodos escolares.',
      features: [
        'Malla curricular por curso / división',
        'Definición de 5 Criterios por materia',
        'Configuración de Períodos Escolares',
        'Catálogo unificado de materias',
      ],
      route: '/app/boletines/constructor',
      buttonText: 'Abrir Constructor Curricular',
      buttonType: 'primary' as const,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: '100%' }}>
      {/* 1. Encabezado Estandarizado de Sección */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div className="cys-page-header">
          <div className="cys-page-header-icon">
            <ScheduleOutlined />
          </div>
          <div className="cys-page-header-content">
            <Title level={2} className="cys-page-header-title">
              Módulo de Boletines y Evaluación
            </Title>
            <Text className="cys-page-header-subtitle">
              Portal centralizado para la calificación pedagógica, monitoreo directivo y estructuración de la malla curricular.
            </Text>
          </div>
        </div>

        <Space size="middle" align="center" wrap>
          {loading ? (
            <Spin size="small" />
          ) : (
            <>
              <Tag
                bordered={false}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 20,
                  background: 'rgba(37, 99, 235, 0.08)',
                  color: '#2563eb',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <CalendarOutlined />
                <span>{cicloActual ? `Ciclo ${cicloActual.ano}` : 'Sin ciclo activo'}</span>
              </Tag>

              <Tag
                bordered={false}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 20,
                  background: 'rgba(16, 185, 129, 0.08)',
                  color: '#059669',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Badge status="processing" style={{ marginRight: -2 }} />
                <span>{activePeriodo}</span>
              </Tag>
            </>
          )}

          <Tooltip title="Actualizar datos del módulo">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => void loadContextData()}
              loading={loading}
            />
          </Tooltip>
        </Space>
      </div>

      {/* 2. Banner Resumen de Contexto Institucional */}
      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(16, 185, 129, 0.04) 100%)',
          border: '1px solid rgba(37, 99, 235, 0.12)',
        }}
        bodyStyle={{ padding: '18px 24px' }}
      >
        <Row gutter={[20, 16]} align="middle" justify="space-between">
          <Col xs={24} md={16}>
            <Space direction="vertical" size={4}>
              <Space size={8} align="center">
                <ThunderboltOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                  Flujo de Trabajo del Módulo
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
                Selecciona una de las 3 áreas de trabajo según tu rol: los <strong>docentes</strong> cargan notas y asistencias, el equipo <strong>directivo</strong> supervisa el avance institucional y el área <strong>administrativa</strong> configura cursos y criterios.
              </Text>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: 12,
                  background: 'var(--cys-color-bg-container, #ffffff)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  minWidth: 100,
                  textAlign: 'center',
                }}
              >
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block' }}>
                  CURSOS ACTIVOS
                </Text>
                <Text strong style={{ fontSize: 18, color: '#0f172a' }}>
                  {cursos.length}
                </Text>
              </div>

              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: 12,
                  background: 'var(--cys-color-bg-container, #ffffff)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  minWidth: 100,
                  textAlign: 'center',
                }}
              >
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block' }}>
                  BIMESTRES
                </Text>
                <Text strong style={{ fontSize: 18, color: '#0f172a' }}>
                  {periodos.length}
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 3. Cuadrícula de Tarjetas de Lanzamiento Interactivas */}
      <Row gutter={[20, 20]}>
        {hubSections.map((section) => (
          <Col xs={24} lg={8} key={section.key}>
            <Card
              hoverable
              className="cys-hub-card"
              onClick={() => navigate(section.route)}
              style={{
                height: '100%',
                borderRadius: 18,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid var(--cys-color-border, #e2e8f0)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              }}
              bodyStyle={{
                padding: '24px 22px',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Cabecera de la Tarjeta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: section.iconBg,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      boxShadow: section.iconShadow,
                    }}
                  >
                    {section.icon}
                  </div>
                  <Tag
                    color={section.badgeColor}
                    style={{
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 10.5,
                      padding: '2px 8px',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      margin: 0,
                    }}
                  >
                    {section.badge}
                  </Tag>
                </div>

                {/* Título y Descripción */}
                <Title level={4} style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>
                  {section.title}
                </Title>
                <Paragraph
                  type="secondary"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    marginBottom: 16,
                    minHeight: 56,
                  }}
                >
                  {section.description}
                </Paragraph>

                {/* Lista de Características / Puntos Clave */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: '14px',
                    borderRadius: 12,
                    background: 'var(--cys-color-bg-elevated, rgba(0, 0, 0, 0.02))',
                    marginBottom: 20,
                    border: '1px solid rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {section.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircleOutlined style={{ color: '#10b981', fontSize: 13, flexShrink: 0 }} />
                      <Text style={{ fontSize: 12.5, color: 'var(--cys-color-text-secondary, #475569)' }}>
                        {feat}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botón de Acción Principal */}
              <div>
                <Button
                  type={section.buttonType}
                  block
                  size="large"
                  icon={<ArrowRightOutlined />}
                  iconPosition="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(section.route);
                  }}
                  style={{
                    borderRadius: 10,
                    fontWeight: 600,
                    height: 42,
                  }}
                >
                  {section.buttonText}
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};
