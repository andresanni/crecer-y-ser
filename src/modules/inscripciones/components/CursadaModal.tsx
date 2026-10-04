import { useEffect, useState } from 'react';
import { Alert, App, Button, Checkbox, DatePicker, Form, Select, Space, Spin, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ClientResponseError } from 'pocketbase';
import { focusFirstFormError } from '../../../shared/utils/formValidation';
import ui from '../../../shared/styles/ui.module.css';
import { FormModal } from '../../../shared/components/FormModal';
import { cursadaService, type CursadaSnapshot } from '../services/cursada.service';

interface Props {
  inscripcionId: string;
  registrarBaja?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Values {
  desde: number;
  hasta: number;
  sinCursada: boolean;
  fechaEgreso?: dayjs.Dayjs;
}

export const CursadaModal = ({ inscripcionId, registrarBaja = false, onClose, onSuccess }: Props) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [snapshot, setSnapshot] = useState<CursadaSnapshot>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [reload, setReload] = useState(0);
  const recordWithdrawal = registrarBaja || snapshot?.estadoAdministrativo === 'Baja';
  const desde = Form.useWatch('desde', form);
  const sinCursada = Form.useWatch('sinCursada', form);
  useEffect(() => {
    let active = true;
    cursadaService.get(inscripcionId).then((value) => {
      if (!active) return;
      setSnapshot(value);
      setError('');
      setUncertain(false);
      form.setFieldsValue({ desde: value.cursada.desde || undefined, hasta: value.cursada.hasta || undefined,
        sinCursada: value.cursada.estado === 'SIN_CURSADA', fechaEgreso: value.fechaEgreso ? dayjs(value.fechaEgreso.slice(0, 10)) : dayjs() });
    }).catch(() => { if (active) setError('No se pudo leer la cursada. Volvé a cargarla.'); });
    return () => { active = false; };
  }, [inscripcionId, reload, form]);

  const save = async () => {
    if (!snapshot || uncertain) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      await cursadaService.save(snapshot, { desde: values.sinCursada ? 0 : values.desde, hasta: values.sinCursada ? 0 : values.hasta,
        sinCursada: Boolean(values.sinCursada), registrarBaja: recordWithdrawal, fechaEgreso: values.fechaEgreso?.format('YYYY-MM-DD') || '' });
      message.success(registrarBaja ? 'Baja y bimestres evaluables registrados.' : 'Cursada confirmada.');
      onSuccess();
      onClose();
    } catch (cause) {
      if (cause && typeof cause === 'object' && 'errorFields' in cause) { focusFirstFormError(form, cause); return; }
      setError(cause instanceof ClientResponseError ? cause.response.message || 'No se pudo guardar la cursada.' : 'No se pudo confirmar el guardado. Volvé a cargar la cursada.');
      setUncertain(!(cause instanceof ClientResponseError) || cause.status === 0 || cause.status === 409 || cause.status >= 500);
    } finally { setSaving(false); }
  };

  return <FormModal open title={registrarBaja ? 'Registrar baja y cursada' : 'Bimestres evaluables'} icon={<CalendarOutlined />}
    description={snapshot ? `${snapshot.nombreCompleto} · ${snapshot.curso} · ${snapshot.ciclo}` : undefined}
    onCancel={saving ? undefined : onClose} closable={!saving} mask={{ closable: !saving }} width={560}
    onOk={() => void save()} okText={registrarBaja ? 'Registrar baja' : 'Confirmar cursada'} cancelText="Cancelar"
    confirmLoading={saving} okButtonProps={{ disabled: !snapshot || uncertain }} cancelButtonProps={{ disabled: saving }}>
    <Space orientation="vertical" size="middle" className={ui.fullWidth}>
      <Alert type="info" showIcon title="La fecha administrativa y el bimestre evaluable son independientes."
        description="Incluí el último bimestre que corresponde evaluar, aunque el alumno ya se haya retirado. Fuera del rango no se exigirán boletines nuevos." />
      {error && <Alert type="error" showIcon title={error} action={<Button disabled={saving} onClick={() => { setSnapshot(undefined); setReload(value => value + 1); }}>Volver a cargar</Button>} />}
      {!snapshot && !error && <Spin />}
      <Form form={form} layout="vertical" disabled={saving || !snapshot || uncertain}>
        <Form.Item name="sinCursada" valuePropName="checked"><Checkbox>No cursó ningún bimestre</Checkbox></Form.Item>
        {!sinCursada && <>
          <Form.Item name="desde" label="Primer bimestre evaluable" rules={[{ required: true, message: 'Seleccioná el primer bimestre.' }]}>
            <Select options={[1, 2, 3, 4].map(value => ({ value, label: `${value}.º bimestre` }))} />
          </Form.Item>
          {desde > 1 && <Alert type="info" showIcon title="Documentación del colegio anterior" description="Al confirmar esta cursada, confirmás que la información de los bimestres anteriores consta en el legajo. El boletín lo indicará en sus observaciones." />}
          <Form.Item name="hasta" label="Último bimestre evaluable" dependencies={['desde']} rules={[{ required: true, message: 'Seleccioná el último bimestre.' },
            ({ getFieldValue }) => ({ validator: (_, value) => !value || value >= getFieldValue('desde') ? Promise.resolve() : Promise.reject(new Error('El último no puede ser anterior al primero.')) })]}>
            <Select options={[1, 2, 3, 4].map(value => ({ value, label: `${value}.º bimestre` }))} />
          </Form.Item>
        </>}
        {recordWithdrawal && <Form.Item name="fechaEgreso" label="Fecha administrativa de baja" rules={[{ required: true, message: 'Indicá la fecha de baja.' }]}>
          <DatePicker format="DD/MM/YYYY" className={ui.fullWidth} />
        </Form.Item>}
      </Form>
      {!!snapshot?.bimestresConDatos.length && <Typography.Text type="secondary">Bimestres con notas, cierres o entregas: {snapshot.bimestresConDatos.join(', ')}. Deben conservarse dentro del rango.</Typography.Text>}
      {snapshot?.cursada.estado === 'PENDIENTE' && <Alert type="warning" title="Cursada por confirmar" description="La confirmación es necesaria antes de una nueva entrega del curso." />}
    </Space>
  </FormModal>;
};
