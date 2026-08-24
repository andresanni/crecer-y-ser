import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Button,
  Row,
  Col,
  Tooltip,
  Typography,
  Select,
  Alert,
  Space,
  Tag,
  Tabs,
  InputNumber,
  Spin,
} from 'antd';
import {
  IdcardOutlined,
  UserOutlined,
  CalendarOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  SearchOutlined,
  PhoneOutlined,
  MailOutlined,
  ReloadOutlined,
  BookOutlined,
  HomeOutlined,
  LockOutlined,
  GlobalOutlined,
  SolutionOutlined,
  RightOutlined,
  LeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Alumno } from '../models/alumno.model';
import { responsableService } from '../../responsables/services/responsable.service';
import type { Responsable } from '../../responsables/models/responsable.model';
import { inscripcionService } from '../../inscripciones/services/inscripcion.service';
import type { Curso, CicloLectivo, EstadoInscripcion } from '../../inscripciones/models/inscripcion.model';

const { Text } = Typography;

export interface AlumnoFormValues {
  // Pestaña 1: Datos del Alumno
  numeroLegajo?: string;
  dni: string;
  apellidos: string;
  nombres: string;
  fechaNacimiento: dayjs.Dayjs | null;
  nacionalidad?: string;
  sexo?: string;
  telefono?: string;
  domicilio?: string;
  usuarioAcadeu?: string;
  claveAcadeu?: string;

  // Pestaña 2: Inscripción y Curso (Modo Alta)
  cursoId?: string;
  cicloId?: string;
  numeroOrden?: number;
  numeroInscripcion?: string;
  fechaInscripcion?: dayjs.Dayjs | null;
  fechaIngreso?: dayjs.Dayjs | null;
  fechaEgreso?: dayjs.Dayjs | null;
  estadoInscripcion?: EstadoInscripcion;

  // Pestaña 3: Responsable y Vínculo (Modo Alta)
  responsableId?: string;
  responsableDni?: string;
  responsableApellidos?: string;
  responsableNombres?: string;
  responsableNacionalidad?: string;
  responsableProfesion?: string;
  responsableTelefono?: string;
  responsableEmail?: string;
  vinculo?: string;
}

interface AlumnoFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: AlumnoFormValues, originalUpdatedDate?: string) => Promise<void>;
  initialValues?: Alumno | null;
}

const VINCULO_OPTIONS = [
  { label: 'Madre', value: 'Madre' },
  { label: 'Padre', value: 'Padre' },
  { label: 'Tutor / Tutora Legal', value: 'Tutor/a' },
  { label: 'Abuelo / Abuela', value: 'Abuelo/a' },
  { label: 'Tío / Tía', value: 'Tío/a' },
  { label: 'Hermano / Hermana', value: 'Hermano/a' },
  { label: 'Otro', value: 'Otro' },
];

const SEXO_OPTIONS = [
  { label: 'Femenino', value: 'Femenino' },
  { label: 'Masculino', value: 'Masculino' },
  { label: 'No binario', value: 'No binario' },
  { label: 'Otro / No especificado', value: 'Otro' },
];

const ESTADO_INSCRIPCION_OPTIONS: { label: string; value: EstadoInscripcion }[] = [
  { label: 'Regular', value: 'Regular' },
  { label: 'Libre', value: 'Libre' },
  { label: 'Baja', value: 'Baja' },
];

