import { useEffect, useState } from 'react';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './shared/components/MainLayout';
import { AlumnoList } from './modules/alumnos/components/AlumnoList';
import { PlanillaCalificacionesPage } from './modules/boletines/components/PlanillaCalificacionesPage';
import { BoletinConfigPage } from './modules/boletines/components/BoletinConfigPage';
import { Login } from './modules/auth/components/Login';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { LandingPage } from './modules/landing/LandingPage';
import { ThemeContext } from './core/themeContext';
import './index.css';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          cssVar: { prefix: 'cys' },
          token: {
            colorPrimary: '#2563eb',
            colorInfo: '#0284c7',
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            colorBgBase: isDarkMode ? '#0f172a' : '#ffffff',
            colorBgContainer: isDarkMode ? '#1e293b' : '#ffffff',
            colorBgElevated: isDarkMode ? '#1e293b' : '#ffffff',
            colorText: isDarkMode ? '#f8fafc' : '#0f172a',
            colorTextHeading: isDarkMode ? '#f8fafc' : '#0f172a',
            colorTextSecondary: isDarkMode ? '#94a3b8' : '#64748b',
            colorBorder: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
            colorBorderSecondary: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
            borderRadius: 12,
            borderRadiusLG: 16,
            borderRadiusSM: 8,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: 14,
            lineHeight: 1.5,
          },
          components: {
            Button: {
              controlHeightLG: 46,
              controlHeight: 38,
              fontWeight: 600,
              borderRadius: 10,
              colorPrimaryHover: '#3b82f6',
              colorPrimaryActive: '#1d4ed8',
            },
            Card: {
              borderRadiusLG: 16,
              colorBgContainer: isDarkMode ? '#1e293b' : '#ffffff',
            },
            Table: {
              headerBg: isDarkMode ? '#0f172a' : '#f8fafc',
              headerColor: isDarkMode ? '#cbd5e1' : '#475569',
              rowHoverBg: isDarkMode ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
              colorBgContainer: isDarkMode ? '#1e293b' : '#ffffff',
              borderRadius: 12,
            },
            Input: {
              controlHeightLG: 46,
              controlHeight: 38,
              borderRadius: 10,
              activeBorderColor: '#2563eb',
              hoverBorderColor: '#3b82f6',
            },
            Modal: {
              borderRadiusLG: 20,
              contentBg: isDarkMode ? '#1e293b' : '#ffffff',
              headerBg: isDarkMode ? '#0f172a' : '#f8fafc',
            },
            Menu: {
              darkItemBg: 'transparent',
              darkItemSelectedBg: '#2563eb',
              darkItemColor: '#94a3b8',
              darkItemSelectedColor: '#ffffff',
              darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
            },
            Tag: {
              borderRadiusSM: 6,
              fontSize: 12,
            },
            Segmented: {
              itemSelectedBg: isDarkMode ? '#2563eb' : '#ffffff',
              itemSelectedColor: isDarkMode ? '#ffffff' : '#1d4ed8',
              trackBg: isDarkMode ? '#0f172a' : '#f1f5f9',
              borderRadius: 10,
            },
            Checkbox: {
              borderRadiusSM: 5,
              colorPrimary: '#2563eb',
              colorPrimaryHover: '#3b82f6',
            },
            Tooltip: {
              colorBgSpotlight: isDarkMode ? '#1e293b' : '#0f172a',
              colorTextLightSolid: '#f8fafc',
              borderRadiusSM: 8,
            },
            Dropdown: {
              colorBgElevated: isDarkMode ? '#1e293b' : '#ffffff',
            },
          },
        }}
      >
        <AntdApp>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/app" element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route index element={<Navigate replace to="/app/alumnos" />} />
                  <Route path="alumnos" element={<AlumnoList />} />
                  <Route path="boletines" element={<Navigate replace to="/app/boletines/calificaciones" />} />
                  <Route path="boletines/calificaciones" element={<PlanillaCalificacionesPage />} />
                  <Route path="boletines/constructor" element={<BoletinConfigPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate replace to="/" />} />
            </Routes>
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export default App;


