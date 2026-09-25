import React, { useMemo, useState } from 'react';
import { ArrowRightOutlined, CheckCircleOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { Card, Col, Empty, Input, Row, Space, Tag, Typography } from 'antd';
import type { AlumnoInscriptoRow } from '../models/boletin.model';
import styles from './RevisionCursoOverview.module.css';

interface RevisionCursoOverviewProps {
  alumnos: AlumnoInscriptoRow[];
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
            Revisión del curso
          </Typography.Title>
          <Typography.Text strong className={styles.contextLabel}>
            {cursoNombre} · {periodoNombre}
          </Typography.Text>
        </div>
      </div>
      <Tag color="success" icon={<CheckCircleOutlined />} className={styles.deliveryTag}>
        Bimestre entregado
      </Tag>
    </div>
  </Card>
);

export const RevisionCursoOverview: React.FC<RevisionCursoOverviewProps> = ({
  alumnos,
  onSelectStudent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredStudents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es');
    if (!normalizedQuery) return alumnos;
    return alumnos.filter((alumno) => (
      alumno.nombreCompleto.toLocaleLowerCase('es').includes(normalizedQuery)
      || String(alumno.numeroOrden || '').includes(normalizedQuery)
    ));
  }, [alumnos, searchQuery]);

  return (
    <Card className={styles.container} styles={{ body: { padding: 0 } }}>
      <div className={styles.introduction}>
        <div>
          <Typography.Text strong>Seleccioná un alumno para comenzar la revisión</Typography.Text>
          <Typography.Paragraph type="secondary" className={styles.description}>
            La carga docente está completa. Podés recorrer las libretas en el orden que prefieras.
          </Typography.Paragraph>
        </div>
        <div className={styles.studentCount}>
          <span>{alumnos.length}</span>
          <Typography.Text type="secondary">estudiantes</Typography.Text>
        </div>
      </div>

      <div className={styles.content}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Buscar por nombre o número de orden"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className={styles.search}
        />

        {filteredStudents.length === 0 ? (
          <Empty description="No se encontraron alumnos" />
        ) : (
          <Row gutter={[12, 12]}>
            {filteredStudents.map((alumno) => (
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
                      <Space size={5}>
                        <CheckCircleOutlined className={styles.readyIcon} />
                        <Typography.Text type="secondary" className={styles.readyText}>
                          Listo para revisar
                        </Typography.Text>
                      </Space>
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
