import React, { useEffect, useState } from 'react';
import {
  Table,
  Typography,
  Button,
  Space,
  App,
  Popconfirm,
  Input,
  Card,
  Tag,
  Row,
  Col,
  Statistic,
  Segmented,
  Avatar,
  Empty,
  Tooltip,
  Badge,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  IdcardOutlined,
  UserOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { alumnoService } from '../services/alumno.service';
import type { Alumno } from '../models/alumno.model';
import { AlumnoFormModal, type AlumnoFormValues } from './AlumnoFormModal';
import { useAppStore } from '../../../store/appStore';

const { Title, Text } = Typography;

// Helper to pick deterministic gradient color based on student name
const getAvatarGradient = (str: string) => {
  const colors = [
    'linear-gradient(135deg, #0d9488, #10b981)',
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #0284c7, #2563eb)',
    'linear-gradient(135deg, #ec4899, #f43f5e)',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const AlumnoList: React.FC = () => {
  const { message } = App.useApp();
  const { cicloActual } = useAppStore();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(inputValue);
      setCurrentPage(1);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  const fetchAlumnos = async () => {
    try {
      setLoading(true);
      const data = await alumnoService.getList(currentPage, 50, searchTerm);
      setAlumnos(data.items);
      setTotalItems(data.totalItems);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      message.error('Error al cargar la lista de alumnos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumnos().then(() => {
      alumnoService.subscribeToRealtime((action, alumno) => {
        setAlumnos((prev) => {
          if (action === 'create') {
            if (prev.some((a) => a.id === alumno.id)) return prev;
            return [alumno, ...prev];
          }
          if (action === 'update') {
            return prev.map((a) => (a.id === alumno.id ? alumno : a));
          }
          if (action === 'delete') {
            return prev.filter((a) => a.id !== alumno.id);
          }
          return prev;
        });
      });
    });

    return () => {
      alumnoService.unsubscribeRealtime();
    };
  }, [currentPage, searchTerm]);

  const handleOpenModal = (alumno?: Alumno) => {
    setEditingAlumno(alumno || null);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingAlumno(null);
  };

  const handleSubmit = async (values: AlumnoFormValues, originalUpdatedDate?: string) => {
    try {
      const dataToSubmit = {
        numero_legajo: values.numeroLegajo,
        dni: values.dni,
        apellidos: values.apellidos,
        nombres: values.nombres,
        fecha_nacimiento: values.fechaNacimiento ? values.fechaNacimiento.format('YYYY-MM-DD') : '',
      };

      if (editingAlumno) {
        if (!originalUpdatedDate) throw new Error('Falta la fecha de actualización original');
        await alumnoService.update(editingAlumno.id, dataToSubmit, originalUpdatedDate);
        message.success('Alumno actualizado con éxito');
      } else {
        await alumnoService.create(dataToSubmit);
        message.success('Alumno registrado con éxito');
      }
      handleCloseModal();
    } catch (error: unknown) {
      console.error('Error al guardar alumno:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error al guardar los datos del alumno';
      message.error(errorMsg);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await alumnoService.delete(id);
      message.success('Alumno eliminado con éxito');
    } catch (error) {
      console.error('Error al eliminar alumno:', error);
      message.error('Error al eliminar el alumno');
    }
  };

  const columns: ColumnsType<Alumno> = [
    {
      title: 'Estudiante',
      key: 'estudiante',
      render: (_, record) => {
        const initials = `${record.apellidos.charAt(0)}${record.nombres.charAt(0)}`.toUpperCase();
        return (
          <Space size="middle">
            <Avatar
              size={40}
              className="student-avatar"
              style={{ background: getAvatarGradient(record.apellidos + record.nombres) }}
            >
              {initials}
            </Avatar>
            <div>
              <span className="student-name">
                {record.apellidos}, {record.nombres}
              </span>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Registrado en la institución
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Legajo',
      dataIndex: 'numeroLegajo',
      key: 'numeroLegajo',
      width: 140,
      render: (legajo) => (
        <Tag
          icon={<IdcardOutlined />}
          style={{
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(13, 148, 136, 0.08)',
            color: '#0d9488',
            border: '1px solid rgba(13, 148, 136, 0.2)',
          }}
        >
          {legajo}
        </Tag>
      ),
    },
    {
      title: 'DNI',
      dataIndex: 'dni',
      key: 'dni',
      width: 160,
      responsive: ['sm'],
      render: (dni) => (
        <Text copyable={{ text: dni, tooltips: ['Copiar DNI', 'Copiaste el DNI'] }} className="student-dni" style={{ fontWeight: 500 }}>
          {dni}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Editar registro">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#0284c7' }} />}
              onClick={() => handleOpenModal(record)}
              aria-label="Editar alumno"
            />
          </Tooltip>
          <Tooltip title="Eliminar alumno">
            <Popconfirm
              title="¿Eliminar registro de alumno?"
              description="Esta acción no se puede deshacer."
              onConfirm={() => handleDelete(record.id)}
              okText="Sí, eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="Eliminar alumno" />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* KPI Cards Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="kpi-card" bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  Total Registrados
                </Text>
                <Statistic
                  value={totalItems}
                  valueStyle={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-heading)' }}
                  suffix={<Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>alumnos</Text>}
                />
              </div>
              <div className="kpi-icon-wrapper kpi-total">
                <UserOutlined />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="kpi-card" bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  Ciclo Lectivo Activo
                </Text>
                <Statistic
                  value={cicloActual ? cicloActual.ano : 2026}
                  valueStyle={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-heading)' }}
                  prefix={<CalendarOutlined style={{ fontSize: 20, marginRight: 6, color: '#0284c7' }} />}
                />
              </div>
              <div className="kpi-icon-wrapper kpi-ciclo">
                <CalendarOutlined />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="kpi-card" bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  Sincronización
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Badge status="processing" color="#10b981" />
                  <Text strong style={{ fontSize: 18, fontFamily: 'var(--font-heading)' }}>
                    Tiempo Real
                  </Text>
                </div>
              </div>
              <div className="kpi-icon-wrapper kpi-sync">
                <CheckCircleOutlined />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Header Title Section */}
      <div className="page-heading">
        <Title level={2} style={{ margin: 0 }}>
          Directorio de Alumnos
        </Title>
        <span className="page-subtitle">Consultá, buscá y gestioná las fichas estudiantiles en tiempo real.</span>
      </div>

      {/* Toolbar & Filters */}
      <div className="toolbar">
        <Space size="middle" wrap>
          <Input.Search
            placeholder="Buscar por nombre, apellido o DNI..."
            allowClear
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{ width: 280 }}
            prefix={<SearchOutlined style={{ color: '#0d9488' }} />}
            className="toolbar-search"
          />
          <Tooltip title="Actualizar lista">
            <Button icon={<ReloadOutlined />} onClick={fetchAlumnos} loading={loading} />
          </Tooltip>
          {searchTerm && (
            <Tag closable onClose={() => setInputValue('')} color="teal" style={{ borderRadius: 6, padding: '4px 8px' }}>
              Filtro: "{searchTerm}"
            </Tag>
          )}
        </Space>

        <Space size="middle">
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as 'table' | 'grid')}
            options={[
              { label: 'Tabla', value: 'table', icon: <UnorderedListOutlined /> },
              { label: 'Tarjetas', value: 'grid', icon: <AppstoreOutlined /> },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => handleOpenModal()}
            className="btn-primary-gradient"
          >
            Nuevo alumno
          </Button>
        </Space>
      </div>

      {/* Selection Status Banner if rows selected */}
      {selectedRowKeys.length > 0 && (
        <Card style={{ marginBottom: 16, background: '#f0fdfa', borderColor: '#99f6e4', padding: '8px 16px' }} bodyStyle={{ padding: 0 }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Text style={{ color: '#0f766e', fontWeight: 600 }}>
              {selectedRowKeys.length} {selectedRowKeys.length === 1 ? 'alumno seleccionado' : 'alumnos seleccionados'}
            </Text>
            <Button size="small" type="link" onClick={() => setSelectedRowKeys([])}>
              Desmarcar todos
            </Button>
          </Space>
        </Card>
      )}

      {/* Content View: Table vs Grid */}
      {viewMode === 'table' ? (
        <Card className="students-card">
          <Table
            className="students-table"
            columns={columns}
            dataSource={alumnos}
            rowKey="id"
            loading={loading}
            scroll={{ x: 650 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={searchTerm ? `No se encontraron alumnos para "${searchTerm}"` : 'No hay alumnos registrados aún'}
                >
                  <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
                    Registrar primer alumno
                  </Button>
                </Empty>
              ),
            }}
            pagination={{
              current: currentPage,
              pageSize: 50,
              total: totalItems,
              onChange: (page) => setCurrentPage(page),
              showSizeChanger: false,
              showTotal: (total) => (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Total: <strong>{total}</strong> registros
                </Text>
              ),
            }}
          />
        </Card>
      ) : (
        <div>
          {alumnos.length === 0 && !loading ? (
            <Card className="students-card">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={searchTerm ? `No se encontraron alumnos para "${searchTerm}"` : 'No hay alumnos registrados aún'}
              />
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {alumnos.map((alumno) => {
                const initials = `${alumno.apellidos.charAt(0)}${alumno.nombres.charAt(0)}`.toUpperCase();
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={alumno.id}>
                    <Card className="student-grid-card" bodyStyle={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <Avatar
                          size={46}
                          style={{
                            background: getAvatarGradient(alumno.apellidos + alumno.nombres),
                            fontWeight: 700,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Tag className="student-legajo-tag">
                          {alumno.numeroLegajo}
                        </Tag>
                      </div>

                      <Title level={5} style={{ margin: '0 0 4px 0', fontSize: 15 }}>
                        {alumno.apellidos}, {alumno.nombres}
                      </Title>

                      <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          DNI: <strong className="student-dni">{alumno.dni}</strong>
                        </Text>
                      </Space>

                      <div className="student-card-actions">
                        <Button type="text" size="small" icon={<EditOutlined style={{ color: '#0284c7' }} />} onClick={() => handleOpenModal(alumno)}>
                          Editar
                        </Button>
                        <Popconfirm title="¿Eliminar alumno?" onConfirm={() => handleDelete(alumno.id)} okText="Sí" cancelText="No">
                          <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                            Eliminar
                          </Button>
                        </Popconfirm>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      )}

      {/* Modal for Creating / Editing Student */}
      <AlumnoFormModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialValues={editingAlumno}
      />
    </div>
  );
};

