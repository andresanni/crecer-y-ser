import React, { useState, useEffect } from 'react';
import { Row, Col, Typography } from 'antd';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  InstagramOutlined,
  ReadOutlined,
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
    <section id="inicio" className="landing-hero">
      <div className="hero-backdrop" />

      <div className="hero-bleed-backdrop" aria-hidden="true">
        <img
          src="/Fachada-real.jpg"
          alt="Fachada del Colegio Crecer y Ser"
          className="hero-bleed-img"
          fetchPriority="high"
        />
      </div>

      <div className="landing-section-inner hero-content">
        <Row gutter={[48, 0]} className="hero-row">
          <Col xs={24} lg={13} className="hero-left-col">
            <div className="hero-text-block">
              <div className="hero-group-top">
                <div className="hero-top-meta">
                  <a
                    href="#contacto"
                    className="hero-pill-badge"
                    aria-label={`${landingData.badgeText}. Ir al formulario de contacto.`}
                  >
                    <span className="hero-badge-beacon" aria-hidden="true">
                      <span className="hero-badge-beacon-ping" />
                      <span className="hero-badge-beacon-dot" />
                    </span>
                    <span className="hero-badge-text">{landingData.badgeText}</span>
                    <ArrowRightOutlined className="hero-badge-arrow" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="hero-group-center">
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
                  <div className="hero-primary-actions">
                    <a href="#contacto" className="hero-primary-cta">
                      <span>Solicitar Entrevista</span>
                      <ArrowRightOutlined className="hero-primary-cta-arrow" />
                    </a>
                  </div>

                  <div className="hero-community-bar">
                    <div className="hero-community-links">
                      <a
                        href={landingData.acadeu.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hero-community-chip hero-chip-acadeu"
                        title="Ingresar a la Plataforma Escolar Acadeu"
                      >
                        <img
                          src="/acadeu-isotype.png"
                          alt="Acadeu"
                          className="acadeu-isotype-img"
                          width="22"
                          height="22"
                        />
                        <span>{landingData.acadeu.label}</span>
                        <ArrowRightOutlined className="hero-chip-ext-icon" />
                      </a>

                      <a
                        href={landingData.instagram.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hero-community-chip hero-chip-instagram"
                        title={`Instagram Oficial del ${landingData.heroTitle.institution}`}
                      >
                        <InstagramOutlined className="hero-chip-ig-icon" />
                        <span>{landingData.instagram.handle}</span>
                        <ArrowRightOutlined className="hero-chip-ext-icon" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-group-bottom">
                <div className="hero-institutional-strip">
                  <div className="hero-strip-stat">
                    <span className="hero-strip-icon">
                      <CalendarOutlined />
                    </span>
                    <span className="hero-strip-title">{landingData.metrics.historyYears} años</span>
                  </div>
                  <span className="hero-strip-divider" aria-hidden="true" />
                  <div className="hero-strip-stat">
                    <span className="hero-strip-icon">
                      <ReadOutlined />
                    </span>
                    <span className="hero-strip-title">Inicial y Primaria</span>
                  </div>
                  <span className="hero-strip-divider" aria-hidden="true" />
                  <div className="hero-strip-stat">
                    <span className="hero-strip-icon">
                      <EnvironmentOutlined />
                    </span>
                    <span className="hero-strip-title">{landingData.contacto.direccion}</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          <Col xs={24} lg={11} className="hero-facade-spacer" aria-hidden="true" />
        </Row>
      </div>
    </section>
  );
};
