import { useNavigate, useSearchParams } from 'react-router-dom';
import { CargaNotasDashboardPage } from './MonitoreoProgresoPage';
import { PlanillaCalificacionesPage } from './PlanillaCalificacionesPage';

export const CargaNotasPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasSelectedCourse = Boolean(searchParams.get('curso') && searchParams.get('periodo'));

  if (hasSelectedCourse) {
    return (
      <PlanillaCalificacionesPage
        onBackToDashboard={() => navigate('/app/boletines/calificaciones')}
      />
    );
  }

  return <CargaNotasDashboardPage />;
};
