import React from 'react';
import { Typography } from 'antd';
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  InstagramOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { landingData } from '../data/landingData';

const { Text } = Typography;

interface LandingFooterProps {
  onGoToApp?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onGoToApp }) => {
  return (
    <footer className="landing-footer">
      <div className="landing-section-inner">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <a href="#inicio" className="footer-brand-lockup" aria-label={`Colegio ${landingData.schoolName}`}>
              <img
                src="/escudo-circular.png"
                alt={`Escudo Colegio ${landingData.schoolName}`}
                className="footer-brand-crest"
              />
              <div className="footer-brand-text">
                <span className="footer-brand-name">Colegio {landingData.schoolName}</span>
                <span className="footer-brand-code">
                  Instituto Incorporado a la Enseñanza Oficial · {landingData.schoolCode}
                </span>
              </div>
            </a>

            <div className="footer-community-links">
              <a
                href={landingData.acadeu.url}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-pill"
              >
                <img src="/acadeu-isotype.png" alt="" aria-hidden="true" className="footer-acadeu-icon" />
                <span>{landingData.acadeu.label}</span>
                <ArrowRightOutlined className="footer-ext-arrow" />
              </a>

              <a
                href={landingData.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-pill"
              >
                <InstagramOutlined className="footer-ig-icon" />
                <span>{landingData.instagram.handle}</span>
                <ArrowRightOutlined className="footer-ext-arrow" />
              </a>
            </div>
          </div>

          <div className="footer-links-col">
            <span className="footer-col-heading">Secciones del Sitio</span>
            <ul className="footer-nav-list">
              <li><a href="#inicio">Inicio Institucional</a></li>
              <li><a href="#niveles">Niveles Educativos</a></li>
              <li><a href="#propuesta">Propuesta Pedagógica</a></li>
              {landingData.novedades.length > 0 && <li><a href="#novedades">Novedades</a></li>}
              <li><a href="#contacto">Admisiones y Contacto</a></li>
            </ul>

            {onGoToApp && (
              <div className="footer-staff-access">
                <button type="button" onClick={onGoToApp} className="footer-staff-link">
                  <LockOutlined />
                  <span>Acceso Gestión Directiva</span>
                </button>
              </div>
            )}
          </div>

          <div className="footer-contact-col">
            <span className="footer-col-heading">Secretaría y Ubicación</span>
            <ul className="footer-contact-list">
              <li>
                <EnvironmentOutlined className="footer-contact-icon" />
                <div>
                  <span className="footer-contact-main">{landingData.contacto.direccion}</span>
                  <span className="footer-contact-sub">Parque Avellaneda, CABA</span>
                </div>
              </li>
              <li>
                <PhoneOutlined className="footer-contact-icon" />
                <div>
                  <span className="footer-contact-main">{landingData.contacto.telefonos}</span>
                  <span className="footer-contact-sub">Atención telefónica</span>
                </div>
              </li>
              <li>
                <MailOutlined className="footer-contact-icon" />
                <div>
                  <a href={`mailto:${landingData.contacto.email}`} className="footer-contact-link">
                    {landingData.contacto.email}
                  </a>
                </div>
              </li>
              <li>
                <ClockCircleOutlined className="footer-contact-icon" />
                <div>
                  <span className="footer-contact-main">{landingData.contacto.horario}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <Text className="footer-copyright-text">
            © {new Date().getFullYear()} Colegio {landingData.schoolName} ({landingData.schoolCode}). Todos los derechos reservados.
          </Text>
          <Text className="footer-bottom-meta">
            {landingData.tagline} · Ciudad Autónoma de Buenos Aires
          </Text>
        </div>
      </div>
    </footer>
  );
};


