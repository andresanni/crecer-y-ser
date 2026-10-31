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
  Typography,
} from 'antd';
import { CalendarOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ClientResponseError } from 'pocketbase';
import { focusFirstFormError } from '../../../shared/utils/formValidation';
import ui from '../../../shared/styles/ui.module.css';
import { FormModal } from '../../../shared/components/FormModal';
import { cursadaService, type CursadaSnapshot } from '../services/cursada.service';
import { isKindergartenCourse } from '../../alumnos/utils/gradeColors';

interface Props {
  inscripcionId: string;
  registrarBaja?: boolean;
  cursoNombre?: string;
  nivelNombre?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Values {
  desde: number;
  hasta: number;
  sinCursada: boolean;
  fechaEgreso?: dayjs.Dayjs;
  escuelaInicial?: string;
  fechaIngresoInicial?: dayjs.Dayjs;
  fechaEgresoInicial?: dayjs.Dayjs;
  cambiosEscuela?: Array<{ fecha?: dayjs.Dayjs; causa?: string; escuelaDestino?: string }>;
  cambioDomicilio?: string;
}

export const CursadaModal = ({
  inscripcionId,
  registrarBaja = false,
  cursoNombre,
  nivelNombre,
  onClose,
  onSuccess,
}: Props) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [snapshot, setSnapshot] = useState<CursadaSnapshot>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [reload, setReload] = useState(0);
  const recordWithdrawal = registrarBaja || snapshot?.estadoAdministrativo === 'Baja';
  const desde = Form.useWatch('desde', form);
  const hasta = Form.useWatch('hasta', form);
  const sinCursada = Form.useWatch('sinCursada', form);
  const [expandedKeys, setExpandedKeys] = useState<string[] | null>(null);
  const requiresAdminData = Boolean((desde && desde > 1) || recordWithdrawal || (hasta && hasta < 4));
  const activePanels = expandedKeys ?? (requiresAdminData ? ['admin'] : []);
  const isInicial = isKindergartenCourse(cursoNombre || snapshot?.curso, nivelNombre);

  useEffect(() => {
    let active = true;
    cursadaService.get(inscripcionId).then((value) => {
      if (!active) return;
      setSnapshot(value);
      setError('');
      setUncertain(false);
      const initialCambios = (value.cambiosEscuela && value.cambiosEscuela.length > 0)
        ? value.cambiosEscuela.map(item => ({
            fecha: item.fecha ? dayjs(item.fecha.slice(0, 10)) : undefined,
            causa: item.causa || '',
            escuelaDestino: item.escuelaDestino || '',
          }))
        : [];

      form.setFieldsValue({
        desde: value.cursada.desde || undefined,
        hasta: value.cursada.hasta || undefined,
        sinCursada: value.cursada.estado === 'SIN_CURSADA',
        fechaEgreso: value.fechaEgreso ? dayjs(value.fechaEgreso.slice(0, 10)) : dayjs(),
        escuelaInicial: value.escuelaInicial || '',
        fechaIngresoInicial: value.fechaIngresoInicial ? dayjs(value.fechaIngresoInicial.slice(0, 10)) : undefined,
        fechaEgresoInicial: value.fechaEgresoInicial ? dayjs(value.fechaEgresoInicial.slice(0, 10)) : undefined,
        cambiosEscuela: initialCambios,
        cambioDomicilio: value.cambioDomicilio || '',
      });
    }).catch(() => { if (active) setError('No se pudo leer la cursada. Volvé a cargarla.'); });
    return () => { active = false; };
  }, [inscripcionId, reload, form]);

