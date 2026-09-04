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
  Steps,
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
  CheckOutlined,
  UserAddOutlined,
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
  initialTab?: string;
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
  initialTab = 'alumno',
}) => {
  const [form] = Form.useForm<AlumnoFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [activeEditTab, setActiveEditTab] = useState<string>(initialTab || 'alumno');

  // Sincronizar activeEditTab cuando se pasa initialTab al abrir el modal
  useEffect(() => {
    if (visible && initialTab) {
      setActiveEditTab(initialTab);
    }
  }, [visible, initialTab]);

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
  const [loadingResponsable, setLoadingResponsable] = useState(false);

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

      // Cargar el responsable vinculado del alumno
      setLoadingResponsable(true);
      responsableService
        .getByAlumnoId(initialValues.id)
        .then((responsables) => {
          if (responsables && responsables.length > 0) {
            const primary = responsables[0];
            setExistingResponsable(primary.responsable);
            setDniSearched(true);
            setLastSearchedDni(primary.responsable.dni);
            form.setFieldsValue({
              responsableId: primary.responsable.id,
              responsableDni: primary.responsable.dni,
              responsableApellidos: primary.responsable.apellidos,
              responsableNombres: primary.responsable.nombres,
              responsableNacionalidad: primary.responsable.nacionalidad || 'Argentina',
              responsableProfesion: primary.responsable.profesion || '',
              responsableTelefono: primary.responsable.telefono || '',
              responsableEmail: primary.responsable.email || '',
              vinculo: primary.vinculo || 'Madre',
            });
          } else {
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
          }
        })
        .catch((err) => {
          console.error('Error al cargar responsable vinculado:', err);
        })
        .finally(() => {
          setLoadingResponsable(false);
        });
    } else if (visible && !initialValues) {
      form.resetFields();
      setExistingResponsable(null);
      setDniSearched(false);
      setLastSearchedDni('');
      setLoadingResponsable(false);
    }
  }, [visible, initialValues, form]);

  const handleModalClose = () => {
    form.resetFields();
    setExistingResponsable(null);
    setDniSearched(false);
    setLastSearchedDni('');
    setCurrentStep(0);
    setActiveEditTab('alumno');
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

  // Validaciones por etapa en el asistente
  const handleNextStep = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['apellidos', 'nombres', 'dni', 'fechaNacimiento']);
        setCurrentStep(1);
      } else if (currentStep === 1) {
        const fieldsToValidate = ['cursoId', 'cicloId'];
        if (form.getFieldValue('estadoInscripcion') === 'Baja') {
          fieldsToValidate.push('fechaEgreso');
        }
        await form.validateFields(fieldsToValidate);
        setCurrentStep(2);
      }
    } catch (info) {
      console.log('Validación de etapa fallida:', info);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepChange = async (targetStep: number) => {
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
    } else if (targetStep === currentStep + 1) {
      await handleNextStep();
    } else if (targetStep === 2 && currentStep === 0) {
      try {
        await form.validateFields(['apellidos', 'nombres', 'dni', 'fechaNacimiento']);
        const fieldsToValidate = ['cursoId', 'cicloId'];
        if (form.getFieldValue('estadoInscripcion') === 'Baja') {
          fieldsToValidate.push('fechaEgreso');
        }
        await form.validateFields(fieldsToValidate);
        setCurrentStep(2);
      } catch (info) {
        console.log('Validación previa fallida:', info);
      }
    }
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
        const errorFields = info.errorFields || [];
        const alumnoFieldNames = ['dni', 'apellidos', 'nombres', 'fechaNacimiento'];
        const inscripcionFieldNames = ['cursoId', 'cicloId', 'fechaEgreso'];
        const responsableFieldNames = ['responsableDni', 'responsableApellidos', 'responsableNombres', 'vinculo'];

        if (isEditing) {
          if (errorFields.some((f: { name: string[] }) => alumnoFieldNames.includes(f.name[0]))) {
            setActiveEditTab('alumno');
          } else if (errorFields.some((f: { name: string[] }) => inscripcionFieldNames.includes(f.name[0]))) {
            setActiveEditTab('inscripcion');
          } else if (errorFields.some((f: { name: string[] }) => responsableFieldNames.includes(f.name[0]))) {
            setActiveEditTab('responsable');
          }
        } else {
          if (errorFields.some((f: { name: string[] }) => alumnoFieldNames.includes(f.name[0]))) {
            setCurrentStep(0);
          } else if (errorFields.some((f: { name: string[] }) => inscripcionFieldNames.includes(f.name[0]))) {
            setCurrentStep(1);
          } else if (errorFields.some((f: { name: string[] }) => responsableFieldNames.includes(f.name[0]))) {
            setCurrentStep(2);
          }
        }
      });
  };

  // Render Pestaña 1: Datos del Alumno
  const renderTabAlumno = () => (
    <div style={{ paddingTop: 4 }}>
      {/* Banner de Estado de Datos en Modo Edición */}
      {isEditing && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '8px 12px',
            marginBottom: 14,
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
              DNI: {initialValues?.dni || 'Cargado'}
            </Tag>
            {initialValues?.telefono ? (
              <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                Teléfono: {initialValues.telefono}
              </Tag>
            ) : (
              <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                ⚠️ Sin Teléfono
              </Tag>
            )}
            {initialValues?.domicilio ? (
              <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                Domicilio Cargado
              </Tag>
            ) : (
              <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                ⚠️ Sin Domicilio
              </Tag>
            )}
            {initialValues?.usuarioAcadeu ? (
              <Tag color="blue" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                Acadeu: {initialValues.usuarioAcadeu}
              </Tag>
            ) : (
              <Tag color="default" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                Sin usuario Acadeu
              </Tag>
            )}
          </div>
          {edadCalculada !== null && (
            <Tag color="cyan" style={{ margin: 0, borderRadius: 6, fontWeight: 700, fontSize: 11 }}>
              {edadCalculada} {edadCalculada === 1 ? 'año' : 'años'}
            </Tag>
          )}
        </div>
      )}

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

  // Render Pestaña 2: Inscripción y Curso
  const renderTabInscripcion = () => (
    <div style={{ paddingTop: 4 }}>
      {/* Banner de Estado de Cursada en Modo Edición */}
      {isEditing && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '8px 12px',
            marginBottom: 14,
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
            {initialValues?.cursoNombre ? (
              <Tag color="blue" style={{ margin: 0, borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                {initialValues.cursoNombre} {initialValues.turno ? `(${initialValues.turno})` : ''}
              </Tag>
            ) : (
              <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                ⚠️ Sin Curso Asignado
              </Tag>
            )}
            <Tag
              color={initialValues?.estadoInscripcion === 'Baja' ? 'error' : 'success'}
              style={{ margin: 0, borderRadius: 6, fontSize: 11, fontWeight: 600 }}
            >
              Cursada: {initialValues?.estadoInscripcion || 'Regular'}
            </Tag>
            {initialValues?.numeroOrden ? (
              <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                Nº de Orden: #{initialValues.numeroOrden}
              </Tag>
            ) : (
              <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                ⚠️ Sin Nº de Orden
              </Tag>
            )}
            {initialValues?.numeroInscripcion ? (
              <Tag color="default" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                Matrícula: {initialValues.numeroInscripcion}
              </Tag>
            ) : (
              <Tag color="default" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                Sin Matrícula
              </Tag>
            )}
          </div>
        </div>
      )}

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

  // Render Pestaña 3: Responsable y Vínculo
  const renderTabResponsable = () => (
    <div style={{ paddingTop: 4 }}>
      {/* Loading de responsable en modo edición */}
      {isEditing && loadingResponsable && (
        <div style={{ textAlign: 'center', padding: '14px 0' }}>
          <Spin tip="Cargando datos del responsable vinculado..." />
        </div>
      )}

      {/* Banner de Estado de Datos del Responsable en Modo Edición */}
      {isEditing && !loadingResponsable && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '8px 12px',
            marginBottom: 14,
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
            {form.getFieldValue('responsableDni') || existingResponsable?.dni ? (
              <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                DNI: {form.getFieldValue('responsableDni') || existingResponsable?.dni}
              </Tag>
            ) : (
              <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                ⚠️ Sin DNI
              </Tag>
            )}
            {form.getFieldValue('responsableTelefono') || existingResponsable?.telefono ? (
              <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                Teléfono Cargado
              </Tag>
            ) : (
              <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                ⚠️ Sin Teléfono
              </Tag>
            )}
            {form.getFieldValue('responsableEmail') || existingResponsable?.email ? (
              <Tag color="success" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                Email Cargado
              </Tag>
            ) : (
              <Tag color="warning" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                ⚠️ Sin Email
              </Tag>
            )}
            {form.getFieldValue('vinculo') && (
              <Tag color="blue" style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>
                Vínculo: {form.getFieldValue('vinculo')}
              </Tag>
            )}
          </div>
        </div>
      )}

      {/* Alertas solo en Modo Alta (!isEditing) */}
      {!isEditing && existingResponsable && (
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
                (DNI: {existingResponsable.dni}) ya está registrado en el sistema.
              </span>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleClearResponsable}>
                Buscar otro DNI
              </Button>
            </div>
          }
          description="Se reutilizará su registro y se vinculará con el nuevo alumno."
        />
      )}

      {!isEditing && dniSearched && !existingResponsable && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12, borderRadius: 10 }}
          message="DNI no registrado previamente"
          description="Complete los datos a continuación para registrar al responsable y asociarlo al estudiante."
        />
      )}

      <Row gutter={14}>
        <Col xs={24} sm={12} md={isEditing ? 7 : 9}>
          <Form.Item
            name="responsableDni"
            label="DNI del Responsable"
            rules={[
              { required: !isEditing, message: 'Por favor ingrese el DNI del responsable' },
              { pattern: /^[0-9]+$/, message: 'Solo números sin puntos' },
            ]}
          >
            {isEditing ? (
              <Input
                prefix={<IdcardOutlined style={{ color: '#2563eb' }} />}
                placeholder="Ej. 30123456"
                maxLength={10}
              />
            ) : (
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  prefix={<IdcardOutlined style={{ color: '#2563eb' }} />}
                  placeholder="Ej. 30123456"
                  maxLength={10}
                  onBlur={() => handleSearchResponsable()}
                  onPressEnter={() => handleSearchResponsable()}
                />
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  loading={searchingDni}
                  onClick={() => handleSearchResponsable()}
                >
                  Buscar
                </Button>
              </Space.Compact>
            )}
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={isEditing ? 8 : 7}>
          <Form.Item
            name="vinculo"
            label="Vínculo / Parentesco"
            rules={[{ required: !isEditing, message: 'Seleccione o ingrese el vínculo' }]}
          >
            <Select placeholder="Ej. Madre, Padre, Tutor" options={VINCULO_OPTIONS} allowClear showSearch />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={isEditing ? 9 : 8}>
          <Form.Item name="responsableTelefono" label="Teléfono de Contacto">
            <Input
              prefix={<PhoneOutlined style={{ color: '#2563eb' }} />}
              placeholder="Ej. +54 9 11 1234-5678"
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
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={12}>
          <Form.Item name="responsableProfesion" label="Profesión u Ocupación">
            <Input
              prefix={<SolutionOutlined style={{ color: '#2563eb' }} />}
              placeholder="Ej. Docente, Empleado/a"
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );

  // Tabs para modo edición con subtítulos de estado verticalizados
  const editTabItems = [
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
      children: renderTabAlumno(),
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
              color: initialValues?.cursoNombre ? '#2563eb' : '#d97706',
            }}
          >
            {initialValues?.cursoNombre ? `• ${initialValues.cursoNombre}` : '⚠️ Sin Curso'}
          </span>
        </div>
      ),
      children: renderTabInscripcion(),
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
              color: existingResponsable || form.getFieldValue('responsableDni') ? '#16a34a' : '#d97706',
            }}
          >
            {existingResponsable || form.getFieldValue('responsableDni') ? '✓ Tutor Vinculado' : '⚠️ Sin Responsable'}
          </span>
        </div>
      ),
      children: renderTabResponsable(),
    },
  ];

  return (
    <Modal
      open={visible}
      style={{ top: 12 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: isEditing
                  ? 'linear-gradient(135deg, #0284c7, #0ea5e9)'
                  : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 18,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.22)',
                flexShrink: 0,
              }}
            >
              {isEditing ? <SolutionOutlined /> : <UserAddOutlined />}
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {isEditing ? 'Editar Ficha del Alumno' : 'Alta Integral de Alumno'}
              </span>
              <Text type="secondary" style={{ display: 'block', fontSize: 12.5, fontWeight: 400, marginTop: 1 }}>
                {isEditing
                  ? 'Actualice los datos personales y de cursada del estudiante.'
                  : 'Formulario secuencial en 3 etapas: Alumno, Curso y Responsable Legal.'}
              </Text>
            </div>
          </div>

          {!isEditing && (
            <Tag color="blue" style={{ borderRadius: 6, fontWeight: 700, fontSize: 12, padding: '3px 10px' }}>
              Paso {currentStep + 1} de 3
            </Tag>
          )}
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
        !isEditing && currentStep > 0 ? (
          <Button
            key="prev"
            icon={<LeftOutlined />}
            onClick={handlePrevStep}
            disabled={submitting}
          >
            Anterior
          </Button>
        ) : null,
        !isEditing && currentStep < 2 ? (
          <Button
            key="next"
            type="primary"
            onClick={handleNextStep}
            disabled={submitting}
            className="btn-primary-gradient"
          >
            {currentStep === 0 ? 'Continuar a Curso' : 'Continuar a Responsable'} <RightOutlined />
          </Button>
        ) : (
          <Button
            key="submit"
            type="primary"
            loading={submitting}
            onClick={handleOk}
            icon={<CheckOutlined />}
            className="btn-primary-gradient"
          >
            {isEditing ? 'Guardar Cambios' : 'Registrar e Inscribir Alumno'}
          </Button>
        ),
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="alumnoForm"
        preserve={true}
        requiredMark={false}
        onValuesChange={handleValuesChange}
        style={{ paddingTop: 4 }}
      >
        <Form.Item name="responsableId" hidden>
          <Input />
        </Form.Item>

        {isEditing ? (
          <Tabs
            activeKey={activeEditTab}
            onChange={setActiveEditTab}
            items={editTabItems}
            type="card"
            tabBarStyle={{ marginBottom: 16 }}
          />
        ) : (
          <>
            <Steps
              current={currentStep}
              onChange={handleStepChange}
              size="small"
              className="cys-form-steps"
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px solid #f1f5f9',
              }}
              items={[
                {
                  title: '1. Datos del Alumno',
                  description: 'Ficha personal',
                  icon:
                    currentStep > 0 ? (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: 13,
                        }}
                      >
                        <CheckOutlined />
                      </div>
                    ) : currentStep === 0 ? (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: 13,
                        }}
                      >
                        <UserOutlined />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          fontSize: 13,
                        }}
                      >
                        <UserOutlined />
                      </div>
                    ),
                },
                {
                  title: '2. Inscripción y Curso',
                  description: 'Matrícula y grado',
                  icon:
                    currentStep > 1 ? (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: 13,
                        }}
                      >
                        <CheckOutlined />
                      </div>
                    ) : currentStep === 1 ? (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: 13,
                        }}
                      >
                        <BookOutlined />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          fontSize: 13,
                        }}
                      >
                        <BookOutlined />
                      </div>
                    ),
                },
                {
                  title: '3. Responsable y Vínculo',
                  description: 'Tutor legal',
                  icon:
                    currentStep > 2 ? (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: 13,
                        }}
                      >
                        <CheckOutlined />
                      </div>
                    ) : currentStep === 2 ? (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: 13,
                        }}
                      >
                        <TeamOutlined />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          fontSize: 13,
                        }}
                      >
                        <TeamOutlined />
                      </div>
                    ),
                },
              ]}
            />

            <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
              {renderTabAlumno()}
            </div>
            <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
              {renderTabInscripcion()}
            </div>
            <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
              {renderTabResponsable()}
            </div>
          </>
        )}
      </Form>
    </Modal>
  );
};
