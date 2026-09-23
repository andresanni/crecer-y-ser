import ui from '../../../shared/styles/ui.module.css';
import React, { useState } from 'react';
import { Form, Input, Button, App as AntdApp, Typography, Space } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import pb from '../../../core/pocketbase';

const { Title, Text } = Typography;

export const Login: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      await pb.collection('users').authWithPassword(values.email, values.password);
      message.success('¡Bienvenido/a de nuevo!');
      navigate('/app/alumnos');
    } catch (error) {
      console.error('Error de autenticación:', error);
      message.error('Correo electrónico o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-intro">
          <div className={ui.splitRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
              >
                <img
                  src="/isotype.png"
                  alt="Colegio Crecer y Ser"
                  className="brand-logo-img"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <strong style={{ fontSize: 17, color: '#ffffff', fontWeight: 700 }}>Crecer y Ser</strong>
                <span style={{ color: '#93c5fd', fontSize: 11, fontWeight: 500, letterSpacing: 0.3 }}>Colegio A-1134</span>
              </div>
            </div>
            <Button
              type="text"
              icon={<GlobalOutlined style={{ color: '#bfdbfe' }} />}
              onClick={() => navigate('/')}
              style={{ color: '#c8daf0ff', fontSize: 14, borderRadius: 8 }}
            >
              Volver a la Web
            </Button>
          </div>

          <div style={{ margin: '32px 0' }} className="login-intro-content">
            <h1>Nueva plataforma de gestión escolar.</h1>
            <p>Plataforma exclusiva para el personal directivo y docente del Colegio Crecer y Ser.</p>

            <Space orientation="vertical" size={12} style={{ marginTop: 28 }}>
              <Space size={10} style={{ color: '#dbeafe', fontSize: 13 }}>
                <CheckCircleOutlined style={{ color: '#60a5fa' }} />
                <span>Gestión de alumnos</span>
              </Space>
              <Space size={10} style={{ color: '#dbeafe', fontSize: 13 }}>
                <CheckCircleOutlined style={{ color: '#60a5fa' }} />
                <span>Generador de Informes y Boletines</span>
              </Space>
              <Space size={10} style={{ color: '#dbeafe', fontSize: 13 }}>
                <SafetyCertificateOutlined style={{ color: '#60a5fa' }} />
                <span>Una nueva forma de acompañar la trayectoria de cada estudiante</span>
              </Space>
            </Space>
          </div>

          <div className="login-intro-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 16 }}>
            <span style={{ color: '#93c5fd', fontSize: 12 }}>© 2026 Crecer y Ser • Colegio A-1134</span>
            <span className="pulse-dot" />
          </div>
        </section>

        <section className="login-form-pane">
          <Form
            className="login-form"
            name="loginForm"
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
          >
            <div style={{ marginBottom: 24 }}>
              <Title level={2} style={{ margin: '0 0 6px 0', fontSize: 28 }}>
                Bienvenido/a
              </Title>
              <Text type="secondary" className="form-description">
                Ingresá tus credenciales institucionales para acceder a la plataforma.
              </Text>
            </div>

            <Form.Item
              name="email"
              label="Correo electrónico"
              rules={[
                { required: true, message: 'Por favor ingresá tu correo' },
                { type: 'email', message: 'Ingresá un correo válido' },
              ]}
            >
              <Input
                size="large"
                prefix={<MailOutlined className={ui.primary} />}
                placeholder="nombre@institucion.edu.ar"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Contraseña"
              rules={[{ required: true, message: 'Por favor ingresá tu contraseña' }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined className={ui.primary} />}
                placeholder="Tu contraseña de acceso"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                icon={<ArrowRightOutlined />}
                iconPosition="end"
                className="btn-primary-gradient"
                style={{
                  height: 48,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Ingresar al sistema
              </Button>
            </Form.Item>

            <div className="login-mobile-notice">
              <InfoCircleOutlined style={{ fontSize: 15, flexShrink: 0 }} />
              <span>Plataforma institucional directiva y docente (acceso optimizado para computadoras de escritorio).</span>
            </div>
          </Form>
        </section>
      </div>
    </div>
  );
};

