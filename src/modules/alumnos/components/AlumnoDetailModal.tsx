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
  EyeOutlined,
  EyeInvisibleOutlined,
  ManOutlined,
  WomanOutlined,
  DeleteOutlined,
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
  onEdit: (alumno: Alumno) => void;
  onDelete: (id: string) => void;
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
}) => {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [responsables, setResponsables] = useState<
    { responsable: Responsable; vinculo: string; relationId: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleModalClose = () => {
    setShowPassword(false);
    onClose();
  };

  // Cargar inscripciones y responsables asociados
  useEffect(() => {
    if (!visible || !alumno) return;

    let isMounted = true;
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

  const tabItems = [
    {
      key: 'personales',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <UserOutlined />
          Datos Personales y Contacto
        </span>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 10 }}>
          {/* Card 1: Identificación y Datos Personales */}
          <Card
            className="detail-section-card"
            size="small"
            title={
              <Space size={8} style={{ color: '#1e40af', fontWeight: 700 }}>
                <IdcardOutlined style={{ color: '#2563eb' }} />
                <span>Identificación y Filiación</span>
              </Space>
            }
          >
            <Row gutter={[20, 16]}>
              <Col xs={24} sm={12} md={8}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">APELLIDOS</span>
                  <span className="detail-tile-value">{alumno.apellidos || '-'}</span>
                </div>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">NOMBRES</span>
                  <span className="detail-tile-value">{alumno.nombres || '-'}</span>
                </div>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">DOCUMENTO (DNI)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="detail-tile-value highlight">{alumno.dni || '-'}</span>
                    {alumno.dni && (
                      <Text copyable={{ text: alumno.dni, tooltips: ['Copiar DNI', '¡Copiado!'] }} />
                    )}
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">Nº DE LEGAJO</span>
                  <div>
                    {alumno.numeroLegajo ? (
                      <Tag color="cyan" style={{ fontWeight: 700, borderRadius: 6, fontSize: 13, padding: '2px 8px' }}>
                        {alumno.numeroLegajo}
                      </Tag>
                    ) : (
                      <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Sin legajo asignado</Text>
                    )}
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">FECHA DE NACIMIENTO</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="detail-tile-value">
                      {alumno.fechaNacimiento ? dayjs(alumno.fechaNacimiento).format('DD/MM/YYYY') : '-'}
                    </span>
                    {edad !== null && (
                      <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
                        {edad} {edad === 1 ? 'año' : 'años'}
                      </Tag>
                    )}
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} md={8}>
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

              <Col xs={24} sm={12} md={8}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">NACIONALIDAD</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GlobalOutlined style={{ color: '#0284c7' }} />
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
              <Space size={8} style={{ color: '#1e40af', fontWeight: 700 }}>
                <HomeOutlined style={{ color: '#2563eb' }} />
                <span>Contacto y Domicilio</span>
              </Space>
            }
          >
            <Row gutter={[20, 16]}>
              <Col xs={24} sm={12}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">TELÉFONO DE CONTACTO</span>
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
                      <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Sin registrar</Text>
                    )}
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">DOMICILIO DECLARADO</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <HomeOutlined style={{ color: '#2563eb' }} />
                    <span className="detail-tile-value">
                      {alumno.domicilio || <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Sin registrar</Text>}
                    </span>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Card 3: Credenciales de Plataforma Escolar (Acadeu) */}
          <Card
            className="detail-section-card acadeu-card"
            size="small"
            title={
              <Space size={8} style={{ color: '#4338ca', fontWeight: 700 }}>
                <KeyOutlined style={{ color: '#6366f1' }} />
                <span>Credenciales de Plataforma Escolar (Acadeu)</span>
              </Space>
            }
          >
            <Row gutter={[20, 16]}>
              <Col xs={24} sm={12}>
                <div className="detail-data-tile">
                  <span className="detail-tile-label">USUARIO ACADEU</span>
                  <div>
                    {alumno.usuarioAcadeu ? (
                      <Space>
                        <Tag color="purple" style={{ fontWeight: 600, borderRadius: 6, padding: '3px 8px', fontSize: 13 }}>
                          <KeyOutlined style={{ marginRight: 4 }} />
                          {alumno.usuarioAcadeu}
                        </Tag>
                        <Text copyable={{ text: alumno.usuarioAcadeu, tooltips: ['Copiar usuario', '¡Copiado!'] }} />
                      </Space>
                    ) : (
                      <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>No configurado</Text>
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
                      <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>No configurada</Text>
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
      key: 'inscripciones',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <BookOutlined />
          Cursada e Inscripciones ({inscripciones.length})
        </span>
      ),
      children: (
        <div style={{ paddingTop: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="Cargando historial de cursada..." />
            </div>
          ) : inscripciones.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="El alumno no posee inscripciones registradas."
            />
          ) : (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              {inscripciones.map((insc) => {
                const isRegular = insc.estado === 'Regular';
                const isLibre = insc.estado === 'Libre';
                const statusColor = isRegular ? 'green' : isLibre ? 'orange' : 'red';

                return (
                  <Card
                    key={insc.id}
                    className="detail-sub-card"
                    size="small"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
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
                      <Col xs={12} sm={6}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">CICLO LECTIVO</span>
                          <span className="detail-tile-value">{insc.cicloAno || '-'}</span>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">Nº DE ORDEN</span>
                          <span className="detail-tile-value">{insc.numeroOrden ?? '-'}</span>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">Nº INSCRIPCIÓN</span>
                          <span className="detail-tile-value">{insc.numeroInscripcion || '-'}</span>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">FECHA DE INGRESO</span>
                          <span className="detail-tile-value">
                            {insc.fechaIngreso ? dayjs(insc.fechaIngreso).format('DD/MM/YYYY') : '-'}
                          </span>
                        </div>
                      </Col>
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
      key: 'responsables',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <TeamOutlined />
          Responsables y Vínculos ({responsables.length})
        </span>
      ),
      children: (
        <div style={{ paddingTop: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="Cargando responsables..." />
            </div>
          ) : responsables.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No hay responsables asociados a este alumno."
            />
          ) : (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              {responsables.map((item) => (
                <Card
                  key={item.relationId}
                  className="detail-sub-card"
                  size="small"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <Space size="middle">
                      <Avatar
                        size={42}
                        style={{
                          background: getAvatarGradient(item.responsable.apellidos + item.responsable.nombres),
                          fontWeight: 800,
                          fontSize: 15,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        {item.responsable.apellidos.charAt(0)}
                        {item.responsable.nombres.charAt(0)}
                      </Avatar>
                      <div>
                        <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                          {item.responsable.apellidos}, {item.responsable.nombres}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                          DNI: {item.responsable.dni || '-'}
                        </Text>
                      </div>
                    </Space>

                    <Tag color="geekblue" style={{ fontWeight: 700, borderRadius: 6, padding: '3px 10px', fontSize: 13 }}>
                      {item.vinculo}
                    </Tag>
                  </div>

                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={12}>
                      <div className="detail-data-tile">
                        <span className="detail-tile-label">TELÉFONO</span>
                        <div>
                          {item.responsable.telefono ? (
                            <a href={`tel:${item.responsable.telefono}`} style={{ color: '#0d9488', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <PhoneOutlined />
                              {item.responsable.telefono}
                            </a>
                          ) : (
                            <Text type="secondary">-</Text>
                          )}
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="detail-data-tile">
                        <span className="detail-tile-label">CORREO ELECTRÓNICO</span>
                        <div>
                          {item.responsable.email ? (
                            <a href={`mailto:${item.responsable.email}`} style={{ color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <MailOutlined />
                              {item.responsable.email}
                            </a>
                          ) : (
                            <Text type="secondary">-</Text>
                          )}
                        </div>
                      </div>
                    </Col>
                    {item.responsable.profesion && (
                      <Col xs={24} sm={12}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">PROFESIÓN U OCUPACIÓN</span>
                          <span className="detail-tile-value">{item.responsable.profesion}</span>
                        </div>
                      </Col>
                    )}
                    {item.responsable.nacionalidad && (
                      <Col xs={24} sm={12}>
                        <div className="detail-data-tile">
                          <span className="detail-tile-label">NACIONALIDAD</span>
                          <span className="detail-tile-value">{item.responsable.nacionalidad}</span>
                        </div>
                      </Col>
                    )}
                  </Row>
                </Card>
              ))}
            </Space>
          )}
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={visible}
      onCancel={handleModalClose}
      width={860}
      style={{ top: 10, maxWidth: '95vw' }}
      className="student-detail-modal"
      closable={false}
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
          onClick={() => {
            handleModalClose();
            onEdit(alumno);
          }}
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
          size={64}
          style={{
            background: getAvatarGradient(alumno.apellidos + alumno.nombres),
            fontSize: 22,
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
            border: '2px solid #ffffff',
            flexShrink: 0,
          }}
        >
          {initials}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <Title level={3} style={{ margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>
              {alumno.apellidos}, {alumno.nombres}
            </Title>
            <Tag color="blue" style={{ borderRadius: 8, fontWeight: 700, fontSize: 13, padding: '2px 10px' }}>
              DNI: {alumno.dni}
            </Tag>
          </div>
          <Space size={10} wrap>
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
            <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 6, fontWeight: 600 }}>
              Activo en Sistema
            </Tag>
          </Space>
        </div>
      </div>

      {/* Tabs con toda la información desglosada */}
      <Tabs defaultActiveKey="personales" items={tabItems} className="detail-tabs" />
    </Modal>
  );
};
