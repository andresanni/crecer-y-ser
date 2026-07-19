import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Button } from 'antd';
import dayjs from 'dayjs';
import type { Alumno } from '../models/alumno.model';

export interface AlumnoFormValues {
  numeroLegajo: string;
  dni: string;
  apellidos: string;
  nombres: string;
  fechaNacimiento: dayjs.Dayjs | null;
}

interface AlumnoFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: AlumnoFormValues, originalUpdatedDate?: string) => Promise<void>;
  initialValues?: Alumno | null;
}

export const AlumnoFormModal: React.FC<AlumnoFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialValues,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue({
        numeroLegajo: initialValues.numeroLegajo,
        dni: initialValues.dni,
        apellidos: initialValues.apellidos,
        nombres: initialValues.nombres,
        fechaNacimiento: initialValues.fechaNacimiento ? dayjs(initialValues.fechaNacimiento) : null,
      });
    } else if (visible && !initialValues) {
      form.resetFields();
    }
  }, [visible, initialValues, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit(values, initialValues?.updatedAt).then(() => {
        form.resetFields();
      });
    }).catch(info => {
      console.log('Validación fallida:', info);
    });
  };

  return (
    <Modal
      open={visible}
      title={initialValues ? 'Editar Alumno' : 'Nuevo Alumno'}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          Cancelar
        </Button>,
        <Button key="submit" type="primary" onClick={handleOk}>
          Guardar
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="alumnoForm"
      >
        <Form.Item
          name="numeroLegajo"
          label="Legajo"
          rules={[{ required: true, message: 'Por favor ingrese el legajo' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="dni"
          label="DNI"
          rules={[{ required: true, message: 'Por favor ingrese el DNI' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="apellidos"
          label="Apellidos"
          rules={[{ required: true, message: 'Por favor ingrese los apellidos' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="nombres"
          label="Nombres"
          rules={[{ required: true, message: 'Por favor ingrese los nombres' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="fechaNacimiento"
          label="Fecha de Nacimiento"
          rules={[{ required: true, message: 'Por favor seleccione la fecha de nacimiento' }]}
        >
          <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
