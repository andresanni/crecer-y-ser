import React, { useEffect, useState } from 'react';
import { CalendarOutlined } from '@ant-design/icons';
import { Alert, Card, Empty, Spin } from 'antd';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import { NavigationCard, NavigationCardGrid } from '../../../shared/components/NavigationCard';
import { useAppStore } from '../../../store/appStore';
import { boletinService } from '../services/boletin.service';
import type { Periodo } from '../models/boletin.model';
import ui from '../../../shared/styles/ui.module.css';

interface SeleccionBimestrePageProps {
  onSelectPeriod: (periodoId: string) => void;
}

export const SeleccionBimestrePage: React.FC<SeleccionBimestrePageProps> = ({
  onSelectPeriod,
}) => {
  const { cicloActual, isCicloLoading } = useAppStore();
  const cycleId = cicloActual?.id;
  const requestKey = cycleId || 'none';
  const [result, setResult] = useState<{
    key: string;
    periodos: Periodo[];
    failed: boolean;
  }>();
  const loading = isCicloLoading || result?.key !== requestKey;
  const periodos = result?.key === requestKey ? result.periodos : [];
  const failed = result?.key === requestKey && result.failed;

  useEffect(() => {
    if (isCicloLoading) return;
    let active = true;
    const request = cycleId
      ? boletinService.getPeriodosByCiclo(cycleId)
      : Promise.resolve([]);
    request
      .then((result) => {
        if (active) setResult({ key: requestKey, periodos: result, failed: false });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (active) setResult({ key: requestKey, periodos: [], failed: true });
      });
    return () => {
      active = false;
    };
  }, [cycleId, isCicloLoading, requestKey]);

  return (
    <SectionLayout title="Bimestres" icon={<CalendarOutlined />}>
      {failed ? (
        <Alert
          type="error"
          showIcon
          title="No pudimos cargar los bimestres"
          description="Actualizá la página para volver a intentarlo."
        />
      ) : loading || isCicloLoading ? (
        <Card className={ui.loadingPanel}>
          <Spin description="Cargando bimestres..." />
        </Card>
      ) : periodos.length === 0 ? (
        <Card className={ui.emptyPanel}>
          <Empty description="No hay bimestres configurados para el ciclo lectivo actual." />
        </Card>
      ) : (
        <NavigationCardGrid>
          {periodos.map((periodo) => (
            <NavigationCard
              key={periodo.id}
              title={periodo.nombre}
              marker={periodo.numeroPeriodo}
              onClick={() => onSelectPeriod(periodo.id)}
            />
          ))}
        </NavigationCardGrid>
      )}
    </SectionLayout>
  );
};
