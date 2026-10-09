import { ConfigProvider, App as AntdApp } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './shared/components/MainLayout';
import { AlumnoList } from './modules/alumnos/components/AlumnoList';
import { CargaNotasPage } from './modules/boletines/components/CargaNotasPage';
import { BoletinConfigPage } from './modules/boletines/components/BoletinConfigPage';
import { CargaDocentePublicaPage } from './modules/boletines/components/CargaDocentePublicaPage';
import { AsistenciasPage } from './modules/asistencias';
import { Login } from './modules/auth/components/Login';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { LandingPage } from './modules/landing/LandingPage';
import { getAntdTheme } from './theme';
import './index.css';

dayjs.locale('es');

function App() {
  return (
    <ConfigProvider locale={esES} theme={getAntdTheme()}>
      <AntdApp>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/carga" element={<CargaDocentePublicaPage />} />
            <Route path="/app" element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route index element={<Navigate replace to="/app/alumnos" />} />
                <Route path="alumnos" element={<AlumnoList />} />
                <Route path="boletines" element={<Navigate replace to="/app/boletines/calificaciones" />} />
                <Route path="boletines/calificaciones" element={<CargaNotasPage />} />
                <Route path="boletines/monitoreo" element={<Navigate replace to="/app/boletines/calificaciones" />} />
                <Route path="boletines/constructor" element={<BoletinConfigPage />} />
                <Route path="asistencias" element={<AsistenciasPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;

