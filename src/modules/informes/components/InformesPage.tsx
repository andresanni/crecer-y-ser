import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isValidTipoInforme, type TipoInforme } from '../models/informe.model';
import { SeleccionTipoInformePage } from './SeleccionTipoInformePage';
import { TableroInformesPage } from './TableroInformesPage';
import { RevisionInformePage } from './RevisionInformePage';

export const InformesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTipo = searchParams.get('tipo');
  const tipoInforme: TipoInforme | null = isValidTipoInforme(rawTipo) ? rawTipo : null;
  const instanciaId = searchParams.get('instancia');
  const inscripcionId = searchParams.get('inscripcion');

  if (!tipoInforme) {
    return (
      <SeleccionTipoInformePage
        onSelectTipo={(selectedTipo) => {
          navigate(`/app/informes?tipo=${encodeURIComponent(selectedTipo)}`);
        }}
      />
    );
  }

  if (instanciaId) {
    return (
      <RevisionInformePage
        key={instanciaId}
        instanciaId={instanciaId}
        selectedInscripcionId={inscripcionId}
        onSelectInscripcion={(nextInscripcionId) => {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              if (nextInscripcionId) {
                next.set('inscripcion', nextInscripcionId);
              } else {
                next.delete('inscripcion');
              }
              return next;
            },
            { replace: true },
          );
        }}
        onBackToDashboard={() => {
          navigate(`/app/informes?tipo=${encodeURIComponent(tipoInforme)}`);
        }}
      />
    );
  }

  return (
    <TableroInformesPage
      key={tipoInforme}
      tipoInforme={tipoInforme}
      onBackToSelection={() => navigate('/app/informes')}
      onOpenInstancia={(targetInstanciaId) => {
        navigate(
          `/app/informes?tipo=${encodeURIComponent(tipoInforme)}&instancia=${encodeURIComponent(targetInstanciaId)}`,
        );
      }}
    />
  );
};
