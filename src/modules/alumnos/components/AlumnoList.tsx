import { AlumnoFilters } from './AlumnoFilters';
import ui from '../../../shared/styles/ui.module.css';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import React, { useEffect, useState, useCallback } from 'react';
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
  Pagination,
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { alumnoService, type AlumnoCounts } from '../services/alumno.service';
import type { Alumno } from '../models/alumno.model';
import { AlumnoFormModal, type AlumnoFormValues } from './AlumnoFormModal';
import { AlumnoDetailModal } from './AlumnoDetailModal';
import { DarDeBajaModal } from './DarDeBajaModal';
import type { EstadoInscripcion } from '../../inscripciones/models/inscripcion.model';
import {
  getGradeColorConfig,
  compareGrados,
  GRADE_PALETTE,
  type GradeNumber,
} from '../utils/gradeColors';
import { getAvatarGradient } from '../../../theme';

const { Title, Text } = Typography;

export const AlumnoList: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedStudent = searchParams.get('alumno');
  const linkedEnrollment = searchParams.get('inscripcion');
  const linkedSection = searchParams.get('seccion');
  const returnCourse = searchParams.get('curso');
  const returnPeriod = searchParams.get('periodo');
  const returnToBulletin = returnCourse && returnPeriod && linkedEnrollment
    ? `/app/boletines/calificaciones?${new URLSearchParams({ curso: returnCourse, periodo: returnPeriod, inscripcion: linkedEnrollment })}`
    : null;
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [counts, setCounts] = useState<AlumnoCounts>({ regulares: 0, bajas: 0, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [selectedGradeFilter, setSelectedGradeFilter] = useState<GradeNumber | 'all'>('all');
  const [estadoFilter, setEstadoFilter] = useState<'REGULARES' | 'BAJAS' | 'TODOS'>('REGULARES');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);

  const [selectedDetailAlumno, setSelectedDetailAlumno] = useState<Alumno | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

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

  const handleGradeChange = (val: GradeNumber | 'all') => {
    setSelectedGradeFilter(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: 'REGULARES' | 'BAJAS' | 'TODOS') => {
    setEstadoFilter(val);
    setCurrentPage(1);
  };

  const fetchAlumnos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await alumnoService.getList(currentPage, 50, {
        searchTerm,
        grade: selectedGradeFilter,
        status: estadoFilter,
      });
      setAlumnos(data.items);
      setTotalItems(data.totalItems);
      setCounts(data.counts);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      message.error('Error al cargar la lista de alumnos');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedGradeFilter, estadoFilter, message]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await alumnoService.getList(currentPage, 50, {
          searchTerm,
          grade: selectedGradeFilter,
          status: estadoFilter,
        });
        if (!isMounted) return;
        setAlumnos(data.items);
        setTotalItems(data.totalItems);
        setCounts(data.counts);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error al cargar alumnos:', error);
        message.error('Error al cargar la lista de alumnos');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadData();

    void alumnoService.subscribeToRealtime(() => {
      if (!isMounted) return;
      void loadData();
    });

    return () => {
      isMounted = false;
      void alumnoService.unsubscribeRealtime();
    };
  }, [currentPage, searchTerm, selectedGradeFilter, estadoFilter, message]);

  const displayedAlumnos = alumnos;

  const [editingInitialTab, setEditingInitialTab] = useState<string>('alumno');

  useEffect(() => {
    if (!linkedStudent || !linkedEnrollment) return;
    let active = true;
    void alumnoService.getForEnrollment(linkedStudent, linkedEnrollment).then(alumno => {
      if (!active) return;
      if (linkedSection === 'vinculos') {
        setSelectedDetailAlumno(alumno);
        setIsDetailModalVisible(true);
      } else {
        setEditingAlumno(alumno);
        setEditingInitialTab(linkedSection === 'responsable' ? 'responsable' : 'alumno');
        setIsModalVisible(true);
      }
    }).catch(() => { if (active) message.error('No se pudo abrir la ficha solicitada. Volvé al boletín y actualizá los datos.'); });
    return () => { active = false; };
  }, [linkedStudent, linkedEnrollment, linkedSection, message]);

  const handleOpenModal = (alumno?: Alumno, initialTab: string = 'alumno') => {
    setEditingAlumno(alumno || null);
    setEditingInitialTab(initialTab);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingAlumno(null);
    if (returnToBulletin) navigate(returnToBulletin);
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
        numero_legajo: values.numeroLegajo !== undefined ? values.numeroLegajo.trim() : (editingAlumno?.numeroLegajo || ''),
        dni: (values.dni !== undefined ? values.dni : (editingAlumno?.dni || '')).trim(),
        apellidos: (values.apellidos !== undefined ? values.apellidos : (editingAlumno?.apellidos || '')).trim(),
        nombres: (values.nombres !== undefined ? values.nombres : (editingAlumno?.nombres || '')).trim(),
        fecha_nacimiento: values.fechaNacimiento !== undefined
          ? (values.fechaNacimiento ? values.fechaNacimiento.format('YYYY-MM-DD') : '')
          : (editingAlumno?.fechaNacimiento || ''),
        nacionalidad: (values.nacionalidad !== undefined ? values.nacionalidad : (editingAlumno?.nacionalidad || '')).trim(),
        sexo: (values.sexo !== undefined ? values.sexo : (editingAlumno?.sexo || '')).trim(),
        domicilio: (values.domicilio !== undefined ? values.domicilio : (editingAlumno?.domicilio || '')).trim(),
        localidad: (values.localidad !== undefined ? values.localidad : (editingAlumno?.localidad || '')).trim(),
        usuario_acadeu: (values.usuarioAcadeu !== undefined ? values.usuarioAcadeu : (editingAlumno?.usuarioAcadeu || '')).trim(),
        clave_acadeu: (values.claveAcadeu !== undefined ? values.claveAcadeu : (editingAlumno?.claveAcadeu || '')).trim(),
      };

      const respNum = (values.responsableDniNumero || values.responsableDni || '').trim();
      const responsableData = respNum
        ? {
            id: values.responsableId,
            dni_tipo: (values.responsableDniTipo || 'DNI').trim(),
            dni_numero: respNum,
            dni: respNum,
            apellidos: (values.responsableApellidos || '').trim(),
            nombres: (values.responsableNombres || '').trim(),
            nacionalidad: (values.responsableNacionalidad || '').trim(),
            profesion: (values.responsableProfesion || '').trim(),
            telefono: (values.responsableTelefono || '').trim(),
            email: (values.responsableEmail || '').trim(),
          }
        : undefined;

      const vinculo = values.vinculo || 'Padre';

      if (editingAlumno) {
        if (!originalUpdatedDate) throw new Error('Falta la fecha de actualización original');
        const editInscripcionData =
          values.cursoId || values.estadoInscripcion || editingAlumno.inscripcionId
            ? {
                id: editingAlumno.inscripcionId,
                curso_id: values.cursoId !== undefined ? values.cursoId : editingAlumno.cursoId,
                ciclo_id: values.cicloId !== undefined ? values.cicloId : editingAlumno.cicloId,
                numero_orden: (values.numeroOrden !== undefined ? values.numeroOrden : editingAlumno.numeroOrden) ?? undefined,
                numero_inscripcion: (values.numeroInscripcion !== undefined ? values.numeroInscripcion : (editingAlumno.numeroInscripcion || '')).trim(),
                fecha_inscripcion: values.fechaInscripcion ? values.fechaInscripcion.format('YYYY-MM-DD') : '',
                fecha_ingreso: values.fechaIngreso !== undefined
                  ? (values.fechaIngreso ? values.fechaIngreso.format('YYYY-MM-DD') : '')
                  : (editingAlumno.fechaIngreso || ''),
                fecha_egreso: values.fechaEgreso !== undefined
                  ? (values.fechaEgreso ? values.fechaEgreso.format('YYYY-MM-DD') : '')
                  : (editingAlumno.fechaEgreso || ''),
                estado: (values.estadoInscripcion || editingAlumno.estadoInscripcion || 'Regular') as EstadoInscripcion,
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

        const vinculo = values.vinculo || 'Padre';

        await alumnoService.createIntegral({
          alumno: alumnoData,
          inscripcion: createInscripcionData,
          responsable: responsableData,
          vinculo,
        });

        message.success('Alumno registrado, inscrito y vinculado exitosamente');
        void fetchAlumnos();
      }
    } catch (error: unknown) {
      console.error('Error al guardar alumno:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error al guardar los datos del alumno';
      message.error(errorMsg);
      throw error;
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
                {record.cursadaEstado === 'PENDIENTE' && (
                  <Tag color="warning" className={ui.statusTag}>
                    Cursada por confirmar
                  </Tag>
                )}
                {record.cursadaEstado === 'CONFIRMADA' && ((record.bimestreDesde !== undefined && record.bimestreDesde > 1) || (record.bimestreHasta !== undefined && record.bimestreHasta < 4)) && (
                  <Tag color="cyan" className={ui.statusTag}>
                    B{record.bimestreDesde}–B{record.bimestreHasta}
                  </Tag>
                )}
                {record.cursadaEstado === 'SIN_CURSADA' && (
                  <Tag color="default" className={ui.statusTag}>
                    Sin cursada
                  </Tag>
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
        dni ? (
          <Text copyable={{ text: dni, tooltips: ['Copiar DNI', 'Copiaste el DNI'] }} className="student-dni" style={{ fontWeight: 500 }}>
            {dni}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontStyle: 'italic' }}>Sin DNI</Text>
        )
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
    <SectionLayout
      title="Directorio de alumnos"
      icon={<TeamOutlined />}
      actions={
        <Space size="middle" wrap>
          {returnToBulletin && <Button onClick={() => navigate(returnToBulletin)}>Volver al boletín</Button>}
          { }
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as 'table' | 'grid')}
            options={[
              { label: 'Tabla', value: 'table', icon: <UnorderedListOutlined /> },
              { label: 'Tarjetas', value: 'grid', icon: <AppstoreOutlined /> },
            ]}
            style={{ fontWeight: 500 }}
          />

          { }
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Nuevo alumno
          </Button>
        </Space>
      }
    >

      <AlumnoFilters
        counts={counts}
        status={estadoFilter}
        onStatusChange={handleStatusChange}
        query={inputValue}
        appliedQuery={searchTerm}
        onQueryChange={setInputValue}
        grade={selectedGradeFilter}
        onGradeChange={handleGradeChange}
        loading={loading}
        onRefresh={fetchAlumnos}
      />

      { }
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

      { }
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
                          { }
                          {isBaja && (
                            <Tag color="error" className={ui.statusTag}>
                              Baja {alumno.fechaEgreso ? `• ${dayjs(alumno.fechaEgreso).format('DD/MM/YY')}` : ''}
                            </Tag>
                          )}
                          {alumno.cursadaEstado === 'PENDIENTE' && (
                            <Tag color="warning" className={ui.statusTag}>
                              Cursada por confirmar
                            </Tag>
                          )}
                          {alumno.cursadaEstado === 'CONFIRMADA' && ((alumno.bimestreDesde !== undefined && alumno.bimestreDesde > 1) || (alumno.bimestreHasta !== undefined && alumno.bimestreHasta < 4)) && (
                            <Tag color="cyan" className={ui.statusTag}>
                              B{alumno.bimestreDesde}–B{alumno.bimestreHasta}
                            </Tag>
                          )}
                          {alumno.cursadaEstado === 'SIN_CURSADA' && (
                            <Tag color="default" className={ui.statusTag}>
                              Sin cursada
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
                          DNI: <strong className="student-dni">{alumno.dni || 'Sin DNI'}</strong>
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
          {totalItems > 50 && (
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <Pagination
                current={currentPage}
                pageSize={50}
                total={totalItems}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
                showTotal={(total) => (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Total: <strong>{total}</strong> registros
                  </Text>
                )}
              />
            </div>
          )}
        </div>
      )}

      { }
      <AlumnoFormModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialValues={editingAlumno}
        initialTab={editingInitialTab}
      />

      { }
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

      { }
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
    </SectionLayout>
  );
};
