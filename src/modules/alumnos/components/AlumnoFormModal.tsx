import { useModalSessionKey } from '../../../shared/hooks/useModalSessionKey';
import { FormModal, FormModalSteps } from '../../../shared/components/FormModal';
import { focusFirstFormError } from '../../../shared/utils/formValidation';
import ui from '../../../shared/styles/ui.module.css';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
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


  cursoId?: string;
  cicloId?: string;
  numeroOrden?: number;
  numeroInscripcion?: string;
  fechaInscripcion?: dayjs.Dayjs | null;
  fechaIngreso?: dayjs.Dayjs | null;
  fechaEgreso?: dayjs.Dayjs | null;
  estadoInscripcion?: EstadoInscripcion;


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

export const AlumnoFormModal: React.FC<AlumnoFormModalProps> = (props) => {
  const sessionKey = useModalSessionKey(props.visible);
  return (
    <AlumnoFormModalSession key={`${sessionKey}:${props.initialValues?.id ?? 'new'}:${props.initialTab ?? 'alumno'}`} {...props} />
  );
};

const AlumnoFormModalSession: React.FC<AlumnoFormModalProps> = ({
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
  const [fechaNacimientoValue, setFechaNacimientoValue] = useState<dayjs.Dayjs | null>(() =>
    initialValues?.fechaNacimiento ? dayjs(initialValues.fechaNacimiento) : null,
  );
  const [estadoInscripcionValue, setEstadoInscripcionValue] = useState<EstadoInscripcion | undefined>(
    (initialValues?.estadoInscripcion as EstadoInscripcion | undefined) ?? 'Regular',
  );


  const [cursos, setCursos] = useState<Curso[]>([]);
  const [ciclos, setCiclos] = useState<CicloLectivo[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);


  const [searchingDni, setSearchingDni] = useState(false);
  const [existingResponsable, setExistingResponsable] = useState<Responsable | null>(null);
  const [dniSearched, setDniSearched] = useState(false);
  const [lastSearchedDni, setLastSearchedDni] = useState('');
  const [loadingResponsable, setLoadingResponsable] = useState(Boolean(initialValues));

  const isEditing = Boolean(initialValues);


  const edadCalculada = useMemo(() => {
    if (!fechaNacimientoValue) return null;
    const date = dayjs.isDayjs(fechaNacimientoValue) ? fechaNacimientoValue : dayjs(fechaNacimientoValue);
    if (!date.isValid()) return null;
    const years = dayjs().diff(date, 'year');
    return years >= 0 ? years : null;
  }, [fechaNacimientoValue]);


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


  useEffect(() => {
    let active = true;
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
      responsableService
        .getByAlumnoId(initialValues.id)
        .then((responsables) => {
          if (!active) return;
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
          if (active) console.error('Error al cargar responsable vinculado:', err);
        })
        .finally(() => {
          if (active) setLoadingResponsable(false);
        });
    } else if (visible && !initialValues) {
      form.resetFields();
    }
    return () => { active = false; };
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
    if ('fechaNacimiento' in changedValues) {
      setFechaNacimientoValue(changedValues.fechaNacimiento ?? null);
    }
    if ('estadoInscripcion' in changedValues) {
      setEstadoInscripcionValue(changedValues.estadoInscripcion);
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
      focusFirstFormError(form, info);
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
        focusFirstFormError(form, info);
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
        focusFirstFormError(form, info);
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


  const renderTabAlumno = () => (
    <div style={{ paddingTop: 4 }}>
      {isEditing && (
        <div
          style={{
            background: "var(--cys-color-fill-quaternary)",
            border: "1px solid var(--cys-color-border-secondary)",
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
          <div className={ui.wrappingRow}>
            <Text strong className={ui.sectionLabel}>
              Campos Registrados:
            </Text>
            <Tag color="success" className={ui.strongTag}>
              DNI: {initialValues?.dni || 'Cargado'}
            </Tag>
            {initialValues?.telefono ? (
              <Tag color="success" className={ui.compactTag}>
                Teléfono: {initialValues.telefono}
              </Tag>
            ) : (
              <Tag color="warning" className={ui.compactTag}>
                ⚠️ Sin Teléfono
              </Tag>
            )}
            {initialValues?.domicilio ? (
              <Tag color="success" className={ui.compactTag}>
                Domicilio Cargado
              </Tag>
            ) : (
              <Tag color="warning" className={ui.compactTag}>
                ⚠️ Sin Domicilio
              </Tag>
            )}
            {initialValues?.usuarioAcadeu ? (
              <Tag color="blue" className={ui.compactTag}>
                Acadeu: {initialValues.usuarioAcadeu}
              </Tag>
            ) : (
              <Tag color="default" className={ui.compactTag}>
                Sin usuario Acadeu
              </Tag>
            )}
          </div>
          {edadCalculada !== null && (
            <Tag color="cyan" className={ui.statusTag}>
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
            <Input prefix={<UserOutlined className={ui.success} />} placeholder="Ej. Pérez García" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={7}>
          <Form.Item
            name="nombres"
            label="Nombres del Alumno"
            rules={[{ required: true, message: 'Por favor ingrese los nombres' }]}
          >
            <Input prefix={<UserOutlined className={ui.success} />} placeholder="Ej. Mateo Valentín" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Form.Item
            name="dni"
            label={
              <span>
                DNI{' '}
                <Tooltip title="Documento Nacional de Identidad del alumno sin puntos">
                  <QuestionCircleOutlined style={{ color: 'var(--cys-color-text-secondary)', fontSize: 12 }} />
                </Tooltip>
              </span>
            }
            rules={[
              { required: true, message: 'Por favor ingrese el DNI' },
              { pattern: /^[0-9]+$/, message: 'Solo números sin puntos' },
            ]}
          >
            <Input prefix={<IdcardOutlined className={ui.success} />} placeholder="Ej. 45123890" maxLength={10} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Form.Item
            name="numeroLegajo"
            label="Nº de Legajo"
          >
            <Input prefix={<IdcardOutlined className={ui.success} />} placeholder="Ej. 2026-001" />
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
              className={ui.fullWidth}
              placeholder="DD/MM/AAAA"
              suffixIcon={<CalendarOutlined className={ui.success} />}
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
            <Input prefix={<GlobalOutlined className={ui.success} />} placeholder="Ej. Argentina" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="telefono" label="Teléfono">
            <Input prefix={<PhoneOutlined className={ui.success} />} placeholder="Ej. +54 9 11 1234-5678" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={14}>
        <Col xs={24} md={12}>
          <Form.Item name="domicilio" label="Domicilio">
            <Input prefix={<HomeOutlined className={ui.success} />} placeholder="Ej. Av. San Martín 1234, CABA" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="usuarioAcadeu" label="Usuario Acadeu">
            <Input prefix={<UserOutlined className={ui.primary} />} placeholder="Ej. alumno.perez" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="claveAcadeu" label="Clave Acadeu">
            <Input.Password prefix={<LockOutlined className={ui.primary} />} placeholder="Contraseña de acceso" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );


  const renderTabInscripcion = () => (
    <div style={{ paddingTop: 4 }}>
      {isEditing && (
        <div
          style={{
            background: "var(--cys-color-fill-quaternary)",
            border: "1px solid var(--cys-color-border-secondary)",
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
          <div className={ui.wrappingRow}>
            <Text strong className={ui.sectionLabel}>
              Estado de Matrícula:
            </Text>
            {initialValues?.cursoNombre ? (
              <Tag color="blue" className={ui.strongTag}>
                {initialValues.cursoNombre} {initialValues.turno ? `(${initialValues.turno})` : ''}
              </Tag>
            ) : (
              <Tag color="warning" className={ui.compactTag}>
                ⚠️ Sin Curso Asignado
              </Tag>
            )}
            <Tag
              color={initialValues?.estadoInscripcion === 'Baja' ? 'error' : 'success'}
              className={ui.strongTag}
            >
              Cursada: {initialValues?.estadoInscripcion || 'Regular'}
            </Tag>
            {initialValues?.numeroOrden ? (
              <Tag color="purple" className={ui.compactTag}>
                Nº de Orden: #{initialValues.numeroOrden}
              </Tag>
            ) : (
              <Tag color="warning" className={ui.compactTag}>
                ⚠️ Sin Nº de Orden
              </Tag>
            )}
            {initialValues?.numeroInscripcion ? (
              <Tag color="default" className={ui.compactTag}>
                Matrícula: {initialValues.numeroInscripcion}
              </Tag>
            ) : (
              <Tag color="default" className={ui.compactTag}>
                Sin Matrícula
              </Tag>
            )}
          </div>
        </div>
      )}

      {loadingMetadata ? (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <Spin description="Cargando cursos y ciclos lectivos disponibles..." />
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
                  <div className={ui.tightRow}>
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
                <Select options={ESTADO_INSCRIPCION_OPTIONS} />
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
                <InputNumber min={1} max={999} className={ui.fullWidth} placeholder="Ej. 15" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={estadoInscripcionValue === 'Baja' ? 5 : 7}>
              <Form.Item name="numeroInscripcion" label="Nº de Inscripción">
                <Input placeholder="Ej. MAT-2026-045" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={estadoInscripcionValue === 'Baja' ? 5 : 6}>
              <Form.Item name="fechaInscripcion" label="Fecha Inscripción">
                <DatePicker format="DD/MM/YYYY" className={ui.fullWidth} placeholder="DD/MM/AAAA" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={estadoInscripcionValue === 'Baja' ? 5 : 6}>
              <Form.Item name="fechaIngreso" label="Fecha Ingreso">
                <DatePicker format="DD/MM/YYYY" className={ui.fullWidth} placeholder="DD/MM/AAAA" />
              </Form.Item>
            </Col>
            {estadoInscripcionValue === 'Baja' && (
              <Col xs={24} sm={12} md={5}>
                <Form.Item
                  name="fechaEgreso"
                  label={<span style={{ color: 'var(--cys-color-error-text)', fontWeight: 600 }}>Fecha Egreso / Baja *</span>}
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


  const renderTabResponsable = () => (
    <div style={{ paddingTop: 4 }}>
      {isEditing && loadingResponsable && (
        <div style={{ textAlign: 'center', padding: '14px 0' }}>
          <Spin description="Cargando datos del responsable vinculado..." />
        </div>
      )}

      {isEditing && !loadingResponsable && (
        <div
          style={{
            background: "var(--cys-color-fill-quaternary)",
            border: "1px solid var(--cys-color-border-secondary)",
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
          <div className={ui.wrappingRow}>
            <Text strong className={ui.sectionLabel}>
              Datos del Responsable:
            </Text>
            {form.getFieldValue('responsableDni') || existingResponsable?.dni ? (
              <Tag color="success" className={ui.strongTag}>
                DNI: {form.getFieldValue('responsableDni') || existingResponsable?.dni}
              </Tag>
            ) : (
              <Tag color="warning" className={ui.compactTag}>
                ⚠️ Sin DNI
              </Tag>
            )}
            {form.getFieldValue('responsableTelefono') || existingResponsable?.telefono ? (
              <Tag color="success" className={ui.compactTag}>
                Teléfono Cargado
              </Tag>
            ) : (
              <Tag color="warning" className={ui.compactTag}>
                ⚠️ Sin Teléfono
              </Tag>
            )}
            {form.getFieldValue('responsableEmail') || existingResponsable?.email ? (
              <Tag color="success" className={ui.compactTag}>
                Email Cargado
              </Tag>
            ) : (
              <Tag color="warning" className={ui.compactTag}>
                ⚠️ Sin Email
              </Tag>
            )}
            {form.getFieldValue('vinculo') && (
              <Tag color="blue" className={ui.compactTag}>
                Vínculo: {form.getFieldValue('vinculo')}
              </Tag>
            )}
          </div>
        </div>
      )}

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
                prefix={<IdcardOutlined className={ui.primary} />}
                placeholder="Ej. 30123456"
                maxLength={10}
              />
            ) : (
              <Space.Compact className={ui.fullWidth}>
                <Input
                  prefix={<IdcardOutlined className={ui.primary} />}
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
              prefix={<PhoneOutlined className={ui.primary} />}
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
              prefix={<UserOutlined className={ui.primary} />}
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
              prefix={<UserOutlined className={ui.primary} />}
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
              prefix={<MailOutlined className={ui.primary} />}
              placeholder="Ej. laura.garcia@email.com"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={14}>
        <Col xs={24} sm={12} md={12}>
          <Form.Item name="responsableNacionalidad" label="Nacionalidad">
            <Input
              prefix={<GlobalOutlined className={ui.primary} />}
              placeholder="Ej. Argentina"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={12}>
          <Form.Item name="responsableProfesion" label="Profesión u Ocupación">
            <Input
              prefix={<SolutionOutlined className={ui.primary} />}
              placeholder="Ej. Docente, Empleado/a"
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );


  const editTabItems = [
    {
      key: 'alumno',
      label: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2, padding: '2px 0' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
            <UserOutlined style={{ fontSize: 13.5 }} />
            <span>1. Datos del Alumno</span>
          </span>
          <span style={{ fontSize: 11, color: "var(--cys-color-success-text)", fontWeight: 600, marginTop: 2, paddingLeft: 19 }}>
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
              color: initialValues?.cursoNombre ? "var(--cys-color-primary-text)" : "var(--cys-color-warning-text)",
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
              color: existingResponsable || form.getFieldValue('responsableDni') ? "var(--cys-color-success-text)" : "var(--cys-color-warning-text)",
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
    <FormModal
      open={visible}
      title={isEditing ? 'Editar ficha del alumno' : 'Nuevo alumno'}
      description={isEditing
        ? 'Actualizá los datos personales, la cursada o el responsable vinculado.'
        : 'Completá los datos esenciales en tres pasos breves.'}
      icon={isEditing ? <SolutionOutlined /> : <UserAddOutlined />}
      tone={isEditing ? 'info' : 'primary'}
      extra={!isEditing ? <Tag color="blue" className={ui.strongTag}>Paso {currentStep + 1} de 3</Tag> : undefined}
      width={940}
      onCancel={handleModalClose}
      footer={[
        <Button key="back" onClick={handleModalClose} disabled={submitting}>
          Cancelar
        </Button>,
        !isEditing && currentStep > 0 ? (
          <Button key="prev" icon={<LeftOutlined />} onClick={handlePrevStep} disabled={submitting}>
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
            Continuar <RightOutlined />
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
            {isEditing ? 'Guardar cambios' : 'Registrar alumno'}
          </Button>
        ),
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="alumnoForm"
        preserve
        requiredMark
        scrollToFirstError={{ focus: true }}
        onValuesChange={handleValuesChange}
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
            <FormModalSteps
              current={currentStep}
              onChange={handleStepChange}
              items={[
                {
                  title: 'Datos del alumno',
                  content: 'Ficha personal',
                  icon: <UserOutlined />,
                },
                {
                  title: 'Inscripción y curso',
                  content: 'Matrícula y grado',
                  icon: <BookOutlined />,
                },
                {
                  title: 'Responsable y vínculo',
                  content: 'Tutor legal',
                  icon: <TeamOutlined />,
                },
              ]}
            />

            <div hidden={currentStep !== 0}>
              {renderTabAlumno()}
            </div>
            <div hidden={currentStep !== 1}>
              {renderTabInscripcion()}
            </div>
            <div hidden={currentStep !== 2}>
              {renderTabResponsable()}
            </div>
          </>
        )}
      </Form>
    </FormModal>
  );
};
