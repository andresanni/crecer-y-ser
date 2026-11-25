import { useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { DeleteOutlined, LockOutlined, PlusOutlined, UserDeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ClientResponseError } from 'pocketbase';
import type { Alumno } from '../models/alumno.model';
import { FormModal } from '../../../shared/components/FormModal';
import { focusFirstFormError } from '../../../shared/utils/formValidation';
import ui from '../../../shared/styles/ui.module.css';
import {
  cursadaService,
  type StudentEvaluationsSnapshot,
  type TipoInformeEvaluacion,
} from '../../inscripciones/services/cursada.service';

const { Text } = Typography;

const REPORT_LABELS: Record<TipoInformeEvaluacion, string> = {
  PRIMER_BIMESTRE: 'Informe 1.er Bimestre',
  PRIMER_CUATRIMESTRE: 'Informe 1.er Cuatrimestre',
  CICLO_FINAL: 'Informe Ciclo Final',
};

interface Props {
  visible: boolean;
  alumno?: Alumno | null;
  inscripcionId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface BajaFormValues {
  fechaEgreso: dayjs.Dayjs;
  sinCursada?: boolean;
  ultimoBimestre?: number;
  cambiosEscuela?: Array<{ fecha?: dayjs.Dayjs; causa?: string; escuelaDestino?: string }>;
  cambioDomicilio?: string;
}

export const DarDeBajaModal = ({ visible, alumno, inscripcionId, onClose, onSuccess }: Props) => {
  const targetInscripcionId = inscripcionId || alumno?.inscripcionId || null;
  if (!visible || !targetInscripcionId) return null;
  return (
    <DarDeBajaModalSession
      key={targetInscripcionId}
      inscripcionId={targetInscripcionId}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};

const DarDeBajaModalSession = ({
  inscripcionId,
  onClose,
  onSuccess,
}: {
  inscripcionId: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<BajaFormValues>();
  const [snapshot, setSnapshot] = useState<StudentEvaluationsSnapshot | null>(null);
  const [informesDraft, setInformesDraft] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [reload, setReload] = useState(0);

  const sinCursada = Form.useWatch('sinCursada', form);

  useEffect(() => {
    let active = true;
    cursadaService
      .getEvaluations(inscripcionId)
      .then((value) => {
        if (!active) return;
        setSnapshot(value);
        setError('');
        setUncertain(false);

        const nextInformes: Record<string, boolean> = {};
        value.informes.forEach((item) => {
          nextInformes[item.tipoInforme] = item.evaluable;
        });
        setInformesDraft(nextInformes);

        const activeTerms: number[] = [];
        if (value.boletines) {
          if (value.boletines.b1) activeTerms.push(1);
          if (value.boletines.b2) activeTerms.push(2);
          if (value.boletines.b3) activeTerms.push(3);
          if (value.boletines.b4) activeTerms.push(4);
        }

        const initialCambios = (value.datosAdministrativos?.cambiosEscuela || []).map((item) => ({
          fecha: item.fecha ? dayjs(item.fecha.slice(0, 10)) : undefined,
          causa: item.causa || '',
          escuelaDestino: item.escuelaDestino || '',
        }));

        form.setFieldsValue({
          fechaEgreso: value.fechaEgreso ? dayjs(value.fechaEgreso.slice(0, 10)) : dayjs(),
          sinCursada: !value.esInicial && activeTerms.length === 0,
          ultimoBimestre: activeTerms.length > 0 ? activeTerms[activeTerms.length - 1] : 4,
          cambiosEscuela: initialCambios,
          cambioDomicilio: value.datosAdministrativos?.cambioDomicilio || '',
        });
      })
      .catch(() => {
        if (active) setError('No se pudo leer la matrícula del alumno. Volvé a cargarla.');
      });

    return () => {
      active = false;
    };
  }, [inscripcionId, reload, form]);

  const blockedTerms = snapshot?.boletines?.bimestresBloqueados ?? [];
  const currentFirstTerm = (() => {
    if (!snapshot?.boletines) return 1;
    if (snapshot.boletines.b1) return 1;
    if (snapshot.boletines.b2) return 2;
    if (snapshot.boletines.b3) return 3;
    if (snapshot.boletines.b4) return 4;
    return 1;
  })();
  const minAllowedLastTerm = Math.max(
    currentFirstTerm,
    blockedTerms.length > 0 ? blockedTerms[blockedTerms.length - 1] : 1,
  );

  const handleSave = async () => {
    if (!snapshot || uncertain) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      setError('');

      const formattedCambios = (values.cambiosEscuela || [])
        .filter((item) => item && (item.fecha || item.causa || item.escuelaDestino))
        .map((item) => ({
          fecha: item.fecha ? item.fecha.format('YYYY-MM-DD') : '',
          causa: item.causa?.trim() || '',
          escuelaDestino: item.escuelaDestino?.trim() || '',
        }));

      const boletinesPayload = !snapshot.esInicial
        ? values.sinCursada
          ? { b1: false, b2: false, b3: false, b4: false }
          : {
              b1: currentFirstTerm <= 1 && (values.ultimoBimestre ?? 4) >= 1,
              b2: currentFirstTerm <= 2 && (values.ultimoBimestre ?? 4) >= 2,
              b3: currentFirstTerm <= 3 && (values.ultimoBimestre ?? 4) >= 3,
              b4: currentFirstTerm <= 4 && (values.ultimoBimestre ?? 4) >= 4,
            }
        : undefined;

      await cursadaService.saveEvaluations(snapshot, {
        registrarBaja: true,
        fechaEgreso: values.fechaEgreso.format('YYYY-MM-DD'),
        ...(boletinesPayload ? { boletines: boletinesPayload } : {}),
        informes: snapshot.informes.map((item) => ({
          tipoInforme: item.tipoInforme,
          evaluable: Boolean(informesDraft[item.tipoInforme]),
        })),
        ...(!snapshot.esInicial
          ? {
              datosAdministrativos: {
                escuelaInicial: snapshot.datosAdministrativos?.escuelaInicial || '',
                fechaIngresoInicial: snapshot.datosAdministrativos?.fechaIngresoInicial
                  ? snapshot.datosAdministrativos.fechaIngresoInicial.slice(0, 10)
                  : '',
                fechaEgresoInicial: snapshot.datosAdministrativos?.fechaEgresoInicial
                  ? snapshot.datosAdministrativos.fechaEgresoInicial.slice(0, 10)
                  : '',
                cambiosEscuela: formattedCambios,
                cambioDomicilio: values.cambioDomicilio?.trim() || '',
              },
            }
          : {}),
      });

      message.success('Baja y corte de evaluaciones registrados.');
      onSuccess();
      onClose();
    } catch (cause) {
      if (cause && typeof cause === 'object' && 'errorFields' in cause) {
        focusFirstFormError(form, cause);
        return;
      }
      setError(
        cause instanceof ClientResponseError
          ? cause.response.message || 'No se pudo registrar la baja.'
          : 'No se pudo confirmar el guardado. Volvé a cargar la matrícula.',
      );
      setUncertain(
        !(cause instanceof ClientResponseError) ||
          cause.status === 0 ||
          cause.status === 409 ||
          cause.status >= 500,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open
      title="Registrar baja del alumno"
      icon={<UserDeleteOutlined />}
      description={
        snapshot
          ? `${snapshot.nombreCompleto} · ${snapshot.curso} · ${snapshot.ciclo}`
          : undefined
      }
      onCancel={saving ? undefined : onClose}
      closable={!saving}
      mask={{ closable: !saving }}
      width={640}
      onOk={() => void handleSave()}
      okText="Registrar baja"
      cancelText="Cancelar"
      confirmLoading={saving}
      okButtonProps={{ danger: true, disabled: !snapshot || uncertain }}
      cancelButtonProps={{ disabled: saving }}
    >
      <Space orientation="vertical" size="middle" className={ui.fullWidth}>
        <Alert
          type="info"
          showIcon
          message="La baja habilita el corte de evaluaciones del ciclo"
          description="Definí la fecha de baja y qué boletines o informes corresponde conservar para este alumno. Las instancias ya evaluadas o entregadas permanecen protegidas."
        />

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button
                disabled={saving}
                onClick={() => {
                  setSnapshot(null);
                  setReload((value) => value + 1);
                }}
              >
                Volver a cargar
              </Button>
            }
          />
        )}

        {!snapshot && !error && <Spin />}

        <Form form={form} layout="vertical" disabled={saving || !snapshot || uncertain}>
          <Form.Item
            name="fechaEgreso"
            label="Fecha administrativa de baja"
            rules={[{ required: true, message: 'Indicá la fecha de baja.' }]}
          >
            <DatePicker format="DD/MM/YYYY" className={ui.fullWidth} placeholder="DD/MM/AAAA" />
          </Form.Item>

          {snapshot && !snapshot.esInicial && (
            <Card size="small" title="Corte en Boletines de Primaria" style={{ marginBottom: 12 }}>
              <Space orientation="vertical" size="small" className={ui.fullWidth}>
                {snapshot.esAltaTardia && (
                  <Tag color="gold">
                    Alta Tardía · Primer bimestre evaluable: {currentFirstTerm}.º
                  </Tag>
                )}
                <Tooltip
                  title={
                    blockedTerms.length > 0
                      ? 'Ya registra datos en boletines y no puede quedar sin cursada.'
                      : undefined
                  }
                >
                  <Form.Item name="sinCursada" valuePropName="checked" style={{ marginBottom: 4 }}>
                    <Checkbox disabled={blockedTerms.length > 0}>
                      No cursó ningún bimestre (sin boletines)
                    </Checkbox>
                  </Form.Item>
                </Tooltip>
                {!sinCursada && (
                  <Form.Item
                    name="ultimoBimestre"
                    label="Último bimestre evaluable"
                    rules={[{ required: true, message: 'Seleccioná el último bimestre.' }]}
                    style={{ marginBottom: 4 }}
                  >
                    <Select
                      options={[1, 2, 3, 4]
                        .filter((term) => term >= minAllowedLastTerm)
                        .map((value) => ({
                          value,
                          label: `${value}.º bimestre`,
                        }))}
                    />
                  </Form.Item>
                )}
                {blockedTerms.length > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Bimestres con notas, cierres o entregas: {blockedTerms.join(', ')}. Se conservarán activos.
                  </Text>
                )}
              </Space>
            </Card>
          )}

          {snapshot && snapshot.informes.length > 0 && (
            <Card size="small" title="Participación en Informes de Maestras" style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 10 }}>
                Desactivá los informes que ya no correspondan tras la baja. Los informes entregados permanecen bloqueados.
              </Text>
              <Space orientation="vertical" size="small" className={ui.fullWidth}>
                {snapshot.informes.map((item) => {
                  const checked = Boolean(informesDraft[item.tipoInforme]);
                  return (
                    <div
                      key={item.tipoInforme}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--cys-color-border-secondary)',
                      }}
                    >
                      <Space size={6} wrap>
                        <Text strong>{REPORT_LABELS[item.tipoInforme]}</Text>
                        {item.bloqueadoPorEntrega && (
                          <Tooltip title={`Ya entregado en: ${item.materiasEntregadas.join(', ')}.`}>
                            <Tag icon={<LockOutlined />} color="processing">
                              Entregado
                            </Tag>
                          </Tooltip>
                        )}
                      </Space>
                      <Switch
                        checked={checked}
                        disabled={saving || uncertain || (item.bloqueadoPorEntrega && checked)}
                        checkedChildren="SÍ"
                        unCheckedChildren="NO"
                        aria-label={`Baja ${REPORT_LABELS[item.tipoInforme]}`}
                        onChange={(value) =>
                          setInformesDraft((prev) => ({
                            ...prev,
                            [item.tipoInforme]: value,
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </Space>
            </Card>
          )}

          {snapshot && !snapshot.esInicial && !sinCursada && (
            <Collapse
              items={[
                {
                  key: 'admin',
                  label: 'Pase de escuela y cambio de domicilio (Página 14 del boletín — opcional)',
                  children: (
                    <Space orientation="vertical" size="small" className={ui.fullWidth}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Podés cargar el pase de salida ahora o completarlo más adelante desde la pestaña 4. Evaluaciones.
                      </Text>
                      <Form.List name="cambiosEscuela">
                        {(fields, { add, remove }) => (
                          <Space orientation="vertical" size="small" className={ui.fullWidth}>
                            {fields.map(({ key, name, ...restField }, index) => (
                              <Card
                                key={key}
                                size="small"
                                title={`Pase ${index + 1}`}
                                extra={
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => remove(name)}
                                  />
                                }
                              >
                                <Row gutter={8}>
                                  <Col xs={24} sm={7}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'fecha']}
                                      label="Fecha"
                                      rules={[{ required: true, message: 'Requerida' }]}
                                    >
                                      <DatePicker
                                        format="DD/MM/YYYY"
                                        className={ui.fullWidth}
                                        placeholder="DD/MM/AAAA"
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} sm={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'causa']}
                                      label="Causa"
                                      rules={[{ required: true, message: 'Requerida' }]}
                                    >
                                      <Input placeholder="Ej: Mudanza" />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} sm={9}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'escuelaDestino']}
                                      label="Escuela destino"
                                      rules={[{ required: true, message: 'Requerida' }]}
                                    >
                                      <Input placeholder="Nombre de la escuela" />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </Card>
                            ))}
                            {fields.length < 4 && (
                              <Button
                                type="dashed"
                                onClick={() => add({ fecha: form.getFieldValue('fechaEgreso') || dayjs() })}
                                block
                                icon={<PlusOutlined />}
                              >
                                Agregar pase de escuela
                              </Button>
                            )}
                          </Space>
                        )}
                      </Form.List>
                      <Form.Item name="cambioDomicilio" label="Cambio de domicilio (opcional)">
                        <Input placeholder="Ej: Nuevo domicilio particular..." />
                      </Form.Item>
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Form>
      </Space>
    </FormModal>
  );
};