export const AlumnoFormModal: React.FC<AlumnoFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialValues,
}) => {
  const [form] = Form.useForm<AlumnoFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('alumno');

  // Observadores reactivos usando Form.useWatch de Ant Design
  const fechaNacimientoValue = Form.useWatch('fechaNacimiento', form);
  const estadoInscripcionValue = Form.useWatch('estadoInscripcion', form);

  // Estados para cursos y ciclos lectivos
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [ciclos, setCiclos] = useState<CicloLectivo[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Estados para responsable
  const [searchingDni, setSearchingDni] = useState(false);
  const [existingResponsable, setExistingResponsable] = useState<Responsable | null>(null);
  const [dniSearched, setDniSearched] = useState(false);
  const [lastSearchedDni, setLastSearchedDni] = useState('');

  const isEditing = Boolean(initialValues);

  // Cálculo reactivo de edad a partir de la fecha seleccionada en el formulario
  const edadCalculada = useMemo(() => {
    if (!fechaNacimientoValue) return null;
    const date = dayjs.isDayjs(fechaNacimientoValue) ? fechaNacimientoValue : dayjs(fechaNacimientoValue);
    if (!date.isValid()) return null;
    const years = dayjs().diff(date, 'year');
    return years >= 0 ? years : null;
  }, [fechaNacimientoValue]);

  // Cargar cursos y ciclos cuando se abre el modal
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        setLoadingMetadata(true);
        const [cursosList, ciclosList] = await Promise.all([
          inscripcionService.getCursos(),
          inscripcionService.getCiclos(),
        ]);
        if (!isMounted) return;
        setCursos(cursosList);
        setCiclos(ciclosList);

        // Si es alta, preseleccionar ciclo lectivo activo y fecha actual
        if (!initialValues) {
          const cicloActivo = ciclosList.find((c) => c.actual) || ciclosList[0];
          form.setFieldsValue({
            cicloId: cicloActivo?.id,
            fechaInscripcion: dayjs(),
            fechaIngreso: dayjs(),
            estadoInscripcion: 'Regular',
            nacionalidad: 'Argentina',
            responsableNacionalidad: 'Argentina',
            vinculo: 'Madre',
          });
        }
      } catch (error) {
        console.error('Error al cargar metadatos de cursos/ciclos:', error);
      } finally {
        if (isMounted) setLoadingMetadata(false);
      }
    };

    void fetchMetadata();

    return () => {
      isMounted = false;
    };
  }, [visible, initialValues, form]);

  // Sincronizar campos del formulario con initialValues al editar
  useEffect(() => {
    if (visible && initialValues) {
      const birthDate = initialValues.fechaNacimiento ? dayjs(initialValues.fechaNacimiento) : null;
      form.setFieldsValue({
        numeroLegajo: initialValues.numeroLegajo,
        dni: initialValues.dni,
        apellidos: initialValues.apellidos,
        nombres: initialValues.nombres,
        fechaNacimiento: birthDate,
        nacionalidad: initialValues.nacionalidad || 'Argentina',
        sexo: initialValues.sexo || 'Femenino',
        telefono: initialValues.telefono,
        domicilio: initialValues.domicilio,
        usuarioAcadeu: initialValues.usuarioAcadeu,
        claveAcadeu: initialValues.claveAcadeu,
        cursoId: initialValues.cursoId,
        cicloId: initialValues.cicloId,
        numeroOrden: initialValues.numeroOrden ?? undefined,
        numeroInscripcion: initialValues.numeroInscripcion,
        fechaIngreso: initialValues.fechaIngreso ? dayjs(initialValues.fechaIngreso) : null,
        fechaEgreso: initialValues.fechaEgreso ? dayjs(initialValues.fechaEgreso) : null,
        estadoInscripcion: (initialValues.estadoInscripcion as EstadoInscripcion) || 'Regular',
      });
    } else if (visible && !initialValues) {
      form.resetFields();
    }
  }, [visible, initialValues, form]);

  const handleModalClose = () => {
    form.resetFields();
    setExistingResponsable(null);
    setDniSearched(false);
    setLastSearchedDni('');
    setActiveTab('alumno');
    onClose();
  };

  // Búsqueda de responsable por DNI
  const handleSearchResponsable = useCallback(
    async (dniToSearch?: string) => {
      const dni = (dniToSearch ?? form.getFieldValue('responsableDni') ?? '').toString().trim();
      if (!dni || dni.length < 5) return;
      if (dni === lastSearchedDni && dniSearched) return;

      try {
        setSearchingDni(true);
        const resp = await responsableService.getByDni(dni);
        setLastSearchedDni(dni);
        setDniSearched(true);

        if (resp) {
          setExistingResponsable(resp);
          form.setFieldsValue({
            responsableId: resp.id,
            responsableDni: resp.dni,
            responsableApellidos: resp.apellidos,
            responsableNombres: resp.nombres,
            responsableNacionalidad: resp.nacionalidad || 'Argentina',
            responsableProfesion: resp.profesion || '',
            responsableTelefono: resp.telefono || '',
            responsableEmail: resp.email || '',
          });
        } else {
          setExistingResponsable(null);
          form.setFieldsValue({
            responsableId: undefined,
          });
        }
      } catch (error) {
        console.error('Error al buscar responsable por DNI:', error);
      } finally {
        setSearchingDni(false);
      }
    },
    [form, lastSearchedDni, dniSearched]
  );

  const handleValuesChange = (changedValues: Partial<AlumnoFormValues>) => {
    if ('estadoInscripcion' in changedValues) {
      if (changedValues.estadoInscripcion !== 'Baja') {
        form.setFieldValue('fechaEgreso', null);
      } else if (!form.getFieldValue('fechaEgreso')) {
        form.setFieldValue('fechaEgreso', dayjs());
      }
    }
  };

  const handleClearResponsable = () => {
    setExistingResponsable(null);
    setDniSearched(false);
    setLastSearchedDni('');
    form.setFieldsValue({
      responsableId: undefined,
      responsableDni: '',
      responsableApellidos: '',
      responsableNombres: '',
      responsableNacionalidad: 'Argentina',
      responsableProfesion: '',
      responsableTelefono: '',
      responsableEmail: '',
      vinculo: 'Madre',
    });
  };

  const handleOk = () => {
    form
      .validateFields()
      .then(async (values) => {
        try {
          setSubmitting(true);
          await onSubmit(values, initialValues?.updatedAt);
          handleModalClose();
        } finally {
          setSubmitting(false);
        }
      })
      .catch((info) => {
        console.log('Validación fallida:', info);
        // Si hay error en campos de otra pestaña, orientar al usuario
        const errorFields = info.errorFields || [];
        const alumnoFieldNames = ['dni', 'apellidos', 'nombres', 'fechaNacimiento'];
        const inscripcionFieldNames = ['cursoId', 'cicloId'];
        const responsableFieldNames = ['responsableDni', 'responsableApellidos', 'responsableNombres', 'vinculo'];

        if (errorFields.some((f: { name: string[] }) => alumnoFieldNames.includes(f.name[0]))) {
          setActiveTab('alumno');
        } else if (errorFields.some((f: { name: string[] }) => inscripcionFieldNames.includes(f.name[0]))) {
          setActiveTab('inscripcion');
        } else if (errorFields.some((f: { name: string[] }) => responsableFieldNames.includes(f.name[0]))) {
          setActiveTab('responsable');
        }
      });
  };

  // Render Pestaña 1: Datos del Alumno
  const renderTabAlumno = () => (
    <div style={{ paddingTop: 4 }}>
      <Row gutter={14}>
        <Col xs={24} sm={12} md={7}>
          <Form.Item
            name="apellidos"
            label="Apellidos del Alumno"
            rules={[{ required: true, message: 'Por favor ingrese los apellidos' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. Pérez García" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={7}>
          <Form.Item
            name="nombres"
            label="Nombres del Alumno"
            rules={[{ required: true, message: 'Por favor ingrese los nombres' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. Mateo Valentín" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Form.Item
            name="dni"
            label={
              <span>
                DNI{' '}
                <Tooltip title="Documento Nacional de Identidad del alumno sin puntos">
                  <QuestionCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                </Tooltip>
              </span>
            }
            rules={[
              { required: true, message: 'Por favor ingrese el DNI' },
              { pattern: /^[0-9]+$/, message: 'Solo números sin puntos' },
            ]}
          >
            <Input prefix={<IdcardOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. 45123890" maxLength={10} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Form.Item
            name="numeroLegajo"
            label="Nº de Legajo"
          >
            <Input prefix={<IdcardOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. 2026-001" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={14}>
        <Col xs={24} sm={12} md={7}>
          <Form.Item
            name="fechaNacimiento"
            label={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 6 }}>
                <span>Fecha de Nacimiento</span>
                {edadCalculada !== null && (
                  <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, padding: '0 5px' }}>
                    {edadCalculada} {edadCalculada === 1 ? 'año' : 'años'}
                  </Tag>
                )}
              </div>
            }
            rules={[{ required: true, message: 'Seleccione la fecha de nacimiento' }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              placeholder="DD/MM/AAAA"
              suffixIcon={<CalendarOutlined style={{ color: '#0d9488' }} />}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Form.Item name="sexo" label="Sexo">
            <Select placeholder="Seleccione sexo" options={SEXO_OPTIONS} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="nacionalidad" label="Nacionalidad">
            <Input prefix={<GlobalOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. Argentina" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="telefono" label="Teléfono">
            <Input prefix={<PhoneOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. +54 9 11 1234-5678" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={14}>
        <Col xs={24} md={12}>
          <Form.Item name="domicilio" label="Domicilio">
            <Input prefix={<HomeOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. Av. San Martín 1234, CABA" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="usuarioAcadeu" label="Usuario Acadeu">
            <Input prefix={<UserOutlined style={{ color: '#2563eb' }} />} placeholder="Ej. alumno.perez" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="claveAcadeu" label="Clave Acadeu">
            <Input.Password prefix={<LockOutlined style={{ color: '#2563eb' }} />} placeholder="Contraseña de acceso" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );

  // Render Pestaña 2: Inscripción y Curso (solo en alta)
  const renderTabInscripcion = () => (
    <div style={{ paddingTop: 4 }}>
      {loadingMetadata ? (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <Spin tip="Cargando cursos y ciclos lectivos disponibles..." />
        </div>
      ) : (
        <>
          <Row gutter={14}>
            <Col xs={24} sm={12} md={10}>
              <Form.Item
                name="cursoId"
                label="Curso a Asignar"
                rules={[{ required: !isEditing, message: 'Por favor seleccione el curso' }]}
              >
                <Select
                  placeholder="Seleccione el curso y turno"
                  showSearch
                  optionFilterProp="label"
                  options={cursos.map((c) => ({
                    value: c.id,
                    label: `${c.nombre} ${c.nivelNombre ? `• ${c.nivelNombre}` : ''} (${c.turno || 'Sin turno'})`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={7}>
              <Form.Item
                name="cicloId"
                label={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Ciclo Lectivo</span>
                    <Tag color="blue" style={{ fontSize: 11, borderRadius: 4 }}>
                      Activo
                    </Tag>
                  </div>
                }
                rules={[{ required: !isEditing, message: 'Seleccione el ciclo lectivo' }]}
              >
                <Select
                  placeholder="Ciclo escolar"
                  options={ciclos.map((c) => ({
                    value: c.id,
                    label: `${c.ano}${c.actual ? ' (Ciclo Actual)' : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={7}>
              <Form.Item name="estadoInscripcion" label="Estado de Cursada">
                <Select options={ESTADO_INSCRIPCION_OPTIONS} defaultValue="Regular" />
              </Form.Item>
            </Col>
          </Row>

          {estadoInscripcionValue === 'Baja' && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 14, borderRadius: 8 }}
              message="Estudiante en Estado de Baja"
              description="Indique la fecha de egreso/retiro del alumno de la institución. Este campo es obligatorio para mantener la trazabilidad de bajas escolares."
            />
          )}

          <Row gutter={14}>
            <Col xs={24} sm={12} md={estadoInscripcionValue === 'Baja' ? 4 : 5}>
              <Form.Item name="numeroOrden" label="Nº de Orden">
                <InputNumber min={1} max={999} style={{ width: '100%' }} placeholder="Ej. 15" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={estadoInscripcionValue === 'Baja' ? 5 : 7}>
              <Form.Item name="numeroInscripcion" label="Nº de Inscripción">
                <Input placeholder="Ej. MAT-2026-045" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={estadoInscripcionValue === 'Baja' ? 5 : 6}>
              <Form.Item name="fechaInscripcion" label="Fecha Inscripción">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/AAAA" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={estadoInscripcionValue === 'Baja' ? 5 : 6}>
              <Form.Item name="fechaIngreso" label="Fecha Ingreso">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/AAAA" />
              </Form.Item>
            </Col>
            {estadoInscripcionValue === 'Baja' && (
              <Col xs={24} sm={12} md={5}>
                <Form.Item
                  name="fechaEgreso"
                  label={<span style={{ color: '#dc2626', fontWeight: 600 }}>Fecha Egreso / Baja *</span>}
                  rules={[{ required: true, message: 'La fecha de baja es obligatoria' }]}
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: '100%', borderColor: '#ef4444' }}
                    placeholder="DD/MM/AAAA"
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        </>
      )}
    </div>
  );

  // Render Pestaña 3: Responsable y Vínculo (solo en alta)
  const renderTabResponsable = () => (
    <div style={{ paddingTop: 4 }}>
      {/* Alertas de DNI encontrado / no encontrado */}
      {existingResponsable && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 12, borderRadius: 10 }}
          message={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span>
                <strong>
                  {existingResponsable.apellidos}, {existingResponsable.nombres}
                </strong>{' '}
                (DNI: {existingResponsable.dni}) ya está registrado.
              </span>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleClearResponsable}>
                Buscar otro DNI
              </Button>
            </div>
          }
          description="Se reutilizará su registro y se vinculará con el nuevo alumno."
        />
      )}

      {dniSearched && !existingResponsable && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12, borderRadius: 10 }}
          message="DNI no registrado previamente"
          description="Complete los datos a continuación para registrar al responsable y asociarlo al estudiante."
        />
      )}

      <Row gutter={14}>
        <Col xs={24} sm={12} md={9}>
          <Form.Item
            name="responsableDni"
            label={
              <span>
                DNI del Responsable{' '}
                <Tooltip title="Ingrese el DNI y presione 'Buscar' para consultar la base">
                  <QuestionCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                </Tooltip>
              </span>
            }
            rules={[
              { required: !isEditing, message: 'Por favor ingrese el DNI del responsable' },
              { pattern: /^[0-9]+$/, message: 'Solo números sin puntos' },
            ]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                prefix={<IdcardOutlined style={{ color: '#2563eb' }} />}
                placeholder="Ej. 30123456"
                maxLength={10}
                onBlur={() => handleSearchResponsable()}
                onPressEnter={() => handleSearchResponsable()}
                disabled={Boolean(existingResponsable)}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                loading={searchingDni}
                onClick={() => handleSearchResponsable()}
                disabled={Boolean(existingResponsable)}
              >
                Buscar
              </Button>
            </Space.Compact>
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={7}>
          <Form.Item
            name="vinculo"
            label="Vínculo / Parentesco"
            rules={[{ required: !isEditing, message: 'Seleccione o ingrese el vínculo' }]}
          >
            <Select placeholder="Ej. Madre, Padre, Tutor" options={VINCULO_OPTIONS} allowClear showSearch />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Form.Item name="responsableTelefono" label="Teléfono de Contacto">
            <Input
              prefix={<PhoneOutlined style={{ color: '#2563eb' }} />}
              placeholder="Ej. +54 9 11 1234-5678"
              disabled={Boolean(existingResponsable)}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={14}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="responsableApellidos"
            label="Apellidos del Responsable"
            rules={[{ required: !isEditing, message: 'Por favor ingrese los apellidos' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#2563eb' }} />}
              placeholder="Ej. García"
              disabled={Boolean(existingResponsable)}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="responsableNombres"
            label="Nombres del Responsable"
            rules={[{ required: !isEditing, message: 'Por favor ingrese los nombres' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#2563eb' }} />}
              placeholder="Ej. Laura Elena"
              disabled={Boolean(existingResponsable)}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="responsableEmail"
            label="Correo Electrónico"
            rules={[{ type: 'email', message: 'Ingrese un correo electrónico válido' }]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#2563eb' }} />}
              placeholder="Ej. laura.garcia@email.com"
              disabled={Boolean(existingResponsable)}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={14}>
        <Col xs={24} sm={12} md={12}>
          <Form.Item name="responsableNacionalidad" label="Nacionalidad">
            <Input
              prefix={<GlobalOutlined style={{ color: '#2563eb' }} />}
              placeholder="Ej. Argentina"
              disabled={Boolean(existingResponsable)}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={12}>
          <Form.Item name="responsableProfesion" label="Profesión u Ocupación">
            <Input
              prefix={<SolutionOutlined style={{ color: '#2563eb' }} />}
              placeholder="Ej. Docente, Empleado/a"
              disabled={Boolean(existingResponsable)}
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );

  const tabItems = [
    {
      key: 'alumno',
      label: (
        <span>
          <UserOutlined />
          1. Datos del Alumno
        </span>
      ),
      children: renderTabAlumno(),
    },
    {
      key: 'inscripcion',
      label: (
        <span>
          <BookOutlined />
          2. Inscripción y Cursada
        </span>
      ),
      children: renderTabInscripcion(),
    },
    ...(!isEditing
      ? [
          {
            key: 'responsable',
            label: (
              <span>
                <TeamOutlined />
                3. Responsable y Vínculo
              </span>
            ),
            children: renderTabResponsable(),
          },
        ]
      : []),
  ];

  return (
    <Modal
      open={visible}
      style={{ top: 12 }}
      title={
        <div style={{ paddingBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 700, color: '#0f172a' }}>
            {isEditing ? 'Editar Ficha del Alumno' : 'Alta Integral de Alumno'}
          </span>
          <Text type="secondary" style={{ display: 'block', fontSize: 13, fontWeight: 400, marginTop: 2 }}>
            {isEditing
              ? 'Actualice los datos personales y de cursada del estudiante.'
              : 'Registre los datos del estudiante, su inscripción al curso y el responsable en un solo paso.'}
          </Text>
        </div>
      }
      className="form-modal"
      width={940}
      destroyOnClose
      onCancel={handleModalClose}
      footer={[
        <Button key="back" onClick={handleModalClose} disabled={submitting}>
          Cancelar
        </Button>,
        !isEditing && activeTab !== 'alumno' ? (
          <Button
            key="prev"
            icon={<LeftOutlined />}
            onClick={() => {
              if (activeTab === 'responsable') setActiveTab('inscripcion');
              else if (activeTab === 'inscripcion') setActiveTab('alumno');
            }}
          >
            Anterior
          </Button>
        ) : null,
        !isEditing && activeTab !== 'responsable' ? (
          <Button
            key="next"
            type="default"
            onClick={() => {
              if (activeTab === 'alumno') setActiveTab('inscripcion');
              else if (activeTab === 'inscripcion') setActiveTab('responsable');
            }}
          >
            Siguiente <RightOutlined />
          </Button>
        ) : null,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleOk}
          className="btn-primary-gradient"
        >
          {isEditing ? 'Guardar Cambios' : 'Registrar e Inscribir'}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="alumnoForm"
        requiredMark={false}
        onValuesChange={handleValuesChange}
        style={{ paddingTop: 4 }}
      >
        <Form.Item name="responsableId" hidden>
          <Input />
        </Form.Item>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          type="card"
          tabBarStyle={{ marginBottom: 16 }}
        />
      </Form>
    </Modal>
  );
};
