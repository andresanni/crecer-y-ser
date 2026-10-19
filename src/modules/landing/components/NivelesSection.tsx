import React from 'react';
import { Row, Col, Typography, Card } from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { landingData } from '../data/landingData';

const { Title, Paragraph } = Typography;

const InicialLevelIcon: React.FC = () => (
  <svg
    viewBox="0 0 36 36"
    width="34"
    height="34"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="26.5" cy="9.5" r="3.2" fill="currentColor" fillOpacity="0.18" />
    <path d="M26.5 3.5V4.8M26.5 14.2V15.5M20.5 9.5H21.8M31.2 9.5H32.5M22.3 5.3L23.2 6.2M29.8 12.8L30.7 13.7M30.7 5.3L29.8 6.2M23.2 12.8L22.3 13.7" />
    <rect x="10.5" y="10" width="9.5" height="9.5" rx="2.4" fill="currentColor" fillOpacity="0.14" />
    <rect x="5" y="19.5" width="9.5" height="9.5" rx="2.4" fill="currentColor" fillOpacity="0.14" />
    <rect x="16" y="19.5" width="9.5" height="9.5" rx="2.4" fill="currentColor" fillOpacity="0.14" />
    <path d="M15.25 13.3V16.2M13.8 14.75H16.7" />
    <circle cx="9.75" cy="24.25" r="1.15" fill="currentColor" stroke="none" />
    <path d="M19.5 25.3L20.75 23.1L22 25.3H19.5Z" fill="currentColor" />
  </svg>
);

const PrimariaLevelIcon: React.FC = () => (
  <svg
    viewBox="0 0 36 36"
    width="34"
    height="34"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path
      d="M18 11.5C15.4 9.5 11.5 8.8 6.5 9.2C5.7 9.3 5 10 5 10.8V25.6C5 26.5 5.8 27.2 6.7 27.1C11.4 26.7 15.2 27.4 18 29.3C20.8 27.4 24.6 26.7 29.3 27.1C30.2 27.2 31 26.5 31 25.6V10.8C31 10 30.3 9.3 29.5 9.2C24.5 8.8 20.6 9.5 18 11.5Z"
      fill="currentColor"
      fillOpacity="0.12"
    />
    <path d="M18 11.5V29.3" />
    <path d="M9.5 14.5H14M9.5 18.5H13.5" />
    <path d="M22 14.5H26.5M22.5 18.5H26.5" />
    <path
      d="M18 4L19.1 6.4L21.5 7.5L19.1 8.6L18 11L16.9 8.6L14.5 7.5L16.9 6.4L18 4Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

const levelIconMap = {
  smile: <InicialLevelIcon />,
  team: <PrimariaLevelIcon />,
  global: <PrimariaLevelIcon />,
};

export const NivelesSection: React.FC = () => {
  return (
    <section id="niveles" className="landing-section niveles-section">
      <div className="landing-section-inner">
        <div className="section-header text-center">
          <Title level={2} className="section-title">
            Niveles <span className="section-title-accent">Educativos</span>
          </Title>
          <Paragraph className="section-description">
            Un camino articulado desde la primera infancia hasta la preparación para los estudios secundarios y la vida ciudadana.
          </Paragraph>
        </div>

        <Row gutter={[36, 32]} justify="center">
          {landingData.niveles.map((nivel) => (
            <Col key={nivel.id} xs={24} sm={20} md={12} lg={11}>
              <Card
                className={`level-card level-card-${nivel.id}`}
                bordered={false}
                cover={
                  nivel.image ? (
                    <div className="level-card-media">
                      <img
                        src={nivel.image}
                        alt={nivel.imageAlt || nivel.title}
                        className="level-card-img"
                        loading="lazy"
                      />
                      <div className={`level-card-fade level-fade-${nivel.id}`} />
                    </div>
                  ) : undefined
                }
              >
                <div className={`level-icon level-icon-${nivel.id}`}>
                  {levelIconMap[nivel.iconName]}
                </div>

                <div className="level-card-header-block">
                  <Title level={3} className="level-card-title">{nivel.title}</Title>
                  <Paragraph className="level-card-text">
                    {nivel.description}
                  </Paragraph>
                </div>

                <div className={`level-features-box level-features-${nivel.id}`}>
                  <ul className="level-list">
                    {nivel.features.map((feature, i) => (
                      <li key={i}>
                        <CheckCircleOutlined />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="level-card-footer">
                  <a href="#contacto" className={`level-card-cta level-cta-${nivel.id}`}>
                    <span>Consultar vacantes de {nivel.badge}</span>
                    <ArrowRightOutlined className="level-cta-arrow" />
                  </a>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
};
