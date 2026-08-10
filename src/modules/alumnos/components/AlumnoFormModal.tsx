import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, DatePicker, Button, Row, Col, Tooltip, Typography } from 'antd';
import { IdcardOutlined, UserOutlined, CalendarOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Alumno } from '../models/alumno.model';

const { Text } = Typography;

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
  const [submitting, setSubmitting] = useState(false);

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
    form
      .validateFields()
      .then(async (values) => {
        try {
          setSubmitting(true);
          await onSubmit(values, initialValues?.updatedAt);
          form.resetFields();
        } finally {
          setSubmitting(false);
        }
      })
      .catch((info) => {
        console.log('Validación fallida:', info);
      });
  };

  return (
    <Modal
      open={visible}
      title={
        <div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700 }}>
            {initialValues ? 'Editar Ficha del Alumno' : 'Registrar Nuevo Alumno'}
          </span>
          <Text type="secondary" style={{ display: 'block', fontSize: 13, fontWeight: 400, marginTop: 2 }}>
            Complete la información requerida para el legajo institucional.
          </Text>
        </div>
      }
      className="form-modal"
      width={640}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleOk}
          className="btn-primary-gradient"
        >
          {initialValues ? 'Guardar Cambios' : 'Registrar Alumno'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" name="alumnoForm" requiredMark="optional" style={{ paddingTop: 8 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="numeroLegajo"
              label={
                <span>
                  Número de Legajo{' '}
                  <Tooltip title="Identificador único del estudiante en la institución (ej. 2026-001)">
                    <QuestionCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                  </Tooltip>
                </span>
              }
              rules={[{ required: true, message: 'Por favor ingrese el legajo' }]}
            >
              <Input prefix={<IdcardOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. 2026-001" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="dni"
              label={
                <span>
                  Número de DNI{' '}
                  <Tooltip title="Documento Nacional de Identidad sin puntos">
                    <QuestionCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                  </Tooltip>
                </span>
              }
              rules={[
                { required: true, message: 'Por favor ingrese el DNI' },
                { pattern: /^[0-9]+$/, message: 'Solo se permiten números sin puntos' },
              ]}
            >
              <Input prefix={<IdcardOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. 45123890" maxLength={10} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="apellidos"
              label="Apellidos Completo/s"
              rules={[{ required: true, message: 'Por favor ingrese los apellidos' }]}
            >
              <Input prefix={<UserOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. Pérez García" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="nombres"
              label="Nombres Completo/s"
              rules={[{ required: true, message: 'Por favor ingrese los nombres' }]}
            >
              <Input prefix={<UserOutlined style={{ color: '#0d9488' }} />} placeholder="Ej. Mateo Valentín" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="fechaNacimiento"
          label="Fecha de Nacimiento"
          rules={[{ required: true, message: 'Por favor seleccione la fecha de nacimiento' }]}
        >
          <DatePicker
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            placeholder="Seleccione la fecha"
            suffixIcon={<CalendarOutlined style={{ color: '#0d9488' }} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

