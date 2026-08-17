import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../core/themeContext';
import { LandingHeader } from './components/LandingHeader';
import { LandingHero } from './components/LandingHero';
import { PropuestaSection } from './components/PropuestaSection';
import { NivelesSection } from './components/NivelesSection';
import { NovedadesSection } from './components/NovedadesSection';
import { ContactoSection } from './components/ContactoSection';
import { LandingFooter } from './components/LandingFooter';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const handleGoToApp = () => {
    navigate('/app');
  };

  return (
    <div className={`landing-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <LandingHeader onGoToApp={handleGoToApp} />
      <LandingHero onGoToApp={handleGoToApp} />
      <PropuestaSection />
      <NivelesSection />
      <NovedadesSection />
      <ContactoSection />
      <LandingFooter onGoToApp={handleGoToApp} />
    </div>
  );
};
