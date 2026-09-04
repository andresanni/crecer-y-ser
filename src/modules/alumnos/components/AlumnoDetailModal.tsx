import React, { useEffect, useState, useMemo } from 'react';
import {
  Modal,
  Button,
  Tag,
  Space,
  Typography,
  Avatar,
  Tabs,
  Card,
  Spin,
  Empty,
  Row,
  Col,
  Tooltip,
  Popconfirm,
  Alert,
} from 'antd';
import {
  UserOutlined,
  IdcardOutlined,
  CalendarOutlined,
  PhoneOutlined,
  HomeOutlined,
  KeyOutlined,
  BookOutlined,
  TeamOutlined,
  EditOutlined,
  MailOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ManOutlined,
  WomanOutlined,
  DeleteOutlined,
  UserDeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Alumno } from '../models/alumno.model';
import { inscripcionService } from '../../inscripciones/services/inscripcion.service';
import type { Inscripcion } from '../../inscripciones/models/inscripcion.model';
import { responsableService } from '../../responsables/services/responsable.service';
import type { Responsable } from '../../responsables/models/responsable.model';

const { Title, Text } = Typography;

interface AlumnoDetailModalProps {
  alumno: Alumno | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (alumno: Alumno, initialTab?: string) => void;
  onDelete: (id: string) => void;
  onBaja?: (alumno: Alumno) => void;
}

