import { SectionLayout } from '../../../shared/components/SectionLayout';
import React, { useEffect, useState } from 'react';
import { Alert, Card, Row, Col, Typography, Tag, Button, Space, Spin, Tooltip, Statistic } from 'antd';
import {
  ScheduleOutlined,
  TableOutlined,
  SettingOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../store/appStore';
import { boletinService } from '../services/boletin.service';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import type { Periodo } from '../models/boletin.model';

import styles from './BoletinesHubPage.module.css';

const { Title, Paragraph } = Typography;

export const BoletinesHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { cicloActual, isCicloLoading } = useAppStore();
  const [revision, setRevision] = useState(0);
  const cycleId = cicloActual?.id;
  const requestKey = `${cycleId ?? 'none'}:${revision}`;
  const [context, setContext] = useState<{
    key: string; cursos: Curso[]; periodos: Periodo[]; error: boolean;
  }>();
  const loading = isCicloLoading || context?.key !== requestKey;
  const hasError = !loading && context?.error;
  const activePeriodo = !loading && !hasError ? context?.periodos[0]?.nombre : undefined;

  useEffect(() => {
    if (isCicloLoading) return;
    let cancelled = false;
    Promise.all([
      boletinService.getCursos(),
      cycleId ? boletinService.getPeriodosByCiclo(cycleId) : Promise.resolve([]),
    ]).then(([cursos, periodos]) => {
      if (!cancelled) setContext({ key: requestKey, cursos, periodos, error: false });
    }).catch(() => {
      if (!cancelled) setContext({ key: requestKey, cursos: [], periodos: [], error: true });
    });
    return () => { cancelled = true; };
  }, [cycleId, requestKey, isCicloLoading]);

  const hubSections = [
    {
      key: 'calificaciones',
      title: 'Carga de Calificaciones',
      badge: 'CARGA Y CONTROL',
      badgeColor: 'blue',
      icon: <TableOutlined />,
      description:
        'Tablero unificado para iniciar la carga docente, seguir el avance de cada curso y revisar los bimestres enviados.',
      features: [
        'Estado de todos los cursos',
        'Gestión de enlaces docentes',
        'Revisión por alumno',
        'Revisión y corrección directiva',
      ],
      route: '/app/boletines/calificaciones',
      buttonText: 'Abrir carga de notas',
      buttonType: 'primary' as const,
    },
    {
      key: 'constructor',
      title: 'Constructor Curricular',
      badge: 'CONFIGURACIÓN ANUAL',
      badgeColor: 'purple',
      icon: <SettingOutlined />,
      description:
        'Administración y estructuración anual de la malla académica. Asignación de materias por curso, configuración de los 5 criterios y períodos escolares.',
      features: [
        'Malla curricular por curso / división',
        'Definición de 5 Criterios por materia',
        'Configuración de Períodos Escolares',
        'Catálogo unificado de materias',
      ],
      route: '/app/boletines/constructor',
      buttonText: 'Organizar materias',
      buttonType: 'primary' as const,
    },
  ];

  return (
    <SectionLayout
      title="Boletines y evaluación"
      icon={<ScheduleOutlined />}
      actions={
          <Space wrap>
            {loading ? <Spin size="small" /> : <>
              <Tag color="blue" icon={<CalendarOutlined />}>{cicloActual ? `Ciclo ${cicloActual.ano}` : 'Sin ciclo activo'}</Tag>
              {activePeriodo && <Tag>{activePeriodo}</Tag>}
            </>}
            <Tooltip title="Actualizar datos del módulo">
              <Button icon={<ReloadOutlined />} onClick={() => setRevision((value) => value + 1)} loading={loading} aria-label="Actualizar datos del módulo" />
            </Tooltip>
          </Space>
      }
    >
      <Card className={styles.summary}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={14}>
            <Title level={2} className={styles.summaryTitle}>Acompañá cada etapa del aprendizaje</Title>
            <Paragraph type="secondary">Cargá las evaluaciones, consultá el avance de los cursos y organizá la propuesta curricular del colegio.</Paragraph>
          </Col>
          <Col xs={12} md={5}><Spin spinning={loading}><Statistic title="Cursos" value={loading || hasError ? '—' : context?.cursos.length ?? 0} /></Spin></Col>
          <Col xs={12} md={5}><Spin spinning={loading}><Statistic title="Períodos" value={loading || hasError ? '—' : context?.periodos.length ?? 0} /></Spin></Col>
        </Row>
      </Card>
      {hasError && <Alert type="error" showIcon title="No pudimos cargar el resumen" description="Usá Actualizar datos del módulo para volver a intentar." />}
      {!isCicloLoading && !cicloActual && <Alert type="info" showIcon title="No hay un ciclo lectivo activo" description="Las tareas de evaluación requieren un ciclo configurado." />}
      <Row gutter={[20, 20]}>
        {hubSections.map((section) => (
          <Col xs={24} md={12} key={section.key}>
            <Card className={styles.actionCard} classNames={{ body: styles.cardBody }}>
              <div className={styles.cardTop}>
                <span className={`${styles.icon} ${styles[section.key]}`} aria-hidden="true">{section.icon}</span>
                <Tag color={section.badgeColor}>{section.badge}</Tag>
              </div>
              <Title level={2} className={styles.cardTitle}>{section.title}</Title>
              <Paragraph type="secondary">{section.description}</Paragraph>
              <ul className={styles.features}>
                {section.features.map((feature) => <li key={feature}><CheckCircleOutlined aria-hidden="true" />{feature}</li>)}
              </ul>
              <Button type={section.buttonType} block icon={<ArrowRightOutlined />} iconPlacement="end" onClick={() => navigate(section.route)}>
                {section.buttonText}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </SectionLayout>
  );
};
