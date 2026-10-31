import React, { useState } from 'react';
import { App, Button, Form, Input } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useModalSessionKey } from '../../../shared/hooks/useModalSessionKey';
import { FormModal } from '../../../shared/components/FormModal';
import { focusFirstFormError } from '../../../shared/utils/formValidation';
import { informesService } from '../services/informes.service';

interface EditarDocenteInformeModalProps {
  open: boolean;
  instanciaId: string | null;
  docenteNombreInicial: string;
  docenteApellidoInicial: string;
  expectedRevision?: number | null;
  onClose: () => void;
  onSaved: (revision: number) => void;
}

interface DocenteFormValues {
  docenteNombre: string;
  docenteApellido: string;
}

export const EditarDocenteInformeModal: React.FC<EditarDocenteInformeModalProps> = (props) => {
  const sessionKey = useModalSessionKey(props.open);
  return (
    <EditarDocenteInformeModalSession
      key={`${sessionKey}:${props.instanciaId}:${props.docenteNombreInicial}:${props.docenteApellidoInicial}`}
      {...props}
    />
  );
};

const EditarDocenteInformeModalSession: React.FC<EditarDocenteInformeModalProps> = ({
  open,
  instanciaId,
  docenteNombreInicial,
  docenteApellidoInicial,
  expectedRevision,
  onClose,
  onSaved,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<DocenteFormValues>();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: DocenteFormValues) => {
    if (!instanciaId) return;
    try {
      setSaving(true);
      const res = await informesService.updateDocenteNombre(
        instanciaId,
        values.docenteNombre.trim(),
        values.docenteApellido.trim(),
        expectedRevision ?? undefined,
      );
      message.success('Datos de la docente actualizados');
      onSaved(res.instancia.revision);
      onClose();
    } catch (err) {
      console.error(err);
      message.error('No se pudieron actualizar los datos de la docente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      onCancel={onClose}
      width={480}
      title="Editar datos de la docente"
      icon={<UserOutlined />}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <Form<DocenteFormValues>
        form={form}
        layout="vertical"
        requiredMark
        initialValues={{
          docenteNombre: docenteNombreInicial,
          docenteApellido: docenteApellidoInicial,
        }}
        onFinish={handleSubmit}
        onFinishFailed={(error) => focusFirstFormError(form, error)}
      >
        <Form.Item
          label="Nombre(s) de la docente"
          name="docenteNombre"
          rules={[{ required: true, whitespace: true, message: 'Ingrese el nombre de la docente' }]}
        >
          <Input placeholder="Ej. María Florencia" />
        </Form.Item>
        <Form.Item
          label="Apellido(s) de la docente"
          name="docenteApellido"
          rules={[{ required: true, whitespace: true, message: 'Ingrese el apellido de la docente' }]}
        >
          <Input placeholder="Ej. Rodríguez" />
        </Form.Item>
      </Form>
    </FormModal>
  );
};
