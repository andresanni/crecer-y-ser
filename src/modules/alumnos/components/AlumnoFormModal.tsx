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
  Card,
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
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Alumno } from '../models/alumno.model';
import { responsableService } from '../../responsables/services/responsable.service';
import type { Responsable } from '../../responsables/models/responsable.model';
import { inscripcionService } from '../../inscripciones/services/inscripcion.service';
import {
  formatModalidadJornada,
  type Curso,
  type CicloLectivo,
  type EstadoInscripcion,
  type ModalidadJornada,
} from '../../inscripciones/models/inscripcion.model';

const { Text } = Typography;

export interface AlumnoFormValues {
  numeroLegajo?: string;
  dni: string;
  apellidos: string;
  nombres: string;
  fechaNacimiento: dayjs.Dayjs | null;
  nacionalidad?: string;
  sexo?: string;
  domicilio?: string;
  localidad?: string;
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
  modalidadJornada?: ModalidadJornada;

  responsableId?: string;
  responsableDniTipo?: string;
  responsableDniNumero?: string;
  responsableDni?: string;
  responsableApellidos?: string;
  responsableNombres?: string;
  responsableNacionalidad?: string;
  responsableProfesion?: string;
  responsableTelefono?: string;
  responsableEmail?: string;
  vinculo?: string;

  responsableSecundarioId?: string;
  responsableSecundarioDniTipo?: string;
  responsableSecundarioDniNumero?: string;
  responsableSecundarioDni?: string;
  responsableSecundarioApellidos?: string;
  responsableSecundarioNombres?: string;
  responsableSecundarioNacionalidad?: string;
  responsableSecundarioProfesion?: string;
  responsableSecundarioTelefono?: string;
  responsableSecundarioEmail?: string;
  vinculoSecundario?: string;
}

interface AlumnoFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: AlumnoFormValues, originalUpdatedDate?: string) => Promise<void>;
  initialValues?: Alumno | null;
  initialTab?: string;
}

const VINCULO_OPTIONS = [
  { label: 'Padre', value: 'Padre' },
  { label: 'Madre', value: 'Madre' },
  { label: 'Tutor / Tutora Legal', value: 'Tutor/a' },
  { label: 'Abuelo / Abuela', value: 'Abuelo/a' },
  { label: 'Tío / Tía', value: 'Tío/a' },
  { label: 'Hermano / Hermana', value: 'Hermano/a' },
  { label: 'Otro', value: 'Otro' },
];