  const save = async () => {
    if (!snapshot || uncertain) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      const formattedCambios = (values.cambiosEscuela || [])
        .filter((item) => item && (item.fecha || item.causa || item.escuelaDestino))
        .map((item) => ({
          fecha: item.fecha ? item.fecha.format('YYYY-MM-DD') : '',
          causa: item.causa?.trim() || '',
          escuelaDestino: item.escuelaDestino?.trim() || '',
        }));

      await cursadaService.save(snapshot, {
        desde: values.sinCursada ? 0 : values.desde,
        hasta: values.sinCursada ? 0 : values.hasta,
        sinCursada: Boolean(values.sinCursada),
        registrarBaja: recordWithdrawal,
        fechaEgreso: values.fechaEgreso?.format('YYYY-MM-DD') || '',
        escuelaInicial: values.escuelaInicial?.trim() || '',
        fechaIngresoInicial: values.fechaIngresoInicial ? values.fechaIngresoInicial.format('YYYY-MM-DD') : '',
        fechaEgresoInicial: values.fechaEgresoInicial ? values.fechaEgresoInicial.format('YYYY-MM-DD') : '',
        cambiosEscuela: formattedCambios,
        cambioDomicilio: values.cambioDomicilio?.trim() || '',
      });
      message.success(
        registrarBaja
          ? (isInicial ? 'Baja y períodos evaluables registrados.' : 'Baja y bimestres evaluables registrados.')
          : 'Cursada confirmada.'
      );
      onSuccess();
      onClose();
    } catch (cause) {
      if (cause && typeof cause === 'object' && 'errorFields' in cause) { focusFirstFormError(form, cause); return; }
      setError(cause instanceof ClientResponseError ? cause.response.message || 'No se pudo guardar la cursada.' : 'No se pudo confirmar el guardado. Volvé a cargar la cursada.');
      setUncertain(!(cause instanceof ClientResponseError) || cause.status === 0 || cause.status === 409 || cause.status >= 500);
    } finally { setSaving(false); }
  };

  const adminPanelItems = [
    {
      key: 'admin',
      label: isInicial
        ? 'Datos administrativos y cambios de escuela (Registro administrativo de trayectoria y pases)'
        : 'Datos administrativos y cambios de escuela (Página 14 del boletín)',
      children: (
        <Space orientation="vertical" size="small" className={ui.fullWidth}>
          {desde > 1 && (
            <Alert
              type="warning"
              showIcon
              title={isInicial ? 'Ingreso tardío: datos requeridos para la trayectoria' : 'Ingreso tardío: datos requeridos para el boletín'}
              description={
                isInicial
                  ? 'Indicá la escuela de origen y registrá el pase de ingreso hacia Crecer y Ser para completar la trayectoria institucional.'
                  : 'Indicá la escuela de origen y registrá el pase de ingreso hacia Crecer y Ser para habilitar la generación del PDF.'
              }
            />
          )}
          {(recordWithdrawal || (hasta !== undefined && hasta < 4)) && (
            <Alert
              type="warning"
              showIcon
              title="Baja o egreso anticipado"
              description={
                isInicial
                  ? 'Registrá el pase hacia la escuela de destino para el registro administrativo de trayectoria.'
                  : 'Registrá el pase hacia la escuela de destino para la hoja administrativa del boletín.'
              }
            />
          )}
          <Form.Item
            name="escuelaInicial"
            label="Escuela de procedencia / inicial"
          >
            <Input placeholder="Ej: Escuela N° 18 D.E 13" />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="fechaIngresoInicial" label="Fecha de ingreso inicial">
                <DatePicker format="DD/MM/YYYY" className={ui.fullWidth} placeholder="DD/MM/AAAA" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="fechaEgresoInicial" label="Fecha de egreso inicial">
                <DatePicker format="DD/MM/YYYY" className={ui.fullWidth} placeholder="DD/MM/AAAA" />
              </Form.Item>
            </Col>
          </Row>
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
            Pases de escuela (hasta 4)
          </Typography.Text>
          <Form.List name="cambiosEscuela">
            {(fields, { add, remove }, { errors }) => (
              <Space orientation="vertical" size="small" className={ui.fullWidth}>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card
                    key={key}
                    size="small"
                    title={`Pase ${index + 1}`}
                    extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />}
                  >
                    <Row gutter={8}>
                      <Col xs={24} sm={7}>
                        <Form.Item
                          {...restField}
                          name={[name, 'fecha']}
                          label="Fecha"
                          rules={[{ required: true, message: 'Requerida' }]}
                        >
                          <DatePicker format="DD/MM/YYYY" className={ui.fullWidth} placeholder="DD/MM/AAAA" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'causa']}
                          label="Causa"
                          rules={[{ required: true, message: 'Requerida' }]}
                        >
                          <Input placeholder="Ej: Motivos particulares" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={9}>
                        <Form.Item
                          {...restField}
                          name={[name, 'escuelaDestino']}
                          label="Escuela destino"
                          rules={[{ required: true, message: 'Requerida' }]}
                        >
                          <Input placeholder={desde > 1 ? 'Colegio Crecer y Ser' : 'Nombre de la escuela'} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                {errors && errors.length > 0 && <Form.ErrorList errors={errors} />}
                {fields.length < 4 && (
                  <Button
                    type="dashed"
                    onClick={() => add({ escuelaDestino: desde > 1 ? 'Colegio Crecer y Ser' : '' })}
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
  ];

  return (
    <FormModal
      open
      title={registrarBaja ? 'Registrar baja y cursada' : (isInicial ? 'Períodos evaluables e informes' : 'Bimestres evaluables')}
      icon={<CalendarOutlined />}
      description={snapshot ? `${snapshot.nombreCompleto} · ${snapshot.curso} · ${snapshot.ciclo}` : undefined}
      onCancel={saving ? undefined : onClose}
      closable={!saving}
      mask={{ closable: !saving }}
      width={640}
      onOk={() => void save()}
      okText={registrarBaja ? 'Registrar baja' : 'Confirmar cursada'}
      cancelText="Cancelar"
      confirmLoading={saving}
      okButtonProps={{ disabled: !snapshot || uncertain }}
      cancelButtonProps={{ disabled: saving }}
    >
      <Space orientation="vertical" size="middle" className={ui.fullWidth}>
        <Alert
          type="info"
          showIcon
          title={
            isInicial
              ? 'La fecha administrativa y el período evaluable son independientes.'
              : 'La fecha administrativa y el bimestre evaluable son independientes.'
          }
          description={
            isInicial
              ? 'Incluí el último período que corresponde evaluar, aunque el alumno ya se haya retirado. Fuera del rango no se exigirán informes nuevos.'
              : 'Incluí el último bimestre que corresponde evaluar, aunque el alumno ya se haya retirado. Fuera del rango no se exigirán boletines nuevos.'
          }
        />
        {error && (
          <Alert
            type="error"
            showIcon
            title={error}
            action={
              <Button disabled={saving} onClick={() => { setSnapshot(undefined); setReload(value => value + 1); }}>
                Volver a cargar
              </Button>
            }
          />
        )}
        {!snapshot && !error && <Spin />}
        <Form form={form} layout="vertical" disabled={saving || !snapshot || uncertain}>
          <Form.Item name="sinCursada" valuePropName="checked">
            <Checkbox>{isInicial ? 'No cursó ningún período' : 'No cursó ningún bimestre'}</Checkbox>
          </Form.Item>
          {!sinCursada && (
            <>
              <Form.Item
                name="desde"
                label={isInicial ? 'Primer período evaluable' : 'Primer bimestre evaluable'}
                rules={[{ required: true, message: isInicial ? 'Seleccioná el primer período.' : 'Seleccioná el primer bimestre.' }]}
              >
                <Select options={[1, 2, 3, 4].map(value => ({ value, label: isInicial ? `Período ${value}` : `${value}.º bimestre` }))} />
              </Form.Item>
              {desde > 1 && (
                <Alert
                  type="info"
                  showIcon
                  title="Documentación del colegio anterior"
                  description={
                    isInicial
                      ? 'Al confirmar esta cursada, confirmás que la información de los períodos anteriores consta en el legajo. Los informes institucionales lo reflejarán en sus observaciones.'
                      : 'Al confirmar esta cursada, confirmás que la información de los bimestres anteriores consta en el legajo. El boletín lo indicará en sus observaciones.'
                  }
                />
              )}
              <Form.Item
                name="hasta"
                label={isInicial ? 'Último período evaluable' : 'Último bimestre evaluable'}
                dependencies={['desde']}
                rules={[
                  { required: true, message: isInicial ? 'Seleccioná el último período.' : 'Seleccioná el último bimestre.' },
                  ({ getFieldValue }) => ({
                    validator: (_, value) =>
                      !value || value >= getFieldValue('desde')
                        ? Promise.resolve()
                        : Promise.reject(new Error('El último no puede ser anterior al primero.')),
                  }),
                ]}
              >
                <Select options={[1, 2, 3, 4].map(value => ({ value, label: isInicial ? `Período ${value}` : `${value}.º bimestre` }))} />
              </Form.Item>
            </>
          )}
          {recordWithdrawal && (
            <Form.Item
              name="fechaEgreso"
              label="Fecha administrativa de baja"
              rules={[{ required: true, message: 'Indicá la fecha de baja.' }]}
            >
              <DatePicker format="DD/MM/YYYY" className={ui.fullWidth} />
            </Form.Item>
          )}
          {!sinCursada && (
            <Collapse
              activeKey={activePanels}
              onChange={(keys) => setExpandedKeys(typeof keys === 'string' ? [keys] : keys)}
              items={adminPanelItems}
            />
          )}
        </Form>
        {!!snapshot?.bimestresConDatos.length && (
          <Typography.Text type="secondary">
            {isInicial ? 'Períodos con datos, cierres o informes' : 'Bimestres con notas, cierres o entregas'}: {snapshot.bimestresConDatos.join(', ')}. Deben conservarse dentro del rango.
          </Typography.Text>
        )}
        {snapshot?.cursada.estado === 'PENDIENTE' && (
          <Alert
            type="warning"
            title="Cursada por confirmar"
            description={
              isInicial
                ? 'La confirmación es necesaria antes de una nueva emisión o entrega de informes del curso.'
                : 'La confirmación es necesaria antes de una nueva entrega del curso.'
            }
          />
        )}
      </Space>
    </FormModal>
  );
};
