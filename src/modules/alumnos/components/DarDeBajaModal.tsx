import ui from '../../../shared/styles/ui.module.css';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  DatePicker,
  Button,
  Typography,
  Alert,
  Avatar,
  Tag,
  Space,
  App,
} from 'antd';
import {
  UserDeleteOutlined,
  CalendarOutlined,
  WarningOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Alumno } from '../models/alumno.model';
import { alumnoService } from '../services/alumno.service';

const { Text } = Typography;

interface DarDeBajaModalProps {
  visible: boolean;
  alumno: Alumno | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DarDeBajaModal: React.FC<DarDeBajaModalProps> = ({
  visible,
  alumno,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ fechaEgreso: dayjs.Dayjs }>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && alumno) {
      form.setFieldsValue({
        fechaEgreso: alumno.fechaEgreso ? dayjs(alumno.fechaEgreso) : dayjs(),
      });
    } else {
      form.resetFields();
    }
  }, [visible, alumno, form]);

  if (!alumno) return null;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const fechaEgresoStr = values.fechaEgreso.format('YYYY-MM-DD');
      await alumnoService.darDeBaja(alumno.id, fechaEgresoStr, alumno.inscripcionId);

      message.success(`Se registró la baja de ${alumno.apellidos}, ${alumno.nombres} con fecha ${values.fechaEgreso.format('DD/MM/YYYY')}`);
      onSuccess();
      onClose();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // Error de validación del formulario
        return;
      }
      console.error('Error al registrar baja de alumno:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error al registrar la baja del estudiante';
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const initials = `${alumno.apellidos.charAt(0)}${alumno.nombres.charAt(0)}`.toUpperCase();

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={500}
      title={
        <Space size={8} style={{ color: 'var(--cys-color-error-text)' }}>
          <UserDeleteOutlined style={{ fontSize: 18, color: 'var(--cys-color-error-text)' }} />
          <span>Registrar Baja de Estudiante</span>
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>,
        <Button
          key="submit"
          type="primary"
          danger
          icon={<UserDeleteOutlined />}
          loading={submitting}
          onClick={handleSubmit}
          className={ui.strong}
        >
          Confirmar Baja
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
        {/* Resumen del Alumno */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: "var(--cys-color-fill-quaternary)",
            border: "1px solid var(--cys-color-border-secondary)",
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <Avatar
            size={46}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              fontWeight: 700,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 14.5, color: 'var(--cys-color-text)', display: 'block' }}>
              {alumno.apellidos}, {alumno.nombres}
            </Text>
            <Space size={6} wrap style={{ marginTop: 2 }}>
              <Tag color="blue" className={ui.compactTag}>
                DNI: {alumno.dni}
              </Tag>
              {alumno.cursoNombre && (
                <Tag color="purple" className={ui.compactTag}>
                  {alumno.cursoNombre}
                </Tag>
              )}
              {alumno.numeroLegajo && (
                <Tag icon={<IdcardOutlined />} className={ui.compactTag}>
                  Legajo: {alumno.numeroLegajo}
                </Tag>
              )}
            </Space>
          </div>
        </div>

        {/* Alerta de advertencia institucional */}
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined style={{ color: "var(--cys-color-warning-text)" }} />}
          style={{ borderRadius: 10 }}
          message="Cambio de estado de cursada"
          description="Al confirmar, el estudiante pasará a estado 'Baja' con la fecha indicada. Dejará de figurar en las listas activas de calificaciones y asistencia escolar."
        />

        {/* Formulario con Fecha de Baja */}
        <Form form={form} layout="vertical">
          <Form.Item
            name="fechaEgreso"
            label={
              <span className={ui.strong}>
                <CalendarOutlined style={{ marginRight: 6, color: 'var(--cys-color-error-text)' }} />
                Fecha de Egreso / Baja
              </span>
            }
            rules={[
              { required: true, message: 'Debe ingresar la fecha de egreso/baja' },
            ]}
            extra="Fecha oficial en que el estudiante se retira de la institución."
          >
            <DatePicker
              format="DD/MM/YYYY"
              className={ui.fullWidth}
              placeholder="DD/MM/AAAA"
              allowClear={false}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
