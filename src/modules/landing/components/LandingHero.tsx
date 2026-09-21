import React from 'react';
import { Row, Col, Typography, Space, Tag, Button } from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { landingData } from '../data/landingData';

const { Title, Paragraph } = Typography;

interface LandingHeroProps {
  onGoToApp?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = () => {
  return (
    <section className="landing-hero">
      <div className="hero-backdrop" />
      <div className="landing-section-inner hero-content">
        <Row gutter={[48, 40]} align="middle">
          <Col xs={24} lg={13}>
            <div className="hero-text-block">
              <Tag className="hero-pill-badge" icon={<StarOutlined style={{ color: '#fbbf24' }} />}>
                {landingData.badgeText}
              </Tag>
              <Title level={1} className="hero-title">
                {landingData.heroTitle.prefix}
                <span className="text-gradient">{landingData.heroTitle.gradient}</span>
              </Title>
              <Paragraph className="hero-subtitle">
                {landingData.heroSubtitle}
              </Paragraph>

              <Space size="middle" wrap className="hero-cta-group" align="center">
                <a
                  href={landingData.acadeu.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-acadeu-btn"
                  title="Ingresar a la Plataforma Escolar Acadeu"
                >
                  <span className="acadeu-btn-badge">
                    <img src="/acadeu-logo.svg" alt="Acadeu" className="acadeu-logo-img" />
                  </span>
                  <span className="acadeu-btn-label">{landingData.acadeu.label}</span>
                  <ArrowRightOutlined className="acadeu-btn-icon" />
                </a>

                <Button
                  size="large"
                  href="#propuesta"
                  className="hero-btn-secondary"
                >
                  Conocer Propuesta
                </Button>
              </Space>

              <div className="hero-acadeu-info">
                <CheckCircleOutlined style={{ color: '#2563eb', fontSize: 13 }} />
                <span>{landingData.acadeu.description}</span>
              </div>

              <div className="hero-trust-list">
                {landingData.trustPoints.map((point, index) => (
                  <div key={index} className="trust-item">
                    <CheckCircleOutlined className="trust-icon" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </Col>

          <Col xs={24} lg={11}>
            <div className="hero-showcase">
              <div className="hero-visual-card">
                <div className="hero-facade-wrapper">
                  <img
                    src="/colegio-fachada.jpg"
                    alt={`Instalaciones del ${landingData.schoolName}`}
                    className="hero-facade-image"
                    fetchPriority="high"
                    width="560"
                    height="420"
                  />
                </div>

                <div className="hero-floating-badge hero-floating-badge-top">
                  <img
                    src="/isotipo.png"
                    alt={landingData.schoolName}
                    className="hero-badge-crest"
                    width="40"
                    height="40"
                  />
                  <div className="hero-badge-meta">
                    <span className="hero-badge-name">{landingData.schoolName}</span>
                    <span className="hero-badge-status">
                      <SafetyCertificateOutlined className="hero-badge-icon" />
                      {landingData.schoolCode} · Oficial
                    </span>
                  </div>
                </div>

                <div className="hero-floating-badge hero-floating-badge-bottom">
                  <div className="hero-metric-figure">
                    <span className="hero-metric-number">{landingData.metrics.historyYears}</span>
                  </div>
                  <div className="hero-metric-meta">
                    <span className="hero-metric-label">Años de Trayectoria</span>
                    <span className="hero-metric-sub">Nivel Inicial y Primario</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </section>
  );
};
