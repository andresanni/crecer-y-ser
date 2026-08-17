import React, { useState } from 'react';
import { Button, Drawer } from 'antd';
import { LoginOutlined, MenuOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useTheme } from '../../../core/themeContext';
import { landingData } from '../data/landingData';

interface LandingHeaderProps {
  onGoToApp: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ onGoToApp }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="landing-header">
        <div className="landing-nav-inner">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="landing-logo-wrapper">
              <img src="/logo.png" alt={`${landingData.schoolName} Logo`} className="landing-logo-img" />
            </div>
            <div className="landing-brand-text">
              <span className="landing-brand-name">{landingData.schoolName}</span>
              <span className="landing-brand-sub">{landingData.schoolCode}</span>
            </div>
          </div>

          <nav className="landing-desktop-nav">
            <a href="#propuesta">Propuesta</a>
            <a href="#niveles">Niveles Educativos</a>
            <a href="#novedades">Novedades</a>
            <a href="#contacto">Contacto</a>
          </nav>

          <div className="landing-header-actions">
            <Button
              type="text"
              shape="circle"
              icon={isDarkMode ? <SunOutlined style={{ color: '#fbbf24', fontSize: 18 }} /> : <MoonOutlined style={{ color: '#64748b', fontSize: 18 }} />}
              onClick={toggleTheme}
              aria-label="Cambiar tema visual"
              style={{ marginRight: 8 }}
            />

            <Button
              type="primary"
              icon={<LoginOutlined />}
              onClick={onGoToApp}
              className="btn-primary-gradient landing-cta-btn"
            >
              Entrar a la App
            </Button>

            <Button
              className="landing-mobile-menu-btn"
              type="text"
              icon={<MenuOutlined style={{ fontSize: 20 }} />}
              onClick={() => setMobileMenuOpen(true)}
            />
          </div>
        </div>
      </header>

      <Drawer
        title="Menú Institucional"
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        className={isDarkMode ? 'dark-drawer' : ''}
      >
        <div className="landing-mobile-nav">
          <a href="#propuesta" onClick={() => setMobileMenuOpen(false)}>Propuesta Pedagógica</a>
          <a href="#niveles" onClick={() => setMobileMenuOpen(false)}>Niveles Educativos</a>
          <a href="#novedades" onClick={() => setMobileMenuOpen(false)}>Novedades</a>
          <a href="#contacto" onClick={() => setMobileMenuOpen(false)}>Contacto</a>
          <div style={{ marginTop: 24 }}>
            <Button
              type="primary"
              block
              size="large"
              icon={<LoginOutlined />}
              onClick={() => {
                setMobileMenuOpen(false);
                onGoToApp();
              }}
              className="btn-primary-gradient"
            >
              Entrar a la App
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
};
