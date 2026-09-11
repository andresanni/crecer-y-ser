import { AlumnoFilters } from './AlumnoFilters';
import ui from '../../../shared/styles/ui.module.css';
import { PageHeader } from '../../../shared/components/PageHeader';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table,
  Typography,
  Button,
  Space,
  App,
  Popconfirm,
  Card,
  Tag,
  Row,
  Col,
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
  IdcardOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  EyeOutlined,
  TeamOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { alumnoService } from '../services/alumno.service';
import type { Alumno } from '../models/alumno.model';
import { AlumnoFormModal, type AlumnoFormValues } from './AlumnoFormModal';
import { AlumnoDetailModal } from './AlumnoDetailModal';
import { DarDeBajaModal } from './DarDeBajaModal';
import {
  getGradeColorConfig,
  compareGrados,
  extractGradeNumber,
  GRADE_PALETTE,
  ALL_GRADES,
  type GradeNumber,
} from '../utils/gradeColors';
import { getAvatarGradient } from '../../../theme';

const { Title, Text } = Typography;

export const AlumnoList: React.FC = () => {
  const { message } = App.useApp();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Filtro por Grado y Filtro por Estado de Cursada
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<GradeNumber | 'all'>('all');
  const [estadoFilter, setEstadoFilter] = useState<'REGULARES' | 'BAJAS' | 'TODOS'>('REGULARES');

  // Modal para Crear / Editar Alumno
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);

  // Modal para Ficha Completa del Alumno
  const [selectedDetailAlumno, setSelectedDetailAlumno] = useState<Alumno | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // Modal para Acción Rápida de Baja
  const [bajaModalAlumno, setBajaModalAlumno] = useState<Alumno | null>(null);
  const [isBajaModalVisible, setIsBajaModalVisible] = useState(false);

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



  // Conteos para el segmented de estados
  const counts = useMemo(() => {
    const bajas = alumnos.filter((a) => a.estadoInscripcion === 'Baja').length;
    const regulares = alumnos.length - bajas;
    return { regulares, bajas, total: alumnos.length };
  }, [alumnos]);

  // Lista filtrada según el grado seleccionado y el estado de cursada
  const displayedAlumnos = useMemo(() => {
    return alumnos.filter((a) => {
      // 1. Filtro por Grado
      if (selectedGradeFilter !== 'all') {
        if (extractGradeNumber(a.cursoNombre) !== selectedGradeFilter) return false;
      }
      // 2. Filtro por Estado de Cursada
      const isBaja = a.estadoInscripcion === 'Baja';
      if (estadoFilter === 'REGULARES') return !isBaja;
      if (estadoFilter === 'BAJAS') return isBaja;
      return true;
    });
  }, [alumnos, selectedGradeFilter, estadoFilter]);

  const [editingInitialTab, setEditingInitialTab] = useState<string>('alumno');

  const handleOpenModal = (alumno?: Alumno, initialTab: string = 'alumno') => {
    setEditingAlumno(alumno || null);
    setEditingInitialTab(initialTab);
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

      const vinculo = values.vinculo || 'Tutor/a';

      if (editingAlumno) {
        if (!originalUpdatedDate) throw new Error('Falta la fecha de actualización original');
        const editInscripcionData =
          values.cursoId || values.estadoInscripcion
            ? {
                id: editingAlumno.inscripcionId,
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

        await alumnoService.updateIntegral(
          editingAlumno.id,
          {
            alumno: alumnoData,
            inscripcion: editInscripcionData,
            responsable: responsableData,
            vinculo,
          },
          originalUpdatedDate
        );
        message.success('Ficha del alumno actualizada con éxito');
        void fetchAlumnos();
      } else {
        const createInscripcionData =
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
          inscripcion: createInscripcionData,
          responsable: responsableData,
          vinculo,
        });

        message.success('Alumno registrado, inscrito y vinculado exitosamente');
        void fetchAlumnos();
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
        const isBaja = record.estadoInscripcion === 'Baja';

        return (
          <Space size="middle" style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(record)}>
            <Avatar
              size={40}
              className="student-avatar"
              style={{
                background: isBaja
                  ? 'linear-gradient(135deg, #ef4444, #991b1b)'
                  : getAvatarGradient(record.apellidos + record.nombres),
              }}
            >
              {initials}
            </Avatar>
            <div>
              <div className={ui.wrappingRow}>
                <span className="student-name" style={{ color: isBaja ? "var(--cys-color-error-text)" : "var(--cys-color-primary-text)", fontWeight: 600 }}>
                  {record.apellidos}, {record.nombres}
                </span>
                {isBaja && (
                  <Tooltip
                    title={`Baja registrada: ${
                      record.fechaEgreso ? dayjs(record.fechaEgreso).format('DD/MM/YYYY') : 'Sin fecha especificada'
                    }`}
                  >
                    <Tag color="error" className={ui.statusTag}>
                      Baja {record.fechaEgreso ? `(${dayjs(record.fechaEgreso).format('DD/MM/YY')})` : ''}
                    </Tag>
                  </Tooltip>
                )}
              </div>
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
                color: 'var(--cys-color-text-secondary)',
                background: "var(--cys-color-fill-tertiary)",
                border: "1px solid var(--cys-color-border-secondary)",
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
            color: "var(--cys-color-success-text)",
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
      width: 150,
      align: 'right',
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Ver ficha completa">
            <Button
              type="text"
              icon={<EyeOutlined className={ui.primary} />}
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
          {record.estadoInscripcion !== 'Baja' ? (
            <Tooltip title="Dar de baja al estudiante">
              <Button
                type="text"
                danger
                icon={<UserDeleteOutlined style={{ color: 'var(--cys-color-error-text)' }} />}
                onClick={() => {
                  setBajaModalAlumno(record);
                  setIsBajaModalVisible(true);
                }}
                aria-label="Dar de baja al alumno"
              />
            </Tooltip>
          ) : (
            <Tooltip title={`Baja registrada: ${record.fechaEgreso ? dayjs(record.fechaEgreso).format('DD/MM/YYYY') : 'Sin fecha'}`}>
              <Tag color="error" style={{ margin: 0, fontSize: 11, cursor: 'default', fontWeight: 600 }}>
                Baja
              </Tag>
            </Tooltip>
          )}
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
    <div className={ui.page}>
      {/* 1. Header & Primary Actions */}
      <PageHeader
        title="Directorio de alumnos"
        description="Consultá la matrícula, encontrá un alumno y accedé a su ficha."
        icon={<TeamOutlined />}
        actions={
        <Space size="middle" wrap>
          {/* Toggle Vista Tabla / Tarjetas */}
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as 'table' | 'grid')}
            options={[
              { label: 'Tabla', value: 'table', icon: <UnorderedListOutlined /> },
              { label: 'Tarjetas', value: 'grid', icon: <AppstoreOutlined /> },
            ]}
            style={{ fontWeight: 500 }}
          />

          {/* Botón Nuevo Alumno */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Nuevo alumno
          </Button>
        </Space>
        }
      />

      <AlumnoFilters
        counts={counts}
        status={estadoFilter}
        onStatusChange={setEstadoFilter}
        query={inputValue}
        appliedQuery={searchTerm}
        onQueryChange={setInputValue}
        grade={selectedGradeFilter}
        onGradeChange={setSelectedGradeFilter}
        loading={loading}
        onRefresh={fetchAlumnos}
      />

      {/* Selected rows banner */}
      {selectedRowKeys.length > 0 && (
        <Card style={{ marginBottom: 16, background: "var(--cys-color-primary-bg)", borderColor: "var(--cys-color-primary-border)", borderRadius: 12 }} styles={{ body: { padding: '10px 16px' } }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Space size={8}>
              <Badge count={selectedRowKeys.length} style={{ backgroundColor: '#2563eb', fontWeight: 700 }} />
              <Text strong style={{ color: 'var(--cys-color-primary-text)' }}>
                {selectedRowKeys.length === 1 ? 'alumno seleccionado' : 'alumnos seleccionados'}
              </Text>
            </Space>
            <Button size="small" type="link" onClick={() => setSelectedRowKeys([])} className={ui.strong}>
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
                    estadoFilter === 'BAJAS'
                      ? 'No hay alumnos dados de baja en este ciclo'
                      : selectedGradeFilter !== 'all'
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
              total: selectedGradeFilter === 'all' && estadoFilter === 'TODOS' ? totalItems : displayedAlumnos.length,
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
                  estadoFilter === 'BAJAS'
                    ? 'No hay alumnos dados de baja en este ciclo'
                    : selectedGradeFilter !== 'all'
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
                const isBaja = alumno.estadoInscripcion === 'Baja';

                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={alumno.id}>
                    <Card
                      className="student-grid-card"
                      styles={{ body: { padding: 20, display: 'flex', flexDirection: 'column', height: '100%' } }}
                      hoverable
                      onClick={() => handleOpenDetail(alumno)}
                      style={{
                        cursor: 'pointer',
                        borderTop: isBaja ? '3px solid #ef4444' : undefined,
                        height: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <Avatar
                          size={46}
                          style={{
                            background: isBaja
                              ? 'linear-gradient(135deg, #ef4444, #991b1b)'
                              : getAvatarGradient(alumno.apellidos + alumno.nombres),
                            fontWeight: 700,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                          }}
                        >
                          {initials}
                        </Avatar>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          {/* Tag de Baja o Grado */}
                          {isBaja && (
                            <Tag color="error" className={ui.statusTag}>
                              Baja {alumno.fechaEgreso ? `• ${dayjs(alumno.fechaEgreso).format('DD/MM/YY')}` : ''}
                            </Tag>
                          )}
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
                            <Tag style={{ borderRadius: 6, fontSize: 11, margin: 0, color: 'var(--cys-color-text-secondary)' }}>
                              Sin Grado
                            </Tag>
                          )}
                          <Tag className="student-legajo-tag" style={{ margin: 0 }}>
                            {alumno.numeroLegajo ? `Leg. ${alumno.numeroLegajo}` : 'S/L'}
                          </Tag>
                        </div>
                      </div>

                      <Title
                        level={5}
                        style={{
                          margin: '0 0 6px 0',
                          fontSize: 15,
                          lineHeight: '21px',
                          height: '42px',
                          color: isBaja ? "var(--cys-color-error-text)" : "var(--cys-color-primary-text)",
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                        title={`${alumno.apellidos}, ${alumno.nombres}`}
                      >
                        {alumno.apellidos}, {alumno.nombres}
                      </Title>

                      <Space orientation="vertical" size={4} style={{ width: '100%', marginBottom: 16 }}>
                        <Text type="secondary" className={ui.caption}>
                          DNI: <strong className="student-dni">{alumno.dni}</strong>
                        </Text>
                        <Text type="secondary" className={ui.caption}>
                          {alumno.nacionalidad || 'Estudiante'} {alumno.sexo ? `• ${alumno.sexo}` : ''}
                        </Text>
                      </Space>

                      <div className="student-card-actions" style={{ marginTop: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <Space className={ui.fullWidth}>
                          <Button
                            type="default"
                            icon={<EyeOutlined className={ui.primary} />}
                            onClick={() => handleOpenDetail(alumno)}
                            style={{ flex: 1, borderRadius: 8, fontWeight: 600, color: 'var(--cys-color-primary-text)' }}
                          >
                            Ver Ficha
                          </Button>
                          {!isBaja && (
                            <Tooltip title="Dar de baja">
                              <Button
                                danger
                                icon={<UserDeleteOutlined />}
                                onClick={() => {
                                  setBajaModalAlumno(alumno);
                                  setIsBajaModalVisible(true);
                                }}
                                style={{ borderRadius: 8 }}
                              />
                            </Tooltip>
                          )}
                        </Space>
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
        initialTab={editingInitialTab}
      />

      {/* Modal para Ficha Completa del Alumno */}
      <AlumnoDetailModal
        visible={isDetailModalVisible}
        alumno={selectedDetailAlumno}
        onClose={handleCloseDetail}
        onEdit={(alumnoToEdit, targetTab) => handleOpenModal(alumnoToEdit, targetTab)}
        onDelete={handleDelete}
        onBaja={(alumnoToBaja) => {
          setBajaModalAlumno(alumnoToBaja);
          setIsBajaModalVisible(true);
        }}
      />

      {/* Modal de Acción Rápida para Dar de Baja */}
      <DarDeBajaModal
        visible={isBajaModalVisible}
        alumno={bajaModalAlumno}
        onClose={() => {
          setIsBajaModalVisible(false);
          setBajaModalAlumno(null);
        }}
        onSuccess={() => {
          void fetchAlumnos();
          if (selectedDetailAlumno && bajaModalAlumno && selectedDetailAlumno.id === bajaModalAlumno.id) {
            handleCloseDetail();
          }
        }}
      />
    </div>
  );
};
