import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './shared/components/MainLayout';
import { AlumnoList } from './modules/alumnos/components/AlumnoList';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate replace to="/alumnos" />} />
          <Route path="alumnos" element={<AlumnoList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
