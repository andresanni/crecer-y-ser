import React, { useState } from 'react';
import { Button, Drawer } from 'antd';
import { ArrowRightOutlined, LockOutlined, MenuOutlined } from '@ant-design/icons';
import { landingData } from '../data/landingData';

interface LandingHeaderProps {
  onGoToApp: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ onGoToApp }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="landing-header">
        <div className="landing-nav-inner">
          <a
            href="#inicio"
            className="landing-brand"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <img
              src="/escudo-circular.png"
              alt={`Escudo del ${landingData.heroTitle.institution}`}
              className="landing-brand-crest"
              width="46"
              height="46"
            />
            <div className="landing-brand-lockup">
              <span className="landing-brand-name">{landingData.heroTitle.institution}</span>
              <span className="landing-brand-meta">
                {landingData.tagline} · {landingData.schoolCode}
              </span>
            </div>
          </a>

          <nav className="landing-desktop-nav" aria-label="Navegación principal">
            <a href="#niveles">Niveles Educativos</a>
            {landingData.propuestas.length > 0 && <a href="#propuesta">Propuesta Pedagógica</a>}
            {landingData.novedades.length > 0 && <a href="#novedades">Novedades</a>}
            <a href="#contacto">Admisiones y Contacto</a>
          </nav>

          <div className="landing-header-actions">
            <a
              href={landingData.acadeu.url}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-header-acadeu-link"
              title={landingData.acadeu.description}
            >
              <img
                src="/acadeu-isotype.png"
                alt=""
                className="landing-header-acadeu-icon"
                width="18"
                height="18"
              />
              <span>Acadeu</span>
              <ArrowRightOutlined className="landing-header-ext-arrow" />
            </a>

            <Button
              type="default"
              icon={<LockOutlined />}
              onClick={onGoToApp}
              className="landing-staff-btn"
            >
              Gestión Directiva
            </Button>

            <Button
              className="landing-mobile-menu-btn"
              type="text"
              aria-label="Abrir menú de navegación"
              icon={<MenuOutlined style={{ fontSize: 20 }} />}
              onClick={() => setMobileMenuOpen(true)}
            />
          </div>
        </div>
      </header>

      <Drawer
        title="Colegio Crecer y Ser · A-1134"
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
      >
        <div className="landing-mobile-nav">
          <a href="#niveles" onClick={() => setMobileMenuOpen(false)}>Niveles Educativos</a>
          {landingData.propuestas.length > 0 && (
            <a href="#propuesta" onClick={() => setMobileMenuOpen(false)}>Propuesta Pedagógica</a>
          )}
          {landingData.novedades.length > 0 && (
            <a href="#novedades" onClick={() => setMobileMenuOpen(false)}>Novedades</a>
          )}
          <a href="#contacto" onClick={() => setMobileMenuOpen(false)}>Admisiones y Contacto</a>
          <a
            href={landingData.acadeu.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
          >
            Plataforma Acadeu
          </a>
          <div style={{ marginTop: 20 }}>
            <Button
              type="default"
              block
              size="large"
              icon={<LockOutlined />}
              onClick={() => {
                setMobileMenuOpen(false);
                onGoToApp();
              }}
              className="landing-staff-btn-mobile"
            >
              Gestión Directiva
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
};
