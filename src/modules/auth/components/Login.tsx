import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import pb from '../../../core/pocketbase';

const { Title } = Typography;

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      await pb.collection('users').authWithPassword(values.email, values.password);
      message.success('Inicio de sesión exitoso');
      navigate('/');
    } catch (error) {
      console.error('Error de autenticación:', error);
      message.error('Correo o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>Crecer y Ser</Title>
          <p>Ingresa tus credenciales</p>
        </div>
        <Form
          name="loginForm"
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="email"
            label="Correo Electrónico"
            rules={[
              { required: true, message: 'Por favor ingresa tu correo' }, 
              { type: 'email', message: 'Ingresa un correo válido' }
            ]}
          >
            <Input size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[{ required: true, message: 'Por favor ingresa tu contraseña' }]}
          >
            <Input.Password size="large" />
          </Form.Item>
          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Ingresar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
