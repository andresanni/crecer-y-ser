import { useNavigate, useSearchParams } from 'react-router-dom';
import { CargaNotasDashboardPage } from './MonitoreoProgresoPage';
import { PlanillaCalificacionesPage } from './PlanillaCalificacionesPage';
import { RevisionAsistenciasB4Page } from './RevisionAsistenciasB4Page';
import { SeleccionBimestrePage } from './SeleccionBimestrePage';

export const CargaNotasPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedCursoId = searchParams.get('curso');
  const selectedPeriodoId = searchParams.get('periodo');
  const selectedAsistenciaCursoId = searchParams.get('asistenciaCurso');
  const selectedTab = searchParams.get('tab') === 'asistencias' ? 'asistencias' : 'calificaciones';

  if (!selectedPeriodoId) {
    return (
      <SeleccionBimestrePage
        onSelectPeriod={(periodoId) => (
          navigate(`/app/boletines/calificaciones?periodo=${encodeURIComponent(periodoId)}`)
        )}
      />
    );
  }

  if (selectedAsistenciaCursoId) {
    return (
      <RevisionAsistenciasB4Page
        key={`${selectedAsistenciaCursoId}:${selectedPeriodoId}`}
        cursoId={selectedAsistenciaCursoId}
        periodoId={selectedPeriodoId}
        onBack={() => (
          navigate(`/app/boletines/calificaciones?periodo=${encodeURIComponent(selectedPeriodoId)}&tab=asistencias`)
        )}
      />
    );
  }

  if (selectedCursoId) {
    return (
      <PlanillaCalificacionesPage
        key={`${selectedCursoId}:${selectedPeriodoId}`}
        onBackToDashboard={() => (
          navigate(`/app/boletines/calificaciones?periodo=${encodeURIComponent(selectedPeriodoId)}`)
        )}
      />
    );
  }

  return (
    <CargaNotasDashboardPage
      key={selectedPeriodoId}
      periodoId={selectedPeriodoId}
      initialTab={selectedTab}
      onBackToPeriodSelection={() => navigate('/app/boletines/calificaciones')}
    />
  );
};
