import React, { useState } from 'react';
import { Row, Col, Typography, Card, Form, Input, Select, Button, App as AntdApp } from 'antd';
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { landingData } from '../data/landingData';
import { sendContactInquiry } from '../services/contactService';

const { Title, Text } = Typography;

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
    <section id="contacto" className="landing-section contacto-section">
      <div className="landing-section-inner">
        <Row gutter={[44, 40]} align="top">
          <Col xs={24} lg={10}>
            <div className="contact-info-block">
              <Title level={2} className="contact-title">
                ¿Querés conocer <span className="section-title-accent">nuestro colegio?</span>
              </Title>

              <div className="contact-list">
                <a
                  href="https://maps.google.com/?q=Av+Olivera+1536,+CABA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-item-card contact-item-interactive"
                >
                  <div className="contact-icon"><EnvironmentOutlined /></div>
                  <div className="contact-item-body">
                    <Text className="contact-item-label">Dirección Institucional</Text>
                    <Text className="contact-item-value">{landingData.contacto.direccion}</Text>
                    <Text className="contact-item-meta">Parque Avellaneda · Ver ubicación en mapa</Text>
                  </div>
                  <ArrowRightOutlined className="contact-item-ext-arrow" />
                </a>

                <div className="contact-item-card">
                  <div className="contact-icon"><PhoneOutlined /></div>
                  <div className="contact-item-body">
                    <Text className="contact-item-label">Teléfonos de Atención</Text>
                    <Text className="contact-item-value">{landingData.contacto.telefonos}</Text>
                    <Text className="contact-item-meta">Líneas directas de secretaría administrativa</Text>
                  </div>
                </div>

                <a
                  href={`mailto:${landingData.contacto.email}`}
                  className="contact-item-card contact-item-interactive"
                >
                  <div className="contact-icon"><MailOutlined /></div>
                  <div className="contact-item-body">
                    <Text className="contact-item-label">Correo Electrónico</Text>
                    <Text className="contact-item-value">{landingData.contacto.email}</Text>
                    <Text className="contact-item-meta">Escribinos directamente desde tu correo</Text>
                  </div>
                  <ArrowRightOutlined className="contact-item-ext-arrow" />
                </a>

                <div className="contact-item-card">
                  <div className="contact-icon"><ClockCircleOutlined /></div>
                  <div className="contact-item-body">
                    <Text className="contact-item-label">Horario de Secretaría</Text>
                    <Text className="contact-item-value">{landingData.contacto.horario}</Text>
                    <Text className="contact-item-meta">Atención presencial y telefónica</Text>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          <Col xs={24} lg={14}>
            <Card className="contact-form-card">
              <div className="contact-form-header">
                <div className="contact-form-badge">
                  <span className="contact-form-badge-dot" aria-hidden="true" />
                  <span>Inscripciones Abiertas · Ciclo Lectivo 2027</span>
                </div>
                <Title level={3} className="contact-form-title">Solicitar Información / Entrevista</Title>
                <Text className="contact-form-subtitle">
                  Dejanos tus datos y nuestro equipo de secretaría se pondrá en contacto a la brevedad.
                </Text>
              </div>

              <Form
                form={contactForm}
                layout="vertical"
                onFinish={handleContactSubmit}
                requiredMark={false}
                className="contact-ant-form"
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
                  <Input.TextArea rows={4} placeholder="Contanos la edad o grado del alumno/a y cualquier consulta que quieras realizar..." maxLength={2000} showCount />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={formLoading}
                  disabled={formLoading}
                  icon={<SendOutlined />}
                  className="btn-primary-gradient contact-submit-btn"
                >
                  Enviar Consulta a Secretaría
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    </section>
  );
};