const getAvatarGradient = (str: string) => {
  const colors = [
    'linear-gradient(135deg, #1e40af, #2563eb)',
    'linear-gradient(135deg, #0d9488, #10b981)',
    'linear-gradient(135deg, #0369a1, #0284c7)',
    'linear-gradient(135deg, #4f46e5, #6366f1)',
    'linear-gradient(135deg, #d97706, #f59e0b)',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const AlumnoDetailModal: React.FC<AlumnoDetailModalProps> = ({
  alumno,
  visible,
  onClose,
  onEdit,
  onDelete,
  onBaja,
}) => {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [responsables, setResponsables] = useState<
    { responsable: Responsable; vinculo: string; relationId: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('alumno');

  const handleModalClose = () => {
    setShowPassword(false);
    onClose();
  };

  const handleEdit = (targetTab: string = activeTab) => {
    if (!alumno) return;
    handleModalClose();
    onEdit(alumno, targetTab);
  };

  // Cargar inscripciones y responsables asociados
  useEffect(() => {
    if (!visible || !alumno) return;

    let isMounted = true;
    setActiveTab('alumno');
    const loadDetails = async () => {
      try {
        setLoading(true);
        const [inscList, respList] = await Promise.all([
          inscripcionService.getByAlumnoId(alumno.id),
          responsableService.getByAlumnoId(alumno.id),
        ]);
        if (!isMounted) return;
        setInscripciones(inscList);
        setResponsables(respList);
      } catch (error) {
        console.error('Error al cargar ficha detallada:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadDetails();

    return () => {
      isMounted = false;
    };
  }, [visible, alumno]);

  // Edad calculada
  const edad = useMemo(() => {
    if (!alumno?.fechaNacimiento) return null;
    const birth = dayjs(alumno.fechaNacimiento);
    if (!birth.isValid()) return null;
    const years = dayjs().diff(birth, 'year');
    return years >= 0 ? years : null;
  }, [alumno]);

  if (!alumno) return null;

  const initials = `${alumno.apellidos.charAt(0)}${alumno.nombres.charAt(0)}`.toUpperCase();
  const isBaja = alumno.estadoInscripcion === 'Baja';
  const primaryResponsable = responsables.length > 0 ? responsables[0] : null;

  const tabItems = [
    {
      key: 'alumno',
      label: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2, padding: '2px 0' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
            <UserOutlined style={{ fontSize: 13.5 }} />
            <span>1. Datos del Alumno</span>
          </span>
          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2, paddingLeft: 19 }}>
            ✓ Ficha Completa
          </span>
        </div>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
          {/* Barra de Resumen de Estado de Datos */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: 11.5, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Campos Registrados:
              </Text>
              <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                DNI: {alumno.dni || 'Cargado'}
              </Tag>
              {alumno.telefono ? (
                <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  Teléfono: {alumno.telefono}
                </Tag>
              ) : (
                <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  ⚠️ Sin Teléfono
                </Tag>
              )}
              {alumno.domicilio ? (
                <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  Domicilio Cargado
                </Tag>
              ) : (
                <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  ⚠️ Sin Domicilio
                </Tag>
              )}
              {alumno.usuarioAcadeu ? (
                <Tag color="blue" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  Acadeu: {alumno.usuarioAcadeu}
                </Tag>
              ) : (
                <Tag color="default" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  Sin usuario Acadeu
                </Tag>
              )}
            </div>
            {edad !== null && (
              <Tag color="cyan" style={{ margin: 0, borderRadius: 6, fontWeight: 700, fontSize: 11 }}>
                {edad} {edad === 1 ? 'año' : 'años'}
              </Tag>
            )}
          </div>

          {/* Card 1: Identificación y Datos Personales */}
          <Card
            className="detail-section-card"
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Space size={8} style={{ color: '#0d9488', fontWeight: 700 }}>
                  <IdcardOutlined style={{ color: '#0d9488' }} />
                  <span>Identificación y Filiación</span>
                </Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit('alumno')}
                  style={{ color: '#0d9488', fontWeight: 600, padding: 0 }}
                >
                  Editar
                </Button>
              </div>
            }
          >
            <Row gutter={[16, 14]}>
              <Col xs={24} sm={12} md={6}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">APELLIDOS</span>
                  <span className="detail-tile-value">{alumno.apellidos || '-'}</span>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">NOMBRES</span>
                  <span className="detail-tile-value">{alumno.nombres || '-'}</span>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">DOCUMENTO (DNI)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="detail-tile-value highlight">{alumno.dni || '-'}</span>
                    {alumno.dni && (
                      <Text copyable={{ text: alumno.dni, tooltips: ['Copiar DNI', '¡Copiado!'] }} />
                    )}
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">Nº DE LEGAJO</span>
                  <div>
                    {alumno.numeroLegajo ? (
                      <Tag color="cyan" style={{ fontWeight: 700, borderRadius: 6, fontSize: 12, padding: '1px 8px' }}>
                        {alumno.numeroLegajo}
                      </Tag>
                    ) : (
                      <Space size={4}>
                        <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Sin legajo</Text>
                        <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => handleEdit('alumno')}>
                          + Asignar
                        </Button>
                      </Space>
                    )}
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">FECHA DE NACIMIENTO</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span className="detail-tile-value">
                      {alumno.fechaNacimiento ? dayjs(alumno.fechaNacimiento).format('DD/MM/YYYY') : '-'}
                    </span>
                    {edad !== null && (
                      <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
                        {edad} {edad === 1 ? 'año' : 'años'}
                      </Tag>
                    )}
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">SEXO</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {alumno.sexo === 'Femenino' ? (
                      <WomanOutlined style={{ color: '#ec4899' }} />
                    ) : alumno.sexo === 'Masculino' ? (
                      <ManOutlined style={{ color: '#0284c7' }} />
                    ) : null}
                    <span className="detail-tile-value">{alumno.sexo || 'No especificado'}</span>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">NACIONALIDAD</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GlobalOutlined style={{ color: '#0d9488' }} />
                    <span className="detail-tile-value">{alumno.nacionalidad || 'Argentina'}</span>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Card 2: Contacto y Residencia */}
          <Card
            className="detail-section-card"
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Space size={8} style={{ color: '#0d9488', fontWeight: 700 }}>
                  <HomeOutlined style={{ color: '#0d9488' }} />
                  <span>Contacto y Domicilio</span>
                </Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit('alumno')}
                  style={{ color: '#0d9488', fontWeight: 600, padding: 0 }}
                >
                  Editar
                </Button>
              </div>
            }
          >
            <Row gutter={[16, 14]}>
              <Col xs={24} sm={12}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">TELÉFONO DEL ALUMNO</span>
                  <div>
                    {alumno.telefono ? (
                      <a
                        href={`tel:${alumno.telefono}`}
                        style={{
                          color: '#0d9488',
                          fontWeight: 600,
                          fontSize: 14,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <PhoneOutlined />
                        {alumno.telefono}
                      </a>
                    ) : (
                      <Space size={4}>
                        <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Sin registrar</Text>
                        <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => handleEdit('alumno')}>
                          + Completar
                        </Button>
                      </Space>
                    )}
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">DOMICILIO DECLARADO</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <HomeOutlined style={{ color: '#0d9488' }} />
                    {alumno.domicilio ? (
                      <span className="detail-tile-value">{alumno.domicilio}</span>
                    ) : (
                      <Space size={4}>
                        <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Sin registrar</Text>
                        <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => handleEdit('alumno')}>
                          + Completar
                        </Button>
                      </Space>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Card 3: Credenciales Acadeu */}
          <Card
            className="detail-section-card acadeu-card"
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Space size={8} style={{ color: '#4338ca', fontWeight: 700 }}>
                  <KeyOutlined style={{ color: '#6366f1' }} />
                  <span>Credenciales de Plataforma Escolar (Acadeu)</span>
                </Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit('alumno')}
                  style={{ color: '#4338ca', fontWeight: 600, padding: 0 }}
                >
                  Editar
                </Button>
              </div>
            }
          >
            <Row gutter={[16, 14]}>
              <Col xs={24} sm={12}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">USUARIO ACADEU</span>
                  <div>
                    {alumno.usuarioAcadeu ? (
                      <Space>
                        <Tag color="purple" style={{ fontWeight: 600, borderRadius: 6, padding: '2px 8px', fontSize: 13 }}>
                          <KeyOutlined style={{ marginRight: 4 }} />
                          {alumno.usuarioAcadeu}
                        </Tag>
                        <Text copyable={{ text: alumno.usuarioAcadeu, tooltips: ['Copiar usuario', '¡Copiado!'] }} />
                      </Space>
                    ) : (
                      <Space size={4}>
                        <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>No configurado</Text>
                        <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => handleEdit('alumno')}>
                          + Configurar
                        </Button>
                      </Space>
                    )}
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">CLAVE ACADEU</span>
                  <div>
                    {alumno.claveAcadeu ? (
                      <Space>
                        <Text code style={{ fontSize: 13, fontWeight: 600, padding: '2px 8px' }}>
                          {showPassword ? alumno.claveAcadeu : '••••••••'}
                        </Text>
                        <Tooltip title={showPassword ? 'Ocultar clave' : 'Mostrar clave'}>
                          <Button
                            type="text"
                            size="small"
                            icon={showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                            onClick={() => setShowPassword((prev) => !prev)}
                          />
                        </Tooltip>
                        <Text copyable={{ text: alumno.claveAcadeu, tooltips: ['Copiar clave', '¡Copiado!'] }} />
                      </Space>
                    ) : (
                      <Space size={4}>
                        <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>No configurada</Text>
                        <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => handleEdit('alumno')}>
                          + Configurar
                        </Button>
                      </Space>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      ),
    },
    {
      key: 'inscripcion',
      label: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2, padding: '2px 0' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
            <BookOutlined style={{ fontSize: 13.5 }} />
            <span>2. Inscripción y Cursada</span>
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              marginTop: 2,
              paddingLeft: 19,
              color: alumno.cursoNombre ? '#2563eb' : '#d97706',
            }}
          >
            {alumno.cursoNombre ? `• ${alumno.cursoNombre}` : '⚠️ Sin Curso'}
          </span>
        </div>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
          {/* Barra de Resumen de Estado de Cursada */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: 11.5, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Estado de Matrícula:
              </Text>
              {alumno.cursoNombre ? (
                <Tag color="blue" style={{ margin: 0, borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                  {alumno.cursoNombre} {alumno.turno ? `(${alumno.turno})` : ''}
                </Tag>
              ) : (
                <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  ⚠️ Sin Curso Asignado
                </Tag>
              )}
              <Tag
                color={alumno.estadoInscripcion === 'Baja' ? 'error' : 'success'}
                style={{ margin: 0, borderRadius: 6, fontSize: 11, fontWeight: 600 }}
              >
                Cursada: {alumno.estadoInscripcion || 'Regular'}
              </Tag>
              {alumno.numeroOrden ? (
                <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  Nº de Orden: #{alumno.numeroOrden}
                </Tag>
              ) : (
                <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  ⚠️ Sin Nº de Orden
                </Tag>
              )}
              {alumno.numeroInscripcion ? (
                <Tag color="default" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  Matrícula: {alumno.numeroInscripcion}
                </Tag>
              ) : (
                <Tag color="default" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                  Sin Matrícula
                </Tag>
              )}
            </div>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit('inscripcion')}
              style={{ color: '#2563eb', fontWeight: 600, padding: 0 }}
            >
              Editar Cursada
            </Button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Spin tip="Cargando historial de cursada..." />
            </div>
          ) : inscripciones.length === 0 ? (
            <Card className="detail-section-card" size="small" style={{ textAlign: 'center', padding: '24px 0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="El alumno no posee inscripciones activas registradas."
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleEdit('inscripcion')} style={{ borderRadius: 8 }}>
                  Asignar Curso e Inscribir
                </Button>
              </Empty>
            </Card>
          ) : (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {inscripciones.map((insc) => {
                const isRegular = insc.estado === 'Regular';
                const isLibre = insc.estado === 'Libre';
                const isBajaInsc = insc.estado === 'Baja';
                const statusColor = isRegular ? 'green' : isLibre ? 'orange' : 'red';

                return (
                  <Card
                    key={insc.id}
                    className="detail-sub-card"
                    size="small"
                    style={{
                      borderTop: isBajaInsc ? '3px solid #ef4444' : '3px solid #2563eb',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <Text strong style={{ fontSize: 16, color: isBajaInsc ? '#b91c1c' : '#0f172a' }}>
                          {insc.cursoNombre || 'Curso no asignado'}
                        </Text>
                        {insc.nivelNombre && (
                          <Tag color="blue" style={{ marginLeft: 8, fontWeight: 600, borderRadius: 6 }}>
                            {insc.nivelNombre}
                          </Tag>
                        )}
                      </div>
                      <Tag color={statusColor} style={{ fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>
                        {insc.estado}
                      </Tag>
                    </div>

                    <Row gutter={[16, 12]}>
                      <Col xs={12} sm={isBajaInsc ? 4 : 6}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">CICLO LECTIVO</span>
                          <span className="detail-tile-value">{insc.cicloAno || '-'}</span>
                        </div>
                      </Col>
                      <Col xs={12} sm={isBajaInsc ? 4 : 6}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">Nº DE ORDEN</span>
                          <span className="detail-tile-value">{insc.numeroOrden ?? '-'}</span>
                        </div>
                      </Col>
                      <Col xs={12} sm={isBajaInsc ? 4 : 6}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">Nº INSCRIPCIÓN</span>
                          <span className="detail-tile-value">{insc.numeroInscripcion || '-'}</span>
                        </div>
                      </Col>
                      <Col xs={12} sm={isBajaInsc ? 4 : 6}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">FECHA DE INGRESO</span>
                          <span className="detail-tile-value">
                            {insc.fechaIngreso ? dayjs(insc.fechaIngreso).format('DD/MM/YYYY') : '-'}
                          </span>
                        </div>
                      </Col>
                      {isBajaInsc && (
                        <Col xs={12} sm={8}>
                          <div className="detail-data-tile">
                            <span className="detail-tile-label" style={{ color: '#dc2626' }}>FECHA DE BAJA / EGRESO</span>
                            <span className="detail-tile-value" style={{ color: '#dc2626', fontWeight: 700 }}>
                              {insc.fechaEgreso ? dayjs(insc.fechaEgreso).format('DD/MM/YYYY') : 'Sin fecha registrada'}
                            </span>
                          </div>
                        </Col>
                      )}
                    </Row>
                  </Card>
                );
              })}
            </Space>
          )}
        </div>
      ),
    },
    {
      key: 'responsable',
      label: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2, padding: '2px 0' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
            <TeamOutlined style={{ fontSize: 13.5 }} />
            <span>3. Responsable y Vínculo</span>
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              marginTop: 2,
              paddingLeft: 19,
              color: responsables.length > 0 ? '#16a34a' : '#d97706',
            }}
          >
            {responsables.length > 0 ? '✓ Tutor Vinculado' : '⚠️ Sin Responsable'}
          </span>
        </div>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Spin tip="Cargando datos del responsable..." />
            </div>
          ) : responsables.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Alert
                type="warning"
                showIcon
                style={{ borderRadius: 10 }}
                message={<strong>Alumno sin Responsable Legal vinculado</strong>}
                description="Este estudiante aún no tiene un tutor o responsable registrado en el sistema. Los datos de contacto familiar son indispensables para el seguimiento pedagógico y las comunicaciones escolares."
                action={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleEdit('responsable')}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    Asociar Responsable
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {/* Barra de Resumen de Estado de Datos del Responsable */}
              {primaryResponsable && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text strong style={{ fontSize: 11.5, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Datos del Responsable:
                    </Text>
                    <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                      DNI: {primaryResponsable.responsable.dni || 'Cargado'}
                    </Tag>
                    {primaryResponsable.responsable.telefono ? (
                      <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                        Teléfono: {primaryResponsable.responsable.telefono}
                      </Tag>
                    ) : (
                      <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                        ⚠️ Sin Teléfono
                      </Tag>
                    )}
                    {primaryResponsable.responsable.email ? (
                      <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                        Email: {primaryResponsable.responsable.email}
                      </Tag>
                    ) : (
                      <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                        ⚠️ Sin Email
                      </Tag>
                    )}
                    <Tag color="blue" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                      Vínculo: {primaryResponsable.vinculo}
                    </Tag>
                  </div>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit('responsable')}
                    style={{ color: '#2563eb', fontWeight: 600, padding: 0 }}
                  >
                    Editar Tutor
                  </Button>
                </div>
              )}

              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {responsables.map((item) => (
                  <Card
                    key={item.relationId}
                    className="detail-sub-card"
                    size="small"
                    style={{ borderTop: '3px solid #0284c7' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <Space size="middle">
                        <Avatar
                          size={46}
                          style={{
                            background: getAvatarGradient(item.responsable.apellidos + item.responsable.nombres),
                            fontWeight: 800,
                            fontSize: 16,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          }}
                        >
                          {item.responsable.apellidos.charAt(0)}
                          {item.responsable.nombres.charAt(0)}
                        </Avatar>
                        <div>
                          <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                            {item.responsable.apellidos}, {item.responsable.nombres}
                          </Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              DNI: {item.responsable.dni || '-'}
                            </Text>
                            {item.responsable.dni && (
                              <Text copyable={{ text: item.responsable.dni, tooltips: ['Copiar DNI', '¡Copiado!'] }} />
                            )}
                          </div>
                        </div>
                      </Space>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Tag color="geekblue" style={{ fontWeight: 700, borderRadius: 6, padding: '3px 10px', fontSize: 13 }}>
                          {item.vinculo}
                        </Tag>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEdit('responsable')}
                          style={{ borderRadius: 6 }}
                        >
                          Editar
                        </Button>
                      </div>
                    </div>

                    <Row gutter={[16, 12]}>
                      <Col xs={24} sm={12}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">TELÉFONO DE CONTACTO</span>
                          <div>
                            {item.responsable.telefono ? (
                              <a
                                href={`tel:${item.responsable.telefono}`}
                                style={{
                                  color: '#0d9488',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <PhoneOutlined />
                                {item.responsable.telefono}
                              </a>
                            ) : (
                              <Space size={4}>
                                <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Sin registrar</Text>
                                <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => handleEdit('responsable')}>
                                  + Agregar
                                </Button>
                              </Space>
                            )}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">CORREO ELECTRÓNICO</span>
                          <div>
                            {item.responsable.email ? (
                              <a
                                href={`mailto:${item.responsable.email}`}
                                style={{
                                  color: '#2563eb',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <MailOutlined />
                                {item.responsable.email}
                              </a>
                            ) : (
                              <Space size={4}>
                                <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Sin registrar</Text>
                                <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => handleEdit('responsable')}>
                                  + Agregar
                                </Button>
                              </Space>
                            )}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">PROFESIÓN U OCUPACIÓN</span>
                          <span className="detail-tile-value">{item.responsable.profesion || 'No especificada'}</span>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">NACIONALIDAD</span>
                          <span className="detail-tile-value">{item.responsable.nacionalidad || 'Argentina'}</span>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={visible}
      onCancel={handleModalClose}
      width={880}
      style={{ top: 12, maxWidth: '96vw' }}
      className="student-detail-modal"
      closable={true}
      footer={[
        <Popconfirm
          key="delete"
          title="¿Eliminar registro de alumno?"
          description="Esta acción eliminará de forma permanente al alumno del sistema. No se puede deshacer."
          onConfirm={() => {
            onDelete(alumno.id);
            handleModalClose();
          }}
          okText="Sí, eliminar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          <Button
            danger
            type="text"
            icon={<DeleteOutlined />}
            style={{ fontWeight: 600, float: 'left' }}
          >
            Eliminar Alumno
          </Button>
        </Popconfirm>,
        !isBaja && onBaja ? (
          <Button
            key="baja"
            danger
            icon={<UserDeleteOutlined />}
            style={{ borderRadius: 10, fontWeight: 600 }}
            onClick={() => {
              handleModalClose();
              onBaja(alumno);
            }}
          >
            Dar de Baja
          </Button>
        ) : null,
        <Button key="close" size="large" onClick={handleModalClose} style={{ borderRadius: 10, fontWeight: 600 }}>
          Cerrar
        </Button>,
        <Button
          key="edit"
          type="primary"
          size="large"
          icon={<EditOutlined />}
          className="btn-primary-gradient"
          style={{ borderRadius: 10, fontWeight: 600 }}
          onClick={() => handleEdit(activeTab)}
        >
          Editar Ficha del Alumno
        </Button>,
      ]}
      title={null}
      destroyOnClose
    >
      {/* Cabecera visual del Alumno */}
      <div className="detail-header-banner">
        <Avatar
          size={58}
          style={{
            background: isBaja
              ? 'linear-gradient(135deg, #ef4444, #991b1b)'
              : getAvatarGradient(alumno.apellidos + alumno.nombres),
            fontSize: 20,
            fontWeight: 800,
            boxShadow: isBaja
              ? '0 4px 14px rgba(239, 68, 68, 0.35)'
              : '0 4px 14px rgba(37, 99, 235, 0.25)',
            border: '2px solid #ffffff',
            flexShrink: 0,
          }}
        >
          {initials}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Title level={3} style={{ margin: 0, color: isBaja ? '#991b1b' : '#0f172a', letterSpacing: '-0.5px' }}>
                {alumno.apellidos}, {alumno.nombres}
              </Title>
              <Tag color="blue" style={{ borderRadius: 6, fontWeight: 700, fontSize: 12, padding: '1px 8px' }}>
                DNI: {alumno.dni}
              </Tag>
            </div>
            <Button
              type="primary"
              icon={<EditOutlined />}
              className="btn-primary-gradient"
              onClick={() => handleEdit(activeTab)}
              style={{ borderRadius: 8, fontWeight: 600, fontSize: 13 }}
            >
              Editar Ficha
            </Button>
          </div>
          <Space size={8} wrap style={{ marginTop: 6 }}>
            {alumno.cursoNombre && (
              <Tag
                icon={<BookOutlined />}
                style={{
                  borderRadius: 6,
                  padding: '2px 8px',
                  fontWeight: 600,
                  color: '#2563eb',
                  background: '#eff6ff',
                  borderColor: '#bfdbfe',
                }}
              >
                {alumno.cursoNombre} {alumno.turno ? `(${alumno.turno})` : ''}
              </Tag>
            )}
            {alumno.numeroLegajo && (
              <Tag
                icon={<IdcardOutlined />}
                style={{
                  borderRadius: 6,
                  padding: '2px 8px',
                  fontWeight: 600,
                  color: '#0284c7',
                  background: '#f0f9ff',
                  borderColor: '#bae6fd',
                }}
              >
                Legajo: {alumno.numeroLegajo}
              </Tag>
            )}
            {edad !== null && (
              <span className="detail-header-chip">
                <CalendarOutlined style={{ color: '#2563eb' }} />
                <span>{edad} años</span>
              </span>
            )}
            {alumno.nacionalidad && (
              <span className="detail-header-chip">
                <GlobalOutlined style={{ color: '#0284c7' }} />
                <span>{alumno.nacionalidad}</span>
              </span>
            )}
            {isBaja ? (
              <Tag
                color="error"
                icon={<CloseCircleOutlined />}
                style={{ borderRadius: 6, fontWeight: 700, padding: '2px 8px' }}
              >
                Baja {alumno.fechaEgreso ? `el ${dayjs(alumno.fechaEgreso).format('DD/MM/YYYY')}` : ''}
              </Tag>
            ) : (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 6, fontWeight: 600 }}>
                {alumno.estadoInscripcion || 'Regular'}
              </Tag>
            )}
          </Space>
        </div>
      </div>

      {/* Alerta si el estudiante está dado de baja */}
      {isBaja && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12, borderRadius: 10 }}
          message={<strong>Estudiante en Estado de Baja</strong>}
          description={`Baja registrada oficialmente el ${
            alumno.fechaEgreso ? dayjs(alumno.fechaEgreso).format('DD/MM/YYYY') : 'día correspondiente'
          }. El alumno no forma parte de la cursada regular activa.`}
        />
      )}

      {/* Tabs con toda la información desglosada */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={tabItems}
        className="detail-tabs"
      />
    </Modal>
  );
};
