import React from 'react';
import { Row, Col, Typography, Card, Tag } from 'antd';
import { CheckCircleOutlined, GlobalOutlined, SmileOutlined, TeamOutlined } from '@ant-design/icons';
import { landingData } from '../data/landingData';

const { Title, Paragraph } = Typography;

const levelIconMap = {
  smile: <SmileOutlined />,
  team: <TeamOutlined />,
  global: <GlobalOutlined />,
};

export const NivelesSection: React.FC = () => {
  return (
    <section id="niveles" className="landing-section alt-bg">
      <div className="landing-section-inner">
        <div className="section-header text-center">
          <Tag color="cyan" className="section-tag">OFERTA ACADÉMICA</Tag>
          <Title level={2} className="section-title">Niveles Educativos</Title>
          <Paragraph className="section-description">
            Un camino articulado desde la primera infancia hasta la preparación para los estudios superiores y la vida ciudadana.
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {landingData.niveles.map((nivel) => (
            <Col key={nivel.id} xs={24} md={8}>
              <Card className={`level-card ${nivel.isFeatured ? 'featured' : ''}`}>
                <div className={`level-badge ${nivel.isFeatured ? 'featured-badge' : ''}`}>
                  {nivel.badge}
                </div>
                <div className="level-icon">
                  {levelIconMap[nivel.iconName]}
                </div>
                <Title level={3} className="level-card-title">{nivel.title}</Title>
                <Paragraph className="level-card-text">
                  {nivel.description}
                </Paragraph>
                <ul className="level-list">
                  {nivel.features.map((feature, i) => (
                    <li key={i}>
                      <CheckCircleOutlined />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
};