const DNI_TIPO_OPTIONS = [
  { label: 'DNI', value: 'DNI' },
  { label: 'Pasaporte', value: 'Pasaporte' },
  { label: 'LC', value: 'LC' },
  { label: 'LE', value: 'LE' },
  { label: 'CI', value: 'CI' },
  { label: 'Extranjero', value: 'Extranjero' },
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

const MODALIDAD_JORNADA_OPTIONS: { label: string; value: ModalidadJornada }[] = [
  { label: 'Turno Mañana', value: 'Mañana' },
  { label: 'Jornada Completa', value: 'Jornada Completa' },
  { label: 'Turno Tarde', value: 'Tarde' },
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

  const [searchingSecundarioDni, setSearchingSecundarioDni] = useState(false);
  const [existingResponsableSecundario, setExistingResponsableSecundario] = useState<Responsable | null>(null);
  const [dniSecundarioSearched, setDniSecundarioSearched] = useState(false);
  const [lastSearchedSecundarioDni, setLastSearchedSecundarioDni] = useState('');
  const [showSecondaryResponsable, setShowSecondaryResponsable] = useState(false);

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
            responsableDniTipo: 'DNI',
            vinculo: 'Padre',
            responsableSecundarioNacionalidad: 'Argentina',
            responsableSecundarioDniTipo: 'DNI',
            vinculoSecundario: 'Madre',
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
        domicilio: initialValues.domicilio,
        localidad: initialValues.localidad,
        usuarioAcadeu: initialValues.usuarioAcadeu,
        claveAcadeu: initialValues.claveAcadeu,
        cursoId: initialValues.cursoId,
        cicloId: initialValues.cicloId,
        numeroOrden: initialValues.numeroOrden ?? undefined,
        numeroInscripcion: initialValues.numeroInscripcion,
        fechaIngreso: initialValues.fechaIngreso ? dayjs(initialValues.fechaIngreso) : null,
        fechaEgreso: initialValues.fechaEgreso ? dayjs(initialValues.fechaEgreso) : null,
        estadoInscripcion: (initialValues.estadoInscripcion as EstadoInscripcion) || 'Regular',
        modalidadJornada: initialValues.modalidadJornada,
      });

      responsableService
        .getByAlumnoId(initialValues.id)
        .then((responsables) => {
          if (!active) return;
          if (responsables && responsables.length > 0) {
            const primary = responsables[0];
            const primaryDni = primary.responsable.dniNumero || primary.responsable.dni;
            setExistingResponsable(primary.responsable);
            setDniSearched(true);
            setLastSearchedDni(primaryDni);
            form.setFieldsValue({
              responsableId: primary.responsable.id,
              responsableDniTipo: primary.responsable.dniTipo || 'DNI',
              responsableDniNumero: primaryDni,
              responsableDni: primaryDni,
              responsableApellidos: primary.responsable.apellidos,
              responsableNombres: primary.responsable.nombres,
              responsableNacionalidad: primary.responsable.nacionalidad || 'Argentina',
              responsableProfesion: primary.responsable.profesion || '',
              responsableTelefono: primary.responsable.telefono || '',
              responsableEmail: primary.responsable.email || '',
              vinculo: primary.vinculo || 'Padre',
            });

            if (responsables.length > 1) {
              const secondary = responsables[1];
              const secondaryDni = secondary.responsable.dniNumero || secondary.responsable.dni;
              setExistingResponsableSecundario(secondary.responsable);
              setDniSecundarioSearched(true);
              setLastSearchedSecundarioDni(secondaryDni);
              setShowSecondaryResponsable(true);
              form.setFieldsValue({
                responsableSecundarioId: secondary.responsable.id,
                responsableSecundarioDniTipo: secondary.responsable.dniTipo || 'DNI',
                responsableSecundarioDniNumero: secondaryDni,
                responsableSecundarioDni: secondaryDni,
                responsableSecundarioApellidos: secondary.responsable.apellidos,
                responsableSecundarioNombres: secondary.responsable.nombres,
                responsableSecundarioNacionalidad: secondary.responsable.nacionalidad || 'Argentina',
                responsableSecundarioProfesion: secondary.responsable.profesion || '',
                responsableSecundarioTelefono: secondary.responsable.telefono || '',
                responsableSecundarioEmail: secondary.responsable.email || '',
                vinculoSecundario: secondary.vinculo || 'Madre',
              });
            } else {
              setExistingResponsableSecundario(null);
              setDniSecundarioSearched(false);
              setLastSearchedSecundarioDni('');
              setShowSecondaryResponsable(false);
            }
          } else {
            setExistingResponsable(null);
            setDniSearched(false);
            setLastSearchedDni('');
            setExistingResponsableSecundario(null);
            setDniSecundarioSearched(false);
            setLastSearchedSecundarioDni('');
            setShowSecondaryResponsable(false);
            form.setFieldsValue({
              responsableId: undefined,
              responsableDniTipo: 'DNI',
              responsableDniNumero: '',
              responsableDni: '',
              responsableApellidos: '',
              responsableNombres: '',
              responsableNacionalidad: 'Argentina',
              responsableProfesion: '',
              responsableTelefono: '',
              responsableEmail: '',
              vinculo: 'Padre',
              responsableSecundarioId: undefined,
              responsableSecundarioDniTipo: 'DNI',
              responsableSecundarioDniNumero: '',
              responsableSecundarioDni: '',
              responsableSecundarioApellidos: '',
              responsableSecundarioNombres: '',
              responsableSecundarioNacionalidad: 'Argentina',
              responsableSecundarioProfesion: '',
              responsableSecundarioTelefono: '',
              responsableSecundarioEmail: '',
              vinculoSecundario: 'Madre',
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
    setExistingResponsableSecundario(null);
    setDniSecundarioSearched(false);
    setLastSearchedSecundarioDni('');
    setShowSecondaryResponsable(false);
    setCurrentStep(0);
    setActiveEditTab('alumno');
    onClose();
  };

  const handleSearchResponsable = useCallback(
    async (dniToSearch?: string) => {
      const dni = (dniToSearch ?? form.getFieldValue('responsableDniNumero') ?? form.getFieldValue('responsableDni') ?? '').toString().trim();
      if (!dni || dni.length < 5) return;
      if (dni === lastSearchedDni && dniSearched) return;

      try {
        setSearchingDni(true);
        const resp = await responsableService.getByDni(dni);
        setLastSearchedDni(dni);
        setDniSearched(true);

        if (resp) {
          const respDni = resp.dniNumero || resp.dni;
          setExistingResponsable(resp);
          form.setFieldsValue({
            responsableId: resp.id,
            responsableDniTipo: resp.dniTipo || 'DNI',
            responsableDniNumero: respDni,
            responsableDni: respDni,
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

  const handleSearchResponsableSecundario = useCallback(
    async (dniToSearch?: string) => {
      const dni = (dniToSearch ?? form.getFieldValue('responsableSecundarioDniNumero') ?? form.getFieldValue('responsableSecundarioDni') ?? '').toString().trim();
      if (!dni || dni.length < 5) return;
      if (dni === lastSearchedSecundarioDni && dniSecundarioSearched) return;

      try {
        setSearchingSecundarioDni(true);
        const resp = await responsableService.getByDni(dni);
        setLastSearchedSecundarioDni(dni);
        setDniSecundarioSearched(true);

        if (resp) {
          const respDni = resp.dniNumero || resp.dni;
          setExistingResponsableSecundario(resp);
          form.setFieldsValue({
            responsableSecundarioId: resp.id,
            responsableSecundarioDniTipo: resp.dniTipo || 'DNI',
            responsableSecundarioDniNumero: respDni,
            responsableSecundarioDni: respDni,
            responsableSecundarioApellidos: resp.apellidos,
            responsableSecundarioNombres: resp.nombres,
            responsableSecundarioNacionalidad: resp.nacionalidad || 'Argentina',
            responsableSecundarioProfesion: resp.profesion || '',
            responsableSecundarioTelefono: resp.telefono || '',
            responsableSecundarioEmail: resp.email || '',
          });
        } else {
          setExistingResponsableSecundario(null);
          form.setFieldsValue({
            responsableSecundarioId: undefined,
          });
        }
      } catch (error) {
        console.error('Error al buscar segundo responsable por DNI:', error);
      } finally {
        setSearchingSecundarioDni(false);
      }
    },
    [form, lastSearchedSecundarioDni, dniSecundarioSearched]
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
      responsableDniNumero: '',
      responsableApellidos: '',
      responsableNombres: '',
      responsableNacionalidad: 'Argentina',
      responsableProfesion: '',
      responsableTelefono: '',
      responsableEmail: '',
      vinculo: 'Padre',
    });
  };

  const handleClearResponsableSecundario = () => {
    setExistingResponsableSecundario(null);
    setDniSecundarioSearched(false);
    setLastSearchedSecundarioDni('');
    form.setFieldsValue({
      responsableSecundarioId: undefined,
      responsableSecundarioDni: '',
      responsableSecundarioDniNumero: '',
      responsableSecundarioApellidos: '',
      responsableSecundarioNombres: '',
      responsableSecundarioNacionalidad: 'Argentina',
      responsableSecundarioProfesion: '',
      responsableSecundarioTelefono: '',
      responsableSecundarioEmail: '',
      vinculoSecundario: 'Madre',
    });
  };

  const handleToggleSecondaryResponsable = () => {
    if (showSecondaryResponsable) {
      handleClearResponsableSecundario();
      setShowSecondaryResponsable(false);
    } else {
      setShowSecondaryResponsable(true);
    }
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
          const allFormValues = form.getFieldsValue(true);
          const mergedValues: AlumnoFormValues = {
            ...allFormValues,
            ...values,
          };
          await onSubmit(mergedValues, initialValues?.updatedAt);
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
        const responsableFieldNames = [
          'responsableDni',
          'responsableDniNumero',
          'responsableDniTipo',
          'responsableApellidos',
          'responsableNombres',
          'vinculo',
          'responsableSecundarioDni',
          'responsableSecundarioDniNumero',
          'responsableSecundarioDniTipo',
          'responsableSecundarioApellidos',
          'responsableSecundarioNombres',
          'vinculoSecundario',
        ];

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
            background: 'var(--cys-color-fill-quaternary)',
            border: '1px solid var(--cys-color-border-secondary)',
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
            {initialValues?.localidad ? (
              <Tag color="success" className={ui.compactTag}>
                Localidad: {initialValues.localidad}
              </Tag>
            ) : (
              <Tag color="warning" className={ui.compactTag}>
                ⚠️ Sin Localidad
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
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="sexo" label="Sexo">
            <Select placeholder="Seleccione sexo" options={SEXO_OPTIONS} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={9}>
          <Form.Item name="nacionalidad" label="Nacionalidad">
            <Input prefix={<GlobalOutlined className={ui.success} />} placeholder="Ej. Argentina" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={14}>
        <Col xs={24} md={8}>
          <Form.Item name="domicilio" label="Domicilio">
            <Input prefix={<HomeOutlined className={ui.success} />} placeholder="Ej. Av. San Martín 1234" />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item name="localidad" label="Localidad">
            <Input placeholder="Ej. CABA, Vicente López" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Form.Item name="usuarioAcadeu" label="Usuario Acadeu">
            <Input prefix={<UserOutlined className={ui.primary} />} placeholder="Ej. alumno.perez" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={5}>
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
            background: 'var(--cys-color-fill-quaternary)',
            border: '1px solid var(--cys-color-border-secondary)',
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
            {initialValues?.modalidadJornada && (
              <Tag color="geekblue" className={ui.strongTag}>
                Jornada: {formatModalidadJornada(initialValues.modalidadJornada)}
              </Tag>
            )}
            <Tag
              color={initialValues?.estadoInscripcion === 'Baja' ? 'error' : 'success'}
              className={ui.strongTag}
            >
              Cursada: {initialValues?.estadoInscripcion || 'Regular'}
            </Tag>
            {initialValues?.cursadaEstado === 'PENDIENTE' ? (
              <Tag color="warning" className={ui.compactTag}>
                Cursada por confirmar
              </Tag>
            ) : initialValues?.cursadaEstado === 'SIN_CURSADA' ? (
              <Tag color="default" className={ui.compactTag}>
                Sin cursada
              </Tag>
            ) : initialValues?.cursadaEstado === 'CONFIRMADA' ? (
              <Tag color={(initialValues.bimestreDesde && initialValues.bimestreDesde > 1) || (initialValues.bimestreHasta && initialValues.bimestreHasta < 4) ? 'cyan' : 'default'} className={ui.compactTag}>
                Bimestres {initialValues.bimestreDesde} a {initialValues.bimestreHasta}
              </Tag>
            ) : null}
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
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="cursoId"
                label="Curso / Sala a Asignar"
                rules={[{ required: !isEditing, message: 'Por favor seleccione el curso o sala' }]}
              >
                <Select
                  disabled={Boolean(initialValues?.inscripcionId)}
                  placeholder="Seleccione el curso o sala"
                  showSearch
                  optionFilterProp="label"
                  options={cursos.map((c) => ({
                    value: c.id,
                    label: `${c.nombre}${c.nivelNombre ? ` • ${c.nivelNombre}` : ''}${c.turno ? ` (${c.turno})` : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={5}>
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
                  disabled={Boolean(initialValues?.inscripcionId)}
                  placeholder="Ciclo escolar"
                  options={ciclos.map((c) => ({
                    value: c.id,
                    label: `${c.ano}${c.actual ? ' (Ciclo Actual)' : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item name="modalidadJornada" label="Modalidad de Jornada">
                <Select
                  allowClear
                  placeholder="Seleccione jornada (opcional)"
                  options={MODALIDAD_JORNADA_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={5}>
              <Form.Item name="estadoInscripcion" label="Estado de Cursada">
                <Select disabled={initialValues?.estadoInscripcion === 'Baja'} options={ESTADO_INSCRIPCION_OPTIONS.filter(option => option.value !== 'Baja' || initialValues?.estadoInscripcion === 'Baja')} />
              </Form.Item>
            </Col>
          </Row>

          {estadoInscripcionValue === 'Baja' && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 14, borderRadius: 8 }}
              message="Estudiante en Estado de Baja"
              description="Los bimestres evaluables se revisan desde la ficha de cursada. La baja administrativa no excluye su último boletín."
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
                  label={<span style={{ color: 'var(--cys-color-error-text)', fontWeight: 600 }}>Fecha Egreso / Baja</span>}
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    disabled
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
            background: 'var(--cys-color-fill-quaternary)',
            border: '1px solid var(--cys-color-border-secondary)',
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
              Tutores Registrados:
            </Text>
            {form.getFieldValue('responsableDniNumero') || form.getFieldValue('responsableDni') || existingResponsable?.dniNumero || existingResponsable?.dni ? (
              <Tag color="success" className={ui.strongTag}>
                Principal: {form.getFieldValue('responsableApellidos') || existingResponsable?.apellidos} ({form.getFieldValue('vinculo') || 'Padre'})
              </Tag>
            ) : (
              <Tag color="warning" className={ui.compactTag}>
                ⚠️ Sin Responsable Principal
              </Tag>
            )}
            {showSecondaryResponsable && (form.getFieldValue('responsableSecundarioDniNumero') || form.getFieldValue('responsableSecundarioDni') || existingResponsableSecundario?.dniNumero || existingResponsableSecundario?.dni) && (
              <Tag color="purple" className={ui.strongTag}>
                Secundario: {form.getFieldValue('responsableSecundarioApellidos') || existingResponsableSecundario?.apellidos} ({form.getFieldValue('vinculoSecundario') || 'Madre'})
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
                ({existingResponsable.dniTipo || 'DNI'}: {existingResponsable.dniNumero || existingResponsable.dni}) ya está registrado en el sistema.
              </span>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleClearResponsable}>
                Buscar otro DNI
              </Button>
            </div>
          }
          description="Se reutilizará su registro y se vinculará como responsable principal."
        />
      )}

      {!isEditing && dniSearched && !existingResponsable && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12, borderRadius: 10 }}
          message="DNI no registrado previamente"
          description="Complete los datos a continuación para registrar al responsable principal y asociarlo al estudiante."
        />
      )}

      <Card
        size="small"
        title={
          <Space size={8}>
            <UserOutlined style={{ color: '#0284c7' }} />
            <span>Responsable Principal</span>
          </Space>
        }
        style={{ marginBottom: 16, borderRadius: 10, border: '1px solid var(--cys-color-border-secondary)' }}
      >
        <Row gutter={14}>
          <Col xs={24} sm={8} md={4}>
            <Form.Item
              name="responsableDniTipo"
              label="Tipo Doc."
              initialValue="DNI"
            >
              <Select options={DNI_TIPO_OPTIONS} />
            </Form.Item>
          </Col>

          <Col xs={24} sm={16} md={8}>
            <Form.Item
              name="responsableDniNumero"
              label="Número de Doc."
              rules={[
                { required: !isEditing, message: 'Por favor ingrese el número de documento' },
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

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="vinculo"
              label="Vínculo / Parentesco"
              initialValue="Padre"
              rules={[{ required: !isEditing, message: 'Seleccione o ingrese el vínculo' }]}
            >
              <Select placeholder="Ej. Padre, Madre, Tutor" options={VINCULO_OPTIONS} allowClear showSearch />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
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
              label="Apellidos"
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
              label="Nombres"
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
      </Card>

      {!showSecondaryResponsable ? (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setShowSecondaryResponsable(true)}
          style={{ width: '100%', height: 40, borderRadius: 8 }}
        >
          Agregar Segundo Responsable (Opcional)
        </Button>
      ) : (
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space size={8}>
                <TeamOutlined style={{ color: '#7c3aed' }} />
                <span>Segundo Responsable (Opcional)</span>
              </Space>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={handleToggleSecondaryResponsable}
              >
                Quitar segundo responsable
              </Button>
            </div>
          }
          style={{ borderRadius: 10, border: '1px solid var(--cys-color-border-secondary)' }}
        >
          {existingResponsableSecundario && (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 12, borderRadius: 8 }}
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span>
                    <strong>
                      {existingResponsableSecundario.apellidos}, {existingResponsableSecundario.nombres}
                    </strong>{' '}
                    ({existingResponsableSecundario.dniTipo || 'DNI'}: {existingResponsableSecundario.dniNumero || existingResponsableSecundario.dni}) ya está registrado.
                  </span>
                  <Button size="small" icon={<ReloadOutlined />} onClick={handleClearResponsableSecundario}>
                    Buscar otro DNI
                  </Button>
                </div>
              }
              description="Se reutilizará su registro y se vinculará como segundo tutor."
            />
          )}

          {dniSecundarioSearched && !existingResponsableSecundario && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12, borderRadius: 8 }}
              message="DNI no registrado previamente"
              description="Complete los datos para registrar al segundo responsable y asociarlo al alumno."
            />
          )}

          <Row gutter={14}>
            <Col xs={24} sm={8} md={4}>
              <Form.Item
                name="responsableSecundarioDniTipo"
                label="Tipo Doc."
                initialValue="DNI"
              >
                <Select options={DNI_TIPO_OPTIONS} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={16} md={8}>
              <Form.Item
                name="responsableSecundarioDniNumero"
                label="Número de Doc."
                rules={[
                  { pattern: /^[0-9]+$/, message: 'Solo números sin puntos' },
                ]}
              >
                <Space.Compact className={ui.fullWidth}>
                  <Input
                    prefix={<IdcardOutlined style={{ color: '#7c3aed' }} />}
                    placeholder="Ej. 32123456"
                    maxLength={10}
                    onBlur={() => handleSearchResponsableSecundario()}
                    onPressEnter={() => handleSearchResponsableSecundario()}
                  />
                  <Button
                    type="default"
                    icon={<SearchOutlined />}
                    loading={searchingSecundarioDni}
                    onClick={() => handleSearchResponsableSecundario()}
                  >
                    Buscar
                  </Button>
                </Space.Compact>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="vinculoSecundario"
                label="Vínculo / Parentesco"
                initialValue="Madre"
              >
                <Select placeholder="Ej. Madre, Padre, Tutor" options={VINCULO_OPTIONS} allowClear showSearch />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item name="responsableSecundarioTelefono" label="Teléfono de Contacto">
                <Input
                  prefix={<PhoneOutlined style={{ color: '#7c3aed' }} />}
                  placeholder="Ej. +54 9 11 9876-5432"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="responsableSecundarioApellidos"
                label="Apellidos"
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#7c3aed' }} />}
                  placeholder="Ej. Rodríguez"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="responsableSecundarioNombres"
                label="Nombres"
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#7c3aed' }} />}
                  placeholder="Ej. Carlos Martín"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="responsableSecundarioEmail"
                label="Correo Electrónico"
                rules={[{ type: 'email', message: 'Ingrese un correo electrónico válido' }]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#7c3aed' }} />}
                  placeholder="Ej. carlos.rodriguez@email.com"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col xs={24} sm={12} md={12}>
              <Form.Item name="responsableSecundarioNacionalidad" label="Nacionalidad">
                <Input
                  prefix={<GlobalOutlined style={{ color: '#7c3aed' }} />}
                  placeholder="Ej. Argentina"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Form.Item name="responsableSecundarioProfesion" label="Profesión u Ocupación">
                <Input
                  prefix={<SolutionOutlined style={{ color: '#7c3aed' }} />}
                  placeholder="Ej. Empleado/a, Comerciante"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      )}
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
          <span style={{ fontSize: 11, color: 'var(--cys-color-success-text)', fontWeight: 600, marginTop: 2, paddingLeft: 19 }}>
            ✓ Ficha Completa
          </span>
        </div>
      ),
      children: renderTabAlumno(),
      forceRender: true,
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
              color: initialValues?.cursoNombre ? 'var(--cys-color-primary-text)' : 'var(--cys-color-warning-text)',
            }}
          >
            {initialValues?.cursoNombre ? `• ${initialValues.cursoNombre}` : '⚠️ Sin Curso'}
          </span>
        </div>
      ),
      children: renderTabInscripcion(),
      forceRender: true,
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
              color: existingResponsable || form.getFieldValue('responsableDniNumero') || form.getFieldValue('responsableDni')
                ? 'var(--cys-color-success-text)'
                : 'var(--cys-color-warning-text)',
            }}
          >
            {existingResponsable || form.getFieldValue('responsableDniNumero') || form.getFieldValue('responsableDni')
              ? showSecondaryResponsable ? '✓ 2 Tutores' : '✓ Tutor Vinculado'
              : '⚠️ Sin Responsable'}
          </span>
        </div>
      ),
      children: renderTabResponsable(),
      forceRender: true,
    },
  ];

  return (
    <FormModal
      open={visible}
      title={isEditing ? 'Editar ficha del alumno' : 'Nuevo alumno'}
      description={isEditing
        ? 'Actualizá los datos personales, la cursada o los responsables vinculados.'
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
            disabled={submitting || (isEditing && loadingResponsable) || loadingMetadata}
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
        <Form.Item name="responsableSecundarioId" hidden>
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
