import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Tag } from 'antd';
import {
  ArrowRightOutlined,
  BookOutlined,
  CheckCircleOutlined,
  InstagramOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { landingData } from '../data/landingData';

const { Title, Paragraph } = Typography;

interface LandingHeroProps {
  onGoToApp?: () => void;
}

const TARGET_WORD = 'vida';

export const LandingHero: React.FC<LandingHeroProps> = () => {
  const [displayedWord, setDisplayedWord] = useState(TARGET_WORD);
  const [isHandwritten, setIsHandwritten] = useState(false);
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      setShowCursor(true);

      let currentIndex = TARGET_WORD.length;

      const deleteInterval = setInterval(() => {
        currentIndex--;
        setDisplayedWord(TARGET_WORD.slice(0, currentIndex));

        if (currentIndex <= 0) {
          clearInterval(deleteInterval);
          setIsHandwritten(true);

          setTimeout(() => {
            let writeIndex = 0;
            const writeInterval = setInterval(() => {
              writeIndex++;
              setDisplayedWord(TARGET_WORD.slice(0, writeIndex));

              if (writeIndex >= TARGET_WORD.length) {
                clearInterval(writeInterval);

                setTimeout(() => {
                  setShowCursor(false);
                }, 1200);
              }
            }, 160);
          }, 350);
        }
      }, 110);
    }, 2700);

    return () => {
      clearTimeout(initialDelay);
    };
  }, []);

  return (
    <section className="landing-hero">
      <div className="hero-backdrop" />

      <div className="hero-bleed-backdrop" aria-hidden="true">
        <img
          src="/colegio-fachada.jpg"
          alt=""
          className="hero-bleed-img"
          fetchPriority="high"
        />
        <div className="hero-bleed-gradient" />
      </div>

      <div className="landing-section-inner hero-content">
        <Row gutter={[48, 40]} align="middle">
          <Col xs={24} lg={13}>
            <div className="hero-text-block">
              <Tag className="hero-pill-badge" icon={<StarOutlined style={{ color: '#fbbf24' }} />}>
                {landingData.badgeText}
              </Tag>
              <Title level={1} className="hero-title">
                <span className="hero-title-institution">{landingData.heroTitle.institution}</span>
                <span className="hero-title-motto" aria-label={`${landingData.heroTitle.prefix}${landingData.heroTitle.gradient}`}>
                  {landingData.heroTitle.prefix}
                  <span className="hero-animated-wrapper">
                    <span className="hero-animated-ghost" aria-hidden="true">
                      {TARGET_WORD}
                    </span>
                    <span
                      className={`hero-animated-text ${isHandwritten ? 'handwritten' : 'standard'}`}
                      aria-hidden="true"
                    >
                      <span className="text-gradient">{displayedWord}&#8203;</span>
                      {showCursor && <span className="hero-animated-cursor" />}
                    </span>
                  </span>
                </span>
              </Title>
              <Paragraph className="hero-subtitle">
                {landingData.heroSubtitle}
              </Paragraph>

              <div className="hero-cta-container">
                <div className="hero-platforms-pair">
                  <a
                    href={landingData.acadeu.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-action-btn hero-acadeu-btn"
                    title="Ingresar a la Plataforma Escolar Acadeu"
                  >
                    <span className="hero-btn-badge">
                      <img src="/acadeu-isotype.png" alt="Acadeu" className="acadeu-isotype-img" />
                    </span>
                    <span className="hero-btn-label">{landingData.acadeu.label}</span>
                    <ArrowRightOutlined className="hero-btn-icon" />
                  </a>

                  <a
                    href={landingData.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-action-btn hero-instagram-btn"
                    title={`Instagram Oficial del ${landingData.heroTitle.institution}`}
                  >
                    <span className="hero-btn-badge">
                      <InstagramOutlined className="hero-instagram-icon" />
                    </span>
                    <span className="hero-btn-label">{landingData.instagram.label}</span>
                    <ArrowRightOutlined className="hero-btn-icon" />
                  </a>
                </div>

                <div className="hero-secondary-row">
                  <a
                    href="#propuesta"
                    className="hero-propuesta-btn"
                  >
                    <BookOutlined className="hero-propuesta-icon" />
                    <span>Conocer Propuesta</span>
                    <ArrowRightOutlined className="hero-propuesta-arrow" />
                  </a>
                </div>
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
            <div className="hero-escudo-showcase">
              <div className="hero-escudo-wrapper">
                <div className="hero-escudo-halo" />
                <img
                  src="/escudo-circular.png"
                  alt={`Escudo Oficial del ${landingData.schoolName}`}
                  className="hero-escudo-img"
                  width="270"
                  height="270"
                />
              </div>

              <div className="hero-escudo-badge">
                <div className="hero-metric-figure">
                  <BookOutlined />
                </div>
                <div className="hero-metric-meta">
                  <span className="hero-metric-label">Nivel Inicial y Primario</span>
                  <span className="hero-metric-sub">{landingData.schoolCode} · Educación Oficial</span>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </section>
  );
};
