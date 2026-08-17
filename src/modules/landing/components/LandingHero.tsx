import React from 'react';
import { Row, Col, Typography, Space, Tag, Button } from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  LoginOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { landingData } from '../data/landingData';

const { Title, Paragraph, Text } = Typography;

interface LandingHeroProps {
  onGoToApp: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onGoToApp }) => {
  return (
    <section className="landing-hero">
      <div className="hero-backdrop" />
      <div className="landing-section-inner hero-content">
        <Row gutter={[32, 32]} align="middle">
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

              <Space size="middle" wrap className="hero-cta-group">
                <Button
                  type="primary"
                  size="large"
                  icon={<LoginOutlined />}
                  iconPosition="end"
                  onClick={onGoToApp}
                  className="btn-primary-gradient hero-btn-main"
                >
                  Acceder a la Plataforma
                </Button>

                <Button
                  size="large"
                  href="#propuesta"
                  className="hero-btn-secondary"
                >
                  Conocer Propuesta
                </Button>
              </Space>

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
            <div className="hero-visual-card">
              <div className="visual-card-glass">
                <div className="card-badge-top">
                  <SafetyCertificateOutlined style={{ color: '#10b981', fontSize: 20 }} />
                  <span>{landingData.schoolCode} — Oficial</span>
                </div>

                <div className="hero-card-header">
                  <div className="hero-card-icon">
                    <img src="/isotype.png" alt={landingData.schoolName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>{landingData.schoolName}</Title>
                    <Text type="secondary">{landingData.tagline}</Text>
                  </div>
                </div>

                <div className="hero-card-stats-grid">
                  <div className="hero-stat-box">
                    <div className="stat-value">{landingData.metrics.historyYears}</div>
                    <div className="stat-label">Años de Historia</div>
                  </div>
                  <div className="hero-stat-box">
                    <div className="stat-value">{landingData.metrics.levelsCount}</div>
                    <div className="stat-label">Niveles Educativos</div>
                  </div>
                  <div className="hero-stat-box">
                    <div className="stat-value">{landingData.metrics.commitmentPercentage}</div>
                    <div className="stat-label">Compromiso</div>
                  </div>
                  <div className="hero-stat-box">
                    <div className="stat-value">{landingData.metrics.platformVersion}</div>
                    <div className="stat-label">Plataforma Web</div>
                  </div>
                </div>

                <div className="hero-app-preview-cta">
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <Text strong style={{ display: 'block', fontSize: 13 }}>¿Sos parte del colegio?</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>Ingresá a la App de gestión institucional</Text>
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      icon={<ArrowRightOutlined />}
                      onClick={onGoToApp}
                      style={{ borderRadius: 8 }}
                    >
                      Ir a la App
                    </Button>
                  </Space>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </section>
  );
};
