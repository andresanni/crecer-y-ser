import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Result,
  Row,
  Space,
  Spin,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleFilled,
  UserOutlined,
} from '@ant-design/icons';
import ui from '../../../shared/styles/ui.module.css';
import { createMagicLinkGradebookAccess } from '../models/gradebookAccess.model';
import type { GradebookSubmissionResult } from '../models/gradebookDataSource.model';
import {
  accesoDocenteService,
  TeacherAccessDeniedError,
  type TeacherGradebookContext,
} from '../services/accesoDocente.service';
import { VistaPorAlumno } from './VistaPorAlumno';
import styles from './CargaDocentePublicaPage.module.css';

const { Title, Text } = Typography;

export const CargaDocentePublicaPage: React.FC = () => {
  const { message } = App.useApp();
  const [token] = useState(() => accesoDocenteService.readTokenFromLocation());
  const [context, setContext] = useState<TeacherGradebookContext | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(
    token ? null : 'No se proporcionó ningún enlace de acceso.',
  );
  const [revision, setRevision] = useState(0);
  const [submission, setSubmission] = useState<GradebookSubmissionResult | null>(null);
  const [hasPendingStudentChanges, setHasPendingStudentChanges] = useState(false);
  const lastSilentCheckRef = useRef(0);

  const handleAccessDenied = useCallback(() => {
    setContext(null);
    setError('El enlace ya no está disponible.');
  }, []);

  const handleRosterChanged = useCallback(
    (reason?: string) => {
      if (reason) {
        message.info(reason, 6);
      }
      setHasPendingStudentChanges(false);
      setLoading(true);
      setError(null);
      setRevision((current) => current + 1);
    },
    [message],
  );

  const handlePeriodSubmitted = useCallback((result: GradebookSubmissionResult) => {
    setSubmission(result);
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    accesoDocenteService.getContext(token)
      .then((result) => {
        if (!active) return;
        setContext(result);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        console.error(requestError);
        setContext(null);
        setError(requestError instanceof TeacherAccessDeniedError
          ? 'El enlace es inválido o ya no está disponible.'
          : 'No pudimos conectar con la planilla. Intentá nuevamente.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, token]);

  const reloadContext = () => {
    setLoading(true);
    setError(null);
    setRevision((current) => current + 1);
  };

  useEffect(() => {
    if (!token || !context || submission || hasPendingStudentChanges) return;
    let active = true;
    const syncRosterIfNeeded = () => {
      if (!active || document.visibilityState !== 'visible' || hasPendingStudentChanges) return;
      const now = Date.now();
      if (now - lastSilentCheckRef.current < 12000) return;
      lastSilentCheckRef.current = now;
      void accesoDocenteService
        .getContext(token)
        .then((next) => {
          if (!active) return;
          const prevIds = context.alumnos.map((a) => a.inscripcionId).join(',');
          const nextIds = next.alumnos.map((a) => a.inscripcionId).join(',');
          if (prevIds !== nextIds) {
            setContext(next);
            message.info('Dirección actualizó la nómina de alumnos del curso.', 5);
          }
        })
        .catch(() => undefined);
    };
    window.addEventListener('focus', syncRosterIfNeeded);
    document.addEventListener('visibilitychange', syncRosterIfNeeded);
    return () => {
      active = false;
      window.removeEventListener('focus', syncRosterIfNeeded);
      document.removeEventListener('visibilitychange', syncRosterIfNeeded);
    };
  }, [context, hasPendingStudentChanges, message, submission, token]);

  const dataSource = useMemo(() => (
    token && context ? accesoDocenteService.createDataSource(token, context) : null
  ), [context, token]);

  const access = useMemo(() => (
    context && dataSource
      ? createMagicLinkGradebookAccess(dataSource, handleAccessDenied, handlePeriodSubmitted, handleRosterChanged)
      : null
  ), [context, dataSource, handleAccessDenied, handlePeriodSubmitted, handleRosterChanged]);

  if (loading) {
    return (
      <div className={ui.publicPage}>
        <Card className={ui.loadingPanel}>
          <Spin size="large" description="Validando el acceso y preparando la planilla..." />
        </Card>
      </div>
    );
  }

  if (submission) {
    return (
      <div className={ui.publicPage}>
        <Card className={ui.emptyPanel}>
          <Result
            status="success"
            title="Bimestre enviado correctamente"
            subTitle={`La entrega de ${submission.totalAlumnos} estudiantes quedó bajo control del equipo directivo. Ya no necesitás realizar más cambios.`}
          />
        </Card>
      </div>
    );
  }

  if (error || !context || !access) {
    return (
      <div className={ui.publicPage}>
        <Card className={ui.emptyPanel}>
          <Result
            status="403"
            title="Enlace no disponible"
            subTitle={error || 'No tenés autorización para acceder a esta planilla.'}
            extra={token ? <Button onClick={reloadContext}>Reintentar</Button> : undefined}
          />
        </Card>
      </div>
    );
  }

  const { acceso, curso, periodo, materias, valoresEscala, alumnos } = context;

  return (
    <div className={ui.publicPage}>
      <Card
        className={`${ui.operationalContent} ${styles.publicHeaderCard}`}
        styles={{ body: { padding: '18px 24px' } }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} lg={13}>
            <div className={styles.teacherContainer}>
              <div className={styles.schoolLogo}>
                <img
                  src="/isotype.png"
                  alt="Colegio Crecer y Ser"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <Space size={6} align="center">
                  <CheckCircleFilled style={{ color: '#6ee7b7' }} />
                  <Text style={{ color: '#bfdbfe', fontSize: 12, fontWeight: 700 }}>
                    COLEGIO CRECER Y SER · ACCESO DOCENTE
                  </Text>
                </Space>
                <Title level={3} className={styles.teacherTitle}>
                  {acceso.docenteNombre}
                </Title>
                <Text style={{ color: '#e0e7ff' }}>Carga de boletín</Text>
              </div>
            </div>
          </Col>
          <Col xs={24} lg={11}>
            <div className={styles.metadataContainer}>
              <div className={styles.courseCard}>
                <UserOutlined style={{ fontSize: 18, color: '#bfdbfe' }} />
                <div>
                  <Text style={{ display: 'block', color: '#bfdbfe', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                    GRADO Y TURNO
                  </Text>
                  <Text style={{ display: 'block', color: '#ffffff', fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>
                    {curso.nombre} · {curso.turno}
                  </Text>
                </div>
              </div>
              <div className={styles.periodCard}>
                <CalendarOutlined style={{ fontSize: 18, color: '#dbeafe' }} />
                <div>
                  <Text style={{ display: 'block', color: '#dbeafe', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                    PERÍODO
                  </Text>
                  <Text style={{ display: 'block', color: '#ffffff', fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>
                    {periodo.nombre}
                  </Text>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {alumnos.length === 0 ? (
        <Card className={ui.emptyPanel}>
          <Text type="secondary">No hay estudiantes para evaluar en este bimestre.</Text>
        </Card>
      ) : (
        <VistaPorAlumno
          periodoId={periodo.id}
          cursoNombre={curso.nombre}
          alumnos={alumnos}
          cursoMaterias={materias}
          valoresEscala={valoresEscala}
          periodo={periodo}
          access={access}
          onPendingChangesChange={setHasPendingStudentChanges}
        />
      )}
    </div>
  );
};
