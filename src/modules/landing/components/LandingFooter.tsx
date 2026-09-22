import React from 'react';
import { Typography } from 'antd';
import { landingData } from '../data/landingData';

const { Text } = Typography;

interface LandingFooterProps {
  onGoToApp?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = () => {
  return (
    <footer className="landing-footer">
      <div className="landing-section-inner">
        <div className="footer-main-row">
          <a href="#hero" className="footer-logo-link" aria-label={`Colegio ${landingData.schoolName}`}>
            <div className="footer-logo">
              <img src="/logo.png" alt={landingData.schoolName} />
            </div>
          </a>

          <ul className="footer-links-minimal">
            <li><a href="#propuesta">Propuesta</a></li>
            <li><a href="#niveles">Niveles</a></li>
            <li><a href="#novedades">Novedades</a></li>
            <li><a href="#contacto">Contacto</a></li>
          </ul>
        </div>

        <div className="footer-bottom-minimal">
          <Text className="footer-copyright-text">
            © {new Date().getFullYear()} Colegio {landingData.schoolName} {landingData.schoolCode}. Todos los derechos reservados.
          </Text>
        </div>
      </div>
    </footer>
  );
};

