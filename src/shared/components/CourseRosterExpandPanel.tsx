import React, { useEffect, useState } from 'react';
import { Alert, Button, Empty, Spin, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './CourseRosterExpandPanel.module.css';

const { Text } = Typography;

export interface CourseRosterPreviewStudent {
  inscripcionId: string;
  alumnoId: string;
  numeroOrden: number | null;
  nombreCompleto: string;
  estadoAdministrativo: string;
  completo?: boolean | null;
}

export interface CourseRosterPreview {
  cursoNombre: string;
  totalEvaluables: number;
  totalExcluidos: number;
  evaluables: CourseRosterPreviewStudent[];
  excluidos: CourseRosterPreviewStudent[];
}

interface CourseRosterExpandPanelProps {
  cacheKey: string;
  fetchRoster: () => Promise<CourseRosterPreview>;
}

export const CourseRosterExpandPanel: React.FC<CourseRosterExpandPanelProps> = ({
  cacheKey,
  fetchRoster,
}) => {
  const [reloadCount, setReloadCount] = useState(0);

  return (
    <CourseRosterExpandContent
      key={`${cacheKey}:${reloadCount}`}
      fetchRoster={fetchRoster}
      onRetry={() => setReloadCount((prev) => prev + 1)}
    />
  );
};

interface CourseRosterExpandContentProps {
  fetchRoster: () => Promise<CourseRosterPreview>;
  onRetry: () => void;
}

const CourseRosterExpandContent: React.FC<CourseRosterExpandContentProps> = ({
  fetchRoster,
  onRetry,
}) => {
  const navigate = useNavigate();
  const [data, setData] = useState<CourseRosterPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchRoster()
      .then((res) => {
        if (!active) return;
        setData(res);
      })
      .catch(() => {
        if (!active) return;
        setError('No se pudo consultar la nómina del curso.');
      });
    return () => {
      active = false;
    };
  }, [fetchRoster]);

  if (!data && !error) {
    return (
      <div className={styles.centered}>
        <Spin size="small" description="Cargando nómina del curso..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert
        type="error"
        showIcon
        message={error || 'No se pudo consultar la nómina del curso.'}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const openStudentEvaluations = (student: CourseRosterPreviewStudent) => {
    navigate(
      `/app/alumnos?alumno=${encodeURIComponent(student.alumnoId)}&inscripcion=${encodeURIComponent(student.inscripcionId)}&seccion=evaluaciones`,
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Text strong>Nómina de {data.cursoNombre}</Text>
          <Tag color="blue" className={styles.compactTag}>
            {data.totalEvaluables} {data.totalEvaluables === 1 ? 'evaluable' : 'evaluables'}
          </Tag>
          {data.totalExcluidos > 0 && (
            <Tag className={styles.compactTag}>
              {data.totalExcluidos} {data.totalExcluidos === 1 ? 'excluido' : 'excluidos'}
            </Tag>
          )}
        </div>
        <Text type="secondary" className={styles.hint}>
          Para incluir o excluir un alumno, abrí su ficha en Evaluaciones.
        </Text>
      </div>

      {data.evaluables.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No hay alumnos habilitados en esta nómina."
        />
      ) : (
        <div className={styles.grid}>
          {data.evaluables.map((student) => (
            <div key={student.inscripcionId} className={styles.studentRow}>
              <div className={styles.studentLeft}>
                <span className={styles.orderChip}>{student.numeroOrden ?? '•'}</span>
                <div className={styles.nameBlock}>
                  <span className={styles.nameText} title={student.nombreCompleto}>
                    {student.nombreCompleto}
                  </span>
                  <div className={styles.metaTags}>
                    {student.completo === true && (
                      <Tag
                        color="success"
                        icon={<CheckCircleOutlined />}
                        className={styles.compactTag}
                      >
                        Completo
                      </Tag>
                    )}
                    {student.completo === false && (
                      <Tag
                        color="warning"
                        icon={<ClockCircleOutlined />}
                        className={styles.compactTag}
                      >
                        Pendiente
                      </Tag>
                    )}
                    {student.estadoAdministrativo === 'Baja' && (
                      <Tag color="error" className={styles.compactTag}>
                        Baja
                      </Tag>
                    )}
                    {student.estadoAdministrativo === 'Libre' && (
                      <Tag color="warning" className={styles.compactTag}>
                        Libre
                      </Tag>
                    )}
                  </div>
                </div>
              </div>
              <Button
                type="link"
                size="small"
                className={styles.profileLink}
                onClick={() => openStudentEvaluations(student)}
              >
                Ficha
              </Button>
            </div>
          ))}
        </div>
      )}

      {data.excluidos.length > 0 && (
        <div className={styles.excludedSection}>
          <Text strong className={styles.excludedTitle}>
            No incluidos en la nómina ({data.excluidos.length}) — no figuran en el enlace docente ni suman en los totales
          </Text>
          <div className={styles.grid}>
            {data.excluidos.map((student) => (
              <div
                key={student.inscripcionId}
                className={`${styles.studentRow} ${styles.studentRowExcluded}`}
              >
                <div className={styles.studentLeft}>
                  <span className={`${styles.orderChip} ${styles.orderChipExcluded}`}>
                    {student.numeroOrden ?? '•'}
                  </span>
                  <div className={styles.nameBlock}>
                    <span
                      className={`${styles.nameText} ${styles.nameTextExcluded}`}
                      title={student.nombreCompleto}
                    >
                      {student.nombreCompleto}
                    </span>
                    <div className={styles.metaTags}>
                      <Tag className={styles.compactTag}>No evaluable</Tag>
                      {student.estadoAdministrativo === 'Baja' && (
                        <Tag color="error" className={styles.compactTag}>
                          Baja
                        </Tag>
                      )}
                      {student.estadoAdministrativo === 'Libre' && (
                        <Tag color="warning" className={styles.compactTag}>
                          Libre
                        </Tag>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="link"
                  size="small"
                  className={styles.profileLink}
                  onClick={() => openStudentEvaluations(student)}
                >
                  Ficha
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
