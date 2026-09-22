import React, { useState } from 'react';
import { Row, Col, Typography, Card, Tag, Form, Input, Select, Button, App as AntdApp } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, MailOutlined, PhoneOutlined, SendOutlined } from '@ant-design/icons';
import { landingData } from '../data/landingData';

import { sendContactInquiry } from '../services/contactService';

const { Title, Paragraph, Text } = Typography;

export const ContactoSection: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [formLoading, setFormLoading] = useState(false);
  const [contactForm] = Form.useForm();

  const handleContactSubmit = async (values: Record<string, string>) => {
    setFormLoading(true);
    try {
      const res = await sendContactInquiry({
        nombre: values.nombre?.trim(),
        email: values.email?.trim(),
        telefono: values.telefono?.trim() || undefined,
        nivel: values.nivel as 'inicial' | 'primario',
        mensaje: values.mensaje?.trim(),
        _hp: values._hp,
      });
      message.success(res.message);
      contactForm.resetFields();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo enviar la consulta. Por favor, intentá nuevamente.';
      message.error(msg);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <section id="contacto" className="landing-section alt-bg">
      <div className="landing-section-inner">
        <Row gutter={[40, 40]}>
          <Col xs={24} lg={10}>
            <div className="contact-info-block">
              <Tag color="geekblue" className="section-tag">INFORMACIÓN DE CONTACTO</Tag>
              <Title level={2} className="contact-title">¿Querés conocer nuestro colegio?</Title>
              <Paragraph className="contact-desc">
                Comunicate con nuestra secretaría administrativa para coordinar entrevistas de admisión o solicitar información personalizada.
              </Paragraph>

              <div className="contact-list">
                <div className="contact-item">
                  <div className="contact-icon"><EnvironmentOutlined /></div>
                  <div>
                    <Text strong style={{ display: 'block' }}>Dirección Institucional</Text>
                    <Text type="secondary">{landingData.contacto.direccion}</Text>
                  </div>
                </div>

                <div className="contact-item">
                  <div className="contact-icon"><PhoneOutlined /></div>
                  <div>
                    <Text strong style={{ display: 'block' }}>Teléfonos de Atención</Text>
                    <Text type="secondary">{landingData.contacto.telefonos}</Text>
                  </div>
                </div>

                <div className="contact-item">
                  <div className="contact-icon"><MailOutlined /></div>
                  <div>
                    <Text strong style={{ display: 'block' }}>Correo Electrónico</Text>
                    <Text type="secondary">{landingData.contacto.email}</Text>
                  </div>
                </div>

                <div className="contact-item">
                  <div className="contact-icon"><ClockCircleOutlined /></div>
                  <div>
                    <Text strong style={{ display: 'block' }}>Horario de Secretaría</Text>
                    <Text type="secondary">{landingData.contacto.horario}</Text>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          <Col xs={24} lg={14}>
            <Card className="contact-form-card">
              <div style={{ marginBottom: 20 }}>
                <Title level={3} style={{ margin: '0 0 6px 0' }}>Solicitar Información / Entrevista</Title>
                <Text type="secondary">Dejanos tus datos y nos pondremos en contacto a la brevedad.</Text>
              </div>

              <Form
                form={contactForm}
                layout="vertical"
                onFinish={handleContactSubmit}
                requiredMark={false}
              >
                <Form.Item name="_hp" style={{ display: 'none' }} aria-hidden="true">
                  <Input tabIndex={-1} autoComplete="off" />
                </Form.Item>

                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="nombre"
                      label="Nombre y Apellido"
                      rules={[
                        { required: true, message: 'Por favor ingresá tu nombre y apellido' },
                        { min: 2, message: 'El nombre debe tener al menos 2 caracteres' },
                        { max: 100, message: 'El nombre no puede superar los 100 caracteres' },
                        { whitespace: true, message: 'El nombre no puede estar en blanco' },
                      ]}
                    >
                      <Input placeholder="Ej. María González" size="large" maxLength={100} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="email"
                      label="Correo Electrónico"
                      rules={[
                        { required: true, message: 'Por favor ingresá tu correo' },
                        { type: 'email', message: 'Ingresá un email válido' },
                        { max: 100, message: 'El correo no puede superar los 100 caracteres' },
                      ]}
                    >
                      <Input placeholder="nombre@correo.com" size="large" maxLength={100} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="telefono"
                      label="Teléfono / WhatsApp"
                      rules={[
                        { max: 40, message: 'El teléfono no puede superar los 40 caracteres' },
                      ]}
                    >
                      <Input placeholder="Ej. 11 5555 4444" size="large" maxLength={40} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="nivel"
                      label="Nivel de Interés"
                      rules={[
                        { required: true, message: 'Por favor seleccioná el nivel de interés' },
                      ]}
                    >
                      <Select placeholder="Seleccionar nivel" size="large">
                        <Select.Option value="inicial">Nivel Inicial (Jardín)</Select.Option>
                        <Select.Option value="primario">Nivel Primario</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="mensaje"
                  label="Consulta o Comentario"
                  rules={[
                    { required: true, message: 'Por favor ingresá tu consulta' },
                    { min: 5, message: 'La consulta debe tener al menos 5 caracteres' },
                    { max: 2000, message: 'La consulta no puede superar los 2000 caracteres' },
                  ]}
                >
                  <Input.TextArea rows={3} placeholder="Contanos tu consulta..." maxLength={2000} showCount />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={formLoading}
                  disabled={formLoading}
                  icon={<SendOutlined />}
                  className="btn-primary-gradient"
                  style={{ height: 48, marginTop: 8 }}
                >
                  Enviar Consulta
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    </section>
  );
};
