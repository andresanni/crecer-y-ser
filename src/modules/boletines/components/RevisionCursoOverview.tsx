import React, { useMemo } from 'react';
import { ArrowRightOutlined, TeamOutlined } from '@ant-design/icons';
import { Card, Col, Empty, Row, Tag, Typography } from 'antd';
import type { AlumnoInscriptoRow } from '../models/boletin.model';
import type { StaffReviewBulletin } from '../services/gradebookDataSource.service';
import styles from './RevisionCursoOverview.module.css';

interface RevisionCursoOverviewProps {
  alumnos: AlumnoInscriptoRow[];
  boletines: StaffReviewBulletin[];
  visados: number;
  totalBoletines: number;
  actions: React.ReactNode;
  onSelectStudent: (inscripcionId: string) => void;
}

interface RevisionCursoHeaderProps {
  cursoNombre: string;
  periodoNombre: string;
}

export const RevisionCursoHeader: React.FC<RevisionCursoHeaderProps> = ({
  cursoNombre,
  periodoNombre,
}) => (
  <Card className={styles.container} styles={{ body: { padding: 0 } }}>
    <div className={styles.header}>
      <div className={styles.headingGroup}>
        <div className={styles.iconBox}>
          <TeamOutlined />
        </div>
        <div>
          <Typography.Title level={4} className={styles.title}>
            {cursoNombre}
          </Typography.Title>
          <Typography.Text strong className={styles.contextLabel}>
            {periodoNombre}
          </Typography.Text>
        </div>
      </div>
    </div>
  </Card>
);

export const RevisionCursoOverview: React.FC<RevisionCursoOverviewProps> = ({
  alumnos,
  boletines,
  visados,
  totalBoletines,
  actions,
  onSelectStudent,
}) => {
  const bulletinByEnrollment = useMemo(
    () => new Map(boletines.map((boletin) => [boletin.inscripcionId, boletin])),
    [boletines],
  );

  return (
    <Card className={styles.container} styles={{ body: { padding: 0 } }}>
      <div className={styles.toolbar}>
        {actions}
        <Tag color={visados === totalBoletines && totalBoletines > 0 ? 'success' : 'processing'} className={styles.reviewProgress}>
          {visados} de {totalBoletines} boletines visados
        </Tag>
      </div>
      <div className={styles.content}>
        {alumnos.length === 0 ? (
          <Empty description="No hay alumnos en este curso" />
        ) : (
          <Row gutter={[12, 12]}>
            {alumnos.map((alumno) => (
              <Col xs={24} md={12} key={alumno.inscripcionId}>
                <button
                  type="button"
                  className={styles.studentCard}
                  onClick={() => onSelectStudent(alumno.inscripcionId)}
                >
                  <div className={styles.studentIdentity}>
                    <span className={styles.orderNumber}>
                      {alumno.numeroOrden || '•'}
                    </span>
                    <div className={styles.studentName}>
                      <Typography.Text strong>{alumno.nombreCompleto}</Typography.Text>
                      <div className={styles.studentTags}>
                        <Tag
                          className={styles.statusTag}
                          color={bulletinByEnrollment.get(alumno.inscripcionId)?.estado === 'VISADO' ? 'success' : 'warning'}
                        >
                          {bulletinByEnrollment.get(alumno.inscripcionId)?.estado === 'VISADO'
                            ? 'Visado'
                            : bulletinByEnrollment.has(alumno.inscripcionId)
                              ? 'Pendiente de visado'
                              : 'Pendiente de incorporar'}
                        </Tag>
                        {bulletinByEnrollment.get(alumno.inscripcionId)?.preparacionDocumental?.completa === false && (
                          <Tag color="warning" className={styles.secondaryTag}>
                            Faltan datos para PDF
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRightOutlined className={styles.arrow} />
                </button>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </Card>
  );
};
