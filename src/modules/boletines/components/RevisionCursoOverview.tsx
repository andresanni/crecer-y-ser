import React, { useMemo, useState } from 'react';
import {
  ArrowRightOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Empty, Row, Segmented, Tag, Tooltip, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  formatCalificacionBoletinShortLabel,
  type AlumnoInscriptoRow,
} from '../models/boletin.model';
import type {
  AlumnoExcluidoBoletin,
  StaffReviewBulletin,
} from '../services/gradebookDataSource.service';
import styles from './RevisionCursoOverview.module.css';

interface RevisionCursoOverviewProps {
  alumnos: AlumnoInscriptoRow[];
  boletines: StaffReviewBulletin[];
  alumnosExcluidos?: AlumnoExcluidoBoletin[];
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
  <div className={styles.headerBanner}>
    <div className={styles.headerIdentity}>
      <span className={styles.iconBox} aria-hidden="true">
        <TeamOutlined />
      </span>
      <div className={styles.headerTextGroup}>
        <Typography.Title level={4} className={styles.title}>
          {cursoNombre}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.subtitle}>
          {periodoNombre}
        </Typography.Text>
      </div>
    </div>
  </div>
);

export const RevisionCursoOverview: React.FC<RevisionCursoOverviewProps> = ({
  alumnos,
  boletines,
  alumnosExcluidos,
  visados,
  totalBoletines,
  actions,
  onSelectStudent,
}) => {
  const navigate = useNavigate();
  const [listFilter, setListFilter] = useState<'TODOS' | 'SUGERENCIAS' | 'PENDIENTES'>('TODOS');

  const bulletinByEnrollment = useMemo(
    () => new Map(boletines.map((boletin) => [boletin.inscripcionId, boletin])),
    [boletines],
  );

  const countConSugerencias = useMemo(
    () =>
      alumnos.filter((alumno) => {
        const b = bulletinByEnrollment.get(alumno.inscripcionId);
        return ((b?.sugerenciasPromedio?.length ?? 0) + (b?.sugerenciasPpi?.length ?? 0)) > 0;
      }).length,
    [alumnos, bulletinByEnrollment],
  );

  const countPendientesVisado = useMemo(
    () =>
      alumnos.filter(
        (alumno) => bulletinByEnrollment.get(alumno.inscripcionId)?.estado !== 'VISADO',
      ).length,
    [alumnos, bulletinByEnrollment],
  );

  const filteredAlumnos = useMemo(() => {
    if (listFilter === 'SUGERENCIAS') {
      return alumnos.filter((alumno) => {
        const b = bulletinByEnrollment.get(alumno.inscripcionId);
        return ((b?.sugerenciasPromedio?.length ?? 0) + (b?.sugerenciasPpi?.length ?? 0)) > 0;
      });
    }
    if (listFilter === 'PENDIENTES') {
      return alumnos.filter(
        (alumno) => bulletinByEnrollment.get(alumno.inscripcionId)?.estado !== 'VISADO',
      );
    }
    return alumnos;
  }, [alumnos, bulletinByEnrollment, listFilter]);

  return (
    <Card className={styles.container} styles={{ body: { padding: 0 } }}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {actions}
          {alumnos.length > 0 && (
            <Segmented
              className={styles.toolbarFilter}
              value={listFilter}
              onChange={(val) => setListFilter(val as 'TODOS' | 'SUGERENCIAS' | 'PENDIENTES')}
              options={[
                { label: `Todos (${alumnos.length})`, value: 'TODOS' },
                { label: `Con sugerencias (${countConSugerencias})`, value: 'SUGERENCIAS' },
                { label: `Pendientes de visado (${countPendientesVisado})`, value: 'PENDIENTES' },
              ]}
            />
          )}
        </div>
        <Tag color={visados === totalBoletines && totalBoletines > 0 ? 'success' : 'processing'} className={styles.reviewProgress}>
          {visados} de {totalBoletines} boletines visados
        </Tag>
      </div>
      <div className={styles.content}>
        {alumnos.length === 0 ? (
          <Empty description="No hay alumnos en este curso" />
        ) : filteredAlumnos.length === 0 ? (
          <Empty description="No hay alumnos en este filtro">
            <Button size="small" onClick={() => setListFilter('TODOS')}>
              Ver todos los alumnos
            </Button>
          </Empty>
        ) : (
          <Row gutter={[12, 12]}>
            {filteredAlumnos.map((alumno) => {
              const bulletin = bulletinByEnrollment.get(alumno.inscripcionId);
              const isVisado = bulletin?.estado === 'VISADO';
              const sugerenciasPromedio = bulletin?.sugerenciasPromedio || [];
              const sugerenciasPpi = bulletin?.sugerenciasPpi || [];
              const totalSugerencias = sugerenciasPromedio.length + sugerenciasPpi.length;
              const sugerenciasTooltip = [
                ...sugerenciasPromedio.map((s) => {
                  const sugShort = s.calificacionSugeridaEtiqueta
                    ? formatCalificacionBoletinShortLabel(s.calificacionSugeridaEtiqueta)
                    : s.promedioNumerico.toLocaleString('es-AR');
                  const genShort = formatCalificacionBoletinShortLabel(s.calificacionGeneralEtiqueta);
                  return `${s.materiaNombre}: prom. ${sugShort} vs. ${genShort}`;
                }),
                ...sugerenciasPpi.map(
                  (s) =>
                    `${s.materiaNombre}: PPI B${s.bimestreAnterior} ${s.ppiAnterior ? 'Sí' : 'No'} → ${s.ppiActual ? 'Sí' : 'No'}`,
                ),
              ].join(' · ');

              return (
                <Col xs={24} md={12} key={alumno.inscripcionId} className={styles.studentCol}>
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
                        <Typography.Text strong className={styles.studentNameText}>
                          {alumno.nombreCompleto}
                        </Typography.Text>
                        {(totalSugerencias > 0 || bulletin?.preparacionDocumental?.completa === false) && (
                          <div className={styles.studentTags}>
                            {totalSugerencias > 0 && (
                              <Tooltip title={sugerenciasTooltip}>
                                <span className={styles.suggestionPill}>
                                  <BulbOutlined />
                                  <span>
                                    {totalSugerencias}{' '}
                                    {totalSugerencias === 1 ? 'sugerencia' : 'sugerencias'}
                                  </span>
                                </span>
                              </Tooltip>
                            )}
                            {bulletin?.preparacionDocumental?.completa === false && (
                              <Tag color="warning" className={styles.secondaryTag}>
                                Faltan datos para PDF
                              </Tag>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={styles.studentRightSection}>
                      <span
                        className={`${styles.visadoBadge} ${
                          isVisado ? styles.visadoBadgeApproved : styles.visadoBadgePending
                        }`}
                      >
                        {isVisado ? (
                          <>
                            <CheckCircleOutlined />
                            <span>Visado</span>
                          </>
                        ) : bulletin ? (
                          <>
                            <ClockCircleOutlined />
                            <span>Sin visar</span>
                          </>
                        ) : (
                          <>
                            <ClockCircleOutlined />
                            <span>Sin incorporar</span>
                          </>
                        )}
                      </span>
                      <ArrowRightOutlined className={styles.arrow} />
                    </span>
                  </button>
                </Col>
              );
            })}
          </Row>
        )}

        {alumnosExcluidos && alumnosExcluidos.length > 0 && (
          <div className={styles.excludedSection}>
            <div className={styles.excludedHeader}>
              <Typography.Text strong className={styles.excludedTitle}>
                No incluidos en este bimestre ({alumnosExcluidos.length})
              </Typography.Text>
              <Typography.Text type="secondary" className={styles.excludedCaption}>
                No cuentan en los totales ni figuran en el enlace docente.
              </Typography.Text>
            </div>
            <Row gutter={[12, 12]}>
              {alumnosExcluidos.map((alumno) => (
                <Col xs={24} md={12} key={alumno.inscripcionId} className={styles.studentCol}>
                  <div className={styles.excludedCard}>
                    <div className={styles.studentIdentity}>
                      <span className={styles.excludedOrderNumber}>
                        {alumno.numeroOrden ?? '•'}
                      </span>
                      <div className={styles.studentName}>
                        <Typography.Text className={styles.excludedNameText}>
                          {alumno.nombreCompleto}
                        </Typography.Text>
                        <div className={styles.studentTags}>
                          <Tag className={styles.secondaryTag}>No evaluable</Tag>
                          {alumno.estadoAdministrativo === 'Baja' && (
                            <Tag color="error" className={styles.secondaryTag}>
                              Baja
                            </Tag>
                          )}
                          {alumno.estadoAdministrativo === 'Libre' && (
                            <Tag color="warning" className={styles.secondaryTag}>
                              Libre
                            </Tag>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="small"
                      type="link"
                      onClick={() =>
                        navigate(
                          `/app/alumnos?alumno=${encodeURIComponent(alumno.alumnoId)}&inscripcion=${encodeURIComponent(alumno.inscripcionId)}&seccion=evaluaciones`,
                        )
                      }
                    >
                      Ver en ficha
                    </Button>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </div>
    </Card>
  );
};
