import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Select,
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
  EyeOutlined,
  BookOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { alumnoService } from '../services/alumno.service';
import type { Alumno } from '../models/alumno.model';
import { AlumnoFormModal, type AlumnoFormValues } from './AlumnoFormModal';
import { AlumnoDetailModal } from './AlumnoDetailModal';
import { useAppStore } from '../../../store/appStore';
import {
  getGradeColorConfig,
  compareGrados,
  extractGradeNumber,
  GRADE_PALETTE,
  ALL_GRADES,
  type GradeNumber,
} from '../utils/gradeColors';

const { Title, Text } = Typography;

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

  // Filtro rápido por Grado (Todos, 1°, 2°, 3°, 4°, 5°, 6°, 7°)
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<GradeNumber | 'all'>('all');

  // Modal para Crear / Editar Alumno
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);

  // Modal para Ficha Completa del Alumno
  const [selectedDetailAlumno, setSelectedDetailAlumno] = useState<Alumno | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(inputValue);
      setCurrentPage(1);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  const fetchAlumnos = useCallback(async () => {
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
  }, [currentPage, searchTerm, message]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const data = await alumnoService.getList(currentPage, 50, searchTerm);
        if (!isMounted) return;
        setAlumnos(data.items);
        setTotalItems(data.totalItems);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error al cargar alumnos:', error);
        message.error('Error al cargar la lista de alumnos');
      } finally {
        if (isMounted) setLoading(false);
      }

      await alumnoService.subscribeToRealtime((action, alumno) => {
        if (!isMounted) return;
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
    };

    void init();

    return () => {
      isMounted = false;
      alumnoService.unsubscribeRealtime();
    };
  }, [currentPage, searchTerm, message]);



  // Lista filtrada según el grado seleccionado en el paneo visual
  const displayedAlumnos = useMemo(() => {
    if (selectedGradeFilter === 'all') return alumnos;
    return alumnos.filter((a) => extractGradeNumber(a.cursoNombre) === selectedGradeFilter);
  }, [alumnos, selectedGradeFilter]);

  const handleOpenModal = (alumno?: Alumno) => {
    setEditingAlumno(alumno || null);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingAlumno(null);
  };

  const handleOpenDetail = (alumno: Alumno) => {
    setSelectedDetailAlumno(alumno);
    setIsDetailModalVisible(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalVisible(false);
    setSelectedDetailAlumno(null);
  };

  const handleSubmit = async (values: AlumnoFormValues, originalUpdatedDate?: string) => {
    try {
      const alumnoData = {
        numero_legajo: values.numeroLegajo || '',
        dni: values.dni,
        apellidos: values.apellidos,
        nombres: values.nombres,
        fecha_nacimiento: values.fechaNacimiento ? values.fechaNacimiento.format('YYYY-MM-DD') : '',
        nacionalidad: values.nacionalidad || '',
        sexo: values.sexo || '',
        telefono: values.telefono || '',
        domicilio: values.domicilio || '',
        usuario_acadeu: values.usuarioAcadeu || '',
        clave_acadeu: values.claveAcadeu || '',
      };

      if (editingAlumno) {
        if (!originalUpdatedDate) throw new Error('Falta la fecha de actualización original');
        await alumnoService.update(editingAlumno.id, alumnoData, originalUpdatedDate);
        message.success('Ficha del alumno actualizada con éxito');
      } else {
        const responsableData = values.responsableDni
          ? {
              id: values.responsableId,
              dni: values.responsableDni || '',
              apellidos: values.responsableApellidos || '',
              nombres: values.responsableNombres || '',
              nacionalidad: values.responsableNacionalidad || '',
              profesion: values.responsableProfesion || '',
              telefono: values.responsableTelefono || '',
              email: values.responsableEmail || '',
            }
          : undefined;

        const inscripcionData =
          values.cursoId && values.cicloId
            ? {
                curso_id: values.cursoId,
                ciclo_id: values.cicloId,
                numero_orden: values.numeroOrden,
                numero_inscripcion: values.numeroInscripcion || '',
                fecha_inscripcion: values.fechaInscripcion ? values.fechaInscripcion.format('YYYY-MM-DD') : '',
                fecha_ingreso: values.fechaIngreso ? values.fechaIngreso.format('YYYY-MM-DD') : '',
                fecha_egreso: values.fechaEgreso ? values.fechaEgreso.format('YYYY-MM-DD') : '',
                estado: values.estadoInscripcion || 'Regular',
              }
            : undefined;

        const vinculo = values.vinculo || 'Tutor/a';

        await alumnoService.createIntegral({
          alumno: alumnoData,
          inscripcion: inscripcionData,
          responsable: responsableData,
          vinculo,
        });

        message.success('Alumno registrado, inscrito y vinculado exitosamente');
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

  // Columnas de la tabla: ESTUDIANTE, Grado, Legajo, DNI y Acciones
  const columns: ColumnsType<Alumno> = [
    {
      title: 'ESTUDIANTE',
      key: 'estudiante',
      render: (_, record) => {
        const initials = `${record.apellidos.charAt(0)}${record.nombres.charAt(0)}`.toUpperCase();
        return (
          <Space size="middle" style={{ cursor: 'pointer' }}>
            <Avatar
              size={40}
              className="student-avatar"
              style={{ background: getAvatarGradient(record.apellidos + record.nombres) }}
            >
              {initials}
            </Avatar>
            <div>
              <span className="student-name" style={{ color: '#1e40af', fontWeight: 600 }}>
                {record.apellidos}, {record.nombres}
              </span>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {record.nacionalidad ? `${record.nacionalidad}` : 'Estudiante'}
                {record.sexo ? ` • ${record.sexo}` : ''}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Grado',
      key: 'grado',
      width: 155,
      sorter: (a, b) => compareGrados(a.cursoNombre, b.cursoNombre),
      filters: ALL_GRADES.map((num) => ({
        text: GRADE_PALETTE[num].label,
        value: num,
      })),
      onFilter: (value, record) => extractGradeNumber(record.cursoNombre) === value,
      render: (_, record) => {
        const config = getGradeColorConfig(record.cursoNombre);
        if (!record.cursoNombre) {
          return (
            <Tag
              style={{
                borderRadius: 6,
                fontSize: 12,
                color: '#94a3b8',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
              }}
            >
              Sin Grado
            </Tag>
          );
        }
        return (
          <Tag
            style={{
              borderRadius: 8,
              padding: '3px 10px',
              fontWeight: 700,
              fontSize: 12,
              color: config.textColor,
              background: config.bgColor,
              border: `1px solid ${config.borderColor}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: config.textColor,
                display: 'inline-block',
                boxShadow: `0 0 0 2px ${config.bgColor}`,
              }}
            />
            <span>{record.cursoNombre}</span>
          </Tag>
        );
      },
    },
    {
      title: 'Legajo',
      dataIndex: 'numeroLegajo',
      key: 'numeroLegajo',
      width: 130,
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
          {legajo || 'S/L'}
        </Tag>
      ),
    },
    {
      title: 'DNI',
      dataIndex: 'dni',
      key: 'dni',
      width: 150,
      render: (dni) => (
        <Text copyable={{ text: dni, tooltips: ['Copiar DNI', 'Copiaste el DNI'] }} className="student-dni" style={{ fontWeight: 500 }}>
          {dni}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 130,
      align: 'right',
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Ver ficha completa">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#2563eb' }} />}
              onClick={() => handleOpenDetail(record)}
              aria-label="Ver ficha del alumno"
            />
          </Tooltip>
          <Tooltip title="Editar ficha">
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
                  Distribución por Grados
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Badge status="processing" color="#4f46e5" />
                  <Text strong style={{ fontSize: 18, fontFamily: 'var(--font-heading)' }}>
                    7 Grados Primarios
                  </Text>
                </div>
              </div>
              <div className="kpi-icon-wrapper kpi-sync">
                <BookOutlined />
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
        <span className="page-subtitle">
          Consultá y ordená alumnos por su grado correspondiente o hacé click para ver su ficha completa.
        </span>
      </div>

      {/* Toolbar & Filters */}
      <div className="toolbar">
        <Space size="middle" wrap>
          <Input.Search
            placeholder="Buscar por nombre, apellido, DNI, legajo..."
            allowClear
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{ width: 300 }}
            prefix={<SearchOutlined style={{ color: '#2563eb' }} />}
            className="toolbar-search"
          />
          <Select
            value={selectedGradeFilter}
            onChange={(val) => setSelectedGradeFilter(val)}
            style={{ width: 180 }}
            placeholder="Filtrar por grado"
            options={[
              { value: 'all', label: 'Todos los grados' },
              ...ALL_GRADES.map((num) => {
                const config = GRADE_PALETTE[num];
                return {
                  value: num,
                  label: (
                    <Space size={6} align="center">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: config.textColor,
                          display: 'inline-block',
                        }}
                      />
                      <span>{config.label}</span>
                    </Space>
                  ),
                };
              }),
            ]}
          />
          <Tooltip title="Actualizar lista">
            <Button icon={<ReloadOutlined />} onClick={fetchAlumnos} loading={loading} />
          </Tooltip>
          {searchTerm && (
            <Tag closable onClose={() => setInputValue('')} color="blue" style={{ borderRadius: 6, padding: '4px 8px' }}>
              Búsqueda: "{searchTerm}"
            </Tag>
          )}
          {selectedGradeFilter !== 'all' && (
            <Tag closable onClose={() => setSelectedGradeFilter('all')} color="orange" style={{ borderRadius: 6, padding: '4px 8px' }}>
              Grado: {GRADE_PALETTE[selectedGradeFilter as GradeNumber]?.label}
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

      {/* Selected rows banner */}
      {selectedRowKeys.length > 0 && (
        <Card style={{ marginBottom: 16, background: '#eff6ff', borderColor: '#bfdbfe', borderRadius: 12 }} bodyStyle={{ padding: '10px 16px' }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Space size={8}>
              <Badge count={selectedRowKeys.length} style={{ backgroundColor: '#2563eb', fontWeight: 700 }} />
              <Text strong style={{ color: '#1e40af' }}>
                {selectedRowKeys.length === 1 ? 'alumno seleccionado' : 'alumnos seleccionados'}
              </Text>
            </Space>
            <Button size="small" type="link" onClick={() => setSelectedRowKeys([])} style={{ fontWeight: 600 }}>
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
            dataSource={displayedAlumnos}
            rowKey="id"
            loading={loading}
            scroll={{ x: 750 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            onRow={(record) => ({
              onClick: () => handleOpenDetail(record),
              style: { cursor: 'pointer' },
            })}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    selectedGradeFilter !== 'all'
                      ? `No hay alumnos registrados en ${GRADE_PALETTE[selectedGradeFilter].label}`
                      : searchTerm
                      ? `No se encontraron alumnos para "${searchTerm}"`
                      : 'No hay alumnos registrados aún'
                  }
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
              total: selectedGradeFilter === 'all' ? totalItems : displayedAlumnos.length,
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
          {displayedAlumnos.length === 0 && !loading ? (
            <Card className="students-card">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  selectedGradeFilter !== 'all'
                    ? `No hay alumnos registrados en ${GRADE_PALETTE[selectedGradeFilter].label}`
                    : searchTerm
                    ? `No se encontraron alumnos para "${searchTerm}"`
                    : 'No hay alumnos registrados aún'
                }
              />
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {displayedAlumnos.map((alumno) => {
                const initials = `${alumno.apellidos.charAt(0)}${alumno.nombres.charAt(0)}`.toUpperCase();
                const gradeConfig = getGradeColorConfig(alumno.cursoNombre);

                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={alumno.id}>
                    <Card
                      className="student-grid-card"
                      bodyStyle={{ padding: 20 }}
                      hoverable
                      onClick={() => handleOpenDetail(alumno)}
                      style={{ cursor: 'pointer' }}
                    >
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          {/* Tag de Grado con color temático */}
                          {alumno.cursoNombre ? (
                            <Tag
                              style={{
                                borderRadius: 8,
                                padding: '2px 8px',
                                fontWeight: 700,
                                fontSize: 12,
                                color: gradeConfig.textColor,
                                background: gradeConfig.bgColor,
                                border: `1px solid ${gradeConfig.borderColor}`,
                                margin: 0,
                              }}
                            >
                              {alumno.cursoNombre}
                            </Tag>
                          ) : (
                            <Tag style={{ borderRadius: 6, fontSize: 11, margin: 0, color: '#94a3b8' }}>
                              Sin Grado
                            </Tag>
                          )}
                          <Tag className="student-legajo-tag" style={{ margin: 0 }}>
                            {alumno.numeroLegajo ? `Leg. ${alumno.numeroLegajo}` : 'S/L'}
                          </Tag>
                        </div>
                      </div>

                      <Title level={5} style={{ margin: '0 0 4px 0', fontSize: 15, color: '#1e40af' }}>
                        {alumno.apellidos}, {alumno.nombres}
                      </Title>

                      <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          DNI: <strong className="student-dni">{alumno.dni}</strong>
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {alumno.nacionalidad || 'Estudiante'} {alumno.sexo ? `• ${alumno.sexo}` : ''}
                        </Text>
                      </Space>

                      <div className="student-card-actions" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="default"
                          icon={<EyeOutlined style={{ color: '#2563eb' }} />}
                          onClick={() => handleOpenDetail(alumno)}
                          style={{ width: '100%', borderRadius: 8, fontWeight: 600, color: '#2563eb' }}
                        >
                          Ver Ficha Completa
                        </Button>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      )}

      {/* Modal para Crear / Editar Alumno */}
      <AlumnoFormModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialValues={editingAlumno}
      />

      {/* Modal para Ficha Completa del Alumno */}
      <AlumnoDetailModal
        visible={isDetailModalVisible}
        alumno={selectedDetailAlumno}
        onClose={handleCloseDetail}
        onEdit={(alumnoToEdit) => handleOpenModal(alumnoToEdit)}
        onDelete={handleDelete}
      />
    </div>
  );
};
