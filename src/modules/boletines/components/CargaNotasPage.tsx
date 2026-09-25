import { useNavigate, useSearchParams } from 'react-router-dom';
import { CargaNotasDashboardPage } from './MonitoreoProgresoPage';
import { PlanillaCalificacionesPage } from './PlanillaCalificacionesPage';
import { SeleccionBimestrePage } from './SeleccionBimestrePage';

export const CargaNotasPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedCursoId = searchParams.get('curso');
  const selectedPeriodoId = searchParams.get('periodo');

  if (!selectedPeriodoId) {
    return (
      <SeleccionBimestrePage
        onSelectPeriod={(periodoId) => (
          navigate(`/app/boletines/calificaciones?periodo=${encodeURIComponent(periodoId)}`)
        )}
      />
    );
  }

  if (selectedCursoId) {
    return (
      <PlanillaCalificacionesPage
        onBackToDashboard={() => (
          navigate(`/app/boletines/calificaciones?periodo=${encodeURIComponent(selectedPeriodoId)}`)
        )}
      />
    );
  }

  return (
    <CargaNotasDashboardPage
      periodoId={selectedPeriodoId}
      onBackToPeriodSelection={() => navigate('/app/boletines/calificaciones')}
    />
  );
};
