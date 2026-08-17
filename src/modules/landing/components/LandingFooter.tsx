import React from 'react';
import { Row, Col, Typography, Button, Space } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { landingData } from '../data/landingData';

const { Title, Paragraph, Text } = Typography;

interface LandingFooterProps {
  onGoToApp: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onGoToApp }) => {
  return (
    <footer className="landing-footer">
      <div className="landing-section-inner">
        <Row gutter={[32, 32]}>
          <Col xs={24} md={10}>
            <div className="footer-brand">
              <div className="footer-logo">
                <img src="/logo.png" alt={landingData.schoolName} />
              </div>
              <div>
                <Title level={4} style={{ color: '#f8fafc', margin: 0 }}>
                  Colegio {landingData.schoolName}
                </Title>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                  Establecimiento Educativo {landingData.schoolCode}
                </Text>
              </div>
            </div>
            <Paragraph style={{ color: '#94a3b8', marginTop: 14, fontSize: 13, maxWidth: 360 }}>
              Comprometidos con la educación integral, la calidez humana y el desarrollo constante de nuestros estudiantes.
            </Paragraph>
          </Col>

          <Col xs={12} md={7}>
            <Title level={5} style={{ color: '#f8fafc', marginBottom: 16 }}>Navegación</Title>
            <ul className="footer-links">
              <li><a href="#propuesta">Propuesta Pedagógica</a></li>
              <li><a href="#niveles">Niveles Educativos</a></li>
              <li><a href="#novedades">Novedades y Anuncios</a></li>
              <li><a href="#contacto">Contacto y Ubicación</a></li>
            </ul>
          </Col>

          <Col xs={12} md={7}>
            <Title level={5} style={{ color: '#f8fafc', marginBottom: 16 }}>Plataforma Digital</Title>
            <Paragraph style={{ color: '#94a3b8', fontSize: 13 }}>
              Acceso exclusivo para directivos, docentes, personal administrativo y familias.
            </Paragraph>
            <Button
              type="primary"
              icon={<LoginOutlined />}
              onClick={onGoToApp}
              className="btn-primary-gradient"
              style={{ marginTop: 8 }}
            >
              Acceder a la App
            </Button>
          </Col>
        </Row>

        <div className="footer-bottom">
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            © {new Date().getFullYear()} Colegio {landingData.schoolName} {landingData.schoolCode}. Todos los derechos reservados.
          </Text>
          <Space size="middle">
            <Button type="link" size="small" onClick={onGoToApp} style={{ color: '#38bdf8', fontSize: 12 }}>
              Gestión Institucional →
            </Button>
          </Space>
        </div>
      </div>
    </footer>
  );
};
