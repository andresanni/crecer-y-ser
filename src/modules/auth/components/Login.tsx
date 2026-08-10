import React, { useState } from 'react';
import { Form, Input, Button, App as AntdApp, Typography, Space, Tag } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
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
      navigate('/');
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
          <div className="brand">
            <span className="brand-mark">CyS</span>
            <span className="brand-copy">
              <strong>Crecer y Ser</strong>
              <span>Gestión Educativa</span>
            </span>
          </div>

          <div style={{ margin: '32px 0' }}>
            <Tag
              icon={<ThunderboltOutlined />}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              Plataforma Institucional 2.0
            </Tag>

            <h1>Todo lo importante, más claro.</h1>
            <p>Una forma simple, moderna y cercana de acompañar la gestión y trayectoria de cada estudiante.</p>

            <Space direction="vertical" size={12} style={{ marginTop: 28 }}>
              <Space size={10} style={{ color: '#ccfbf1', fontSize: 13 }}>
                <CheckCircleOutlined style={{ color: '#34d399' }} />
                <span>Sincronización de registros en tiempo real</span>
              </Space>
              <Space size={10} style={{ color: '#ccfbf1', fontSize: 13 }}>
                <CheckCircleOutlined style={{ color: '#34d399' }} />
                <span>Control de legajos y datos estudiantiles</span>
              </Space>
              <Space size={10} style={{ color: '#ccfbf1', fontSize: 13 }}>
                <SafetyCertificateOutlined style={{ color: '#34d399' }} />
                <span>Acceso seguro mediante autenticación encriptada</span>
              </Space>
            </Space>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 16 }}>
            <span style={{ color: '#99f6e4', fontSize: 12 }}>© 2026 Crecer y Ser</span>
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
                prefix={<MailOutlined style={{ color: '#0d9488' }} />}
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
                prefix={<LockOutlined style={{ color: '#0d9488' }} />}
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
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #10b981)',
                  border: 'none',
                  boxShadow: '0 6px 20px rgba(13, 148, 136, 0.35)',
                  height: 48,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Ingresar al sistema
              </Button>
            </Form.Item>
          </Form>
        </section>
      </div>
    </div>
  );
};

