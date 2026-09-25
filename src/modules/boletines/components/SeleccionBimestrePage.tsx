import React, { useEffect, useState } from 'react';
import { ArrowRightOutlined, CalendarOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { Alert, Card, Col, Empty, Row, Spin, Tag, Typography } from 'antd';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import { useAppStore } from '../../../store/appStore';
import { boletinService } from '../services/boletin.service';
import type { Periodo } from '../models/boletin.model';
import styles from './SeleccionBimestrePage.module.css';

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
    <SectionLayout title="Carga de notas" icon={<CalendarOutlined />}>
      <Card className={styles.introduction}>
        <div className={styles.introductionIcon}>
          <FieldTimeOutlined />
        </div>
        <div>
          <Typography.Title level={3} className={styles.title}>
            Elegí el bimestre de trabajo
          </Typography.Title>
          <Typography.Paragraph type="secondary" className={styles.description}>
            El tablero, los enlaces docentes y la revisión permanecerán dentro del período seleccionado.
          </Typography.Paragraph>
        </div>
        {cicloActual && <Tag color="blue">Ciclo {cicloActual.ano}</Tag>}
      </Card>

      {failed ? (
        <Alert
          type="error"
          showIcon
          title="No pudimos cargar los bimestres"
          description="Actualizá la página para volver a intentarlo."
        />
      ) : loading || isCicloLoading ? (
        <Card className={styles.loadingPanel}>
          <Spin description="Cargando bimestres..." />
        </Card>
      ) : periodos.length === 0 ? (
        <Card className={styles.loadingPanel}>
          <Empty description="No hay bimestres configurados para el ciclo lectivo actual." />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {periodos.map((periodo) => (
            <Col xs={24} sm={12} key={periodo.id}>
              <button
                type="button"
                className={styles.periodCard}
                onClick={() => onSelectPeriod(periodo.id)}
              >
                <span className={styles.periodNumber}>{periodo.numeroPeriodo}</span>
                <span className={styles.periodInfo}>
                  <Typography.Text strong className={styles.periodName}>
                    {periodo.nombre}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    Abrir tablero de cursos
                  </Typography.Text>
                </span>
                <ArrowRightOutlined className={styles.arrow} />
              </button>
            </Col>
          ))}
        </Row>
      )}
    </SectionLayout>
  );
};
