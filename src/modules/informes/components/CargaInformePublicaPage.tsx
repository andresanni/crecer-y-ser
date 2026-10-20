import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Result,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  AppstoreOutlined,
  BookOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import ui from '../../../shared/styles/ui.module.css';
import { TIPOS_INFORME_META } from '../models/informe.model';
import { createMagicLinkInformeAccess } from '../models/informeAccess.model';
import type { InformeSubmissionResult } from '../models/informeDataSource.model';
import {
  InformeAccessDeniedError,
  informesService,
  type TeacherInformeContext,
} from '../services/informes.service';
import { VistaInformePorAlumno } from './VistaInformePorAlumno';
import styles from './CargaInformePublicaPage.module.css';

const { Title, Text } = Typography;

export const CargaInformePublicaPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [token] = useState(() => informesService.readTokenFromLocation());
  const [requestedInstanciaId, setRequestedInstanciaId] = useState<string | undefined>(undefined);
  const [context, setContext] = useState<TeacherInformeContext | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(
    token ? null : 'No se proporcionó ningún enlace de acceso.',
  );
  const [reloadCount, setReloadCount] = useState(0);
  const [submission, setSubmission] = useState<InformeSubmissionResult | null>(null);
  const [lastDeliveredBanner, setLastDeliveredBanner] = useState<string | null>(null);
  const [hasPendingStudentChanges, setHasPendingStudentChanges] = useState(false);
  const [activeCompletedOverride, setActiveCompletedOverride] = useState<number | null>(null);

  const handleAccessDenied = useCallback(() => {
    setContext(null);
    setError('El enlace ya no está disponible.');
  }, []);

  const handleReportSubmitted = useCallback(
    (result: InformeSubmissionResult) => {
      if ((result.cursosRestantes ?? 0) > 0 && result.siguienteInstanciaId) {
        const deliveredCourseName = context?.curso.nombre || 'el grado';
        const bannerText = `¡El informe de ${deliveredCourseName} (${result.totalAlumnos} estudiantes) fue enviado a Dirección! Continuá con el siguiente grado asignado.`;
        setLastDeliveredBanner(bannerText);
        message.success(`Informe de ${deliveredCourseName} enviado a Dirección`);
        setHasPendingStudentChanges(false);
        setActiveCompletedOverride(null);
        setLoading(true);
        setRequestedInstanciaId(result.siguienteInstanciaId);
        setReloadCount((current) => current + 1);
        return;
      }
      setSubmission(result);
    },
    [context?.curso.nombre, message],
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    informesService
      .getTeacherContext(token, requestedInstanciaId)
      .then((result) => {
        if (!active) return;
        setContext(result);
        setActiveCompletedOverride(null);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        console.error(requestError);
        setContext(null);
        setError(
          requestError instanceof InformeAccessDeniedError
            ? 'El enlace es inválido o ya no está disponible.'
            : 'No pudimos conectar con el informe. Intentá nuevamente.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadCount, requestedInstanciaId, token]);

  const reloadContext = () => {
    setLoading(true);
    setError(null);
    setReloadCount((current) => current + 1);
  };

  const activeInstanciaId = context?.instancia.id;

  const dataSource = useMemo(
    () => (token ? informesService.createTeacherDataSource(token, activeInstanciaId) : null),
    [activeInstanciaId, token],
  );

  const access = useMemo(
    () => (
      context && dataSource
        ? createMagicLinkInformeAccess(dataSource, handleAccessDenied, handleReportSubmitted)
        : null
    ),
    [context, dataSource, handleAccessDenied, handleReportSubmitted],
  );

  const handleSelectCourse = (nextInstanciaId: string) => {
    if (!context || nextInstanciaId === context.instancia.id) return;
    const performSwitch = () => {
      setHasPendingStudentChanges(false);
      setActiveCompletedOverride(null);
      setLoading(true);
      setRequestedInstanciaId(nextInstanciaId);
    };
    if (hasPendingStudentChanges) {
      modal.confirm({
        title: 'Cambios sin guardar',
        content: 'Tenés cambios sin guardar en el alumno actual. ¿Querés descartarlos y cambiar de grado?',
        okText: 'Descartar y cambiar de grado',
        cancelText: 'Seguir editando',
        okButtonProps: { danger: true },
        onOk: performSwitch,
      });
      return;
    }
    performSwitch();
  };

  if (loading) {
    return (
      <div className={ui.publicPage}>
        <Card className={ui.loadingPanel}>
          <Spin size="large" description="Validando el acceso y preparando el informe..." />
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
            title="Informes enviados correctamente"
            subTitle={`La entrega de ${submission.totalAlumnos} estudiantes quedó bajo control del equipo directivo. Ya completaste todos los grados asignados a este enlace.`}
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
            subTitle={error || 'No tenés autorización para acceder a este informe.'}
            extra={token ? <Button onClick={reloadContext}>Reintentar</Button> : undefined}
          />
        </Card>
      </div>
    );
  }

  const { instancia, curso, materia, plantilla, items, alumnos, ciclo, cursosAsignados = [] } = context;
  const tipoMeta = TIPOS_INFORME_META[instancia.tipoInforme];
  const teacherFullName = `${instancia.docenteNombre} ${instancia.docenteApellido}`.trim();
  const hasMultipleCourses = cursosAsignados.length > 1;

  return (
    <div className={ui.publicPage}>
      <Card
        className={`${ui.operationalContent} ${styles.publicHeaderCard}`}
        styles={{ body: { padding: '16px 22px' } }}
      >
        <Row justify="space-between" align="middle" gutter={[20, 14]}>
          <Col xs={24} md={13} lg={14}>
            <div className={styles.teacherContainer}>
              <div className={styles.schoolLogo}>
                <img
                  src="/isotype.png"
                  alt="Colegio Crecer y Ser"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <Title level={3} className={styles.teacherTitle}>
                  {teacherFullName}
                </Title>
                <Text className={styles.headerSubtitle}>
                  {tipoMeta?.titulo || 'Informe pedagógico'} · Ciclo {ciclo.ano}
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} md={11} lg={10}>
            <div className={styles.scopeContainer}>
              <div className={styles.scopeCard}>
                {materia && (
                  <>
                    <div className={styles.scopeItem}>
                      <BookOutlined className={styles.scopeIcon} />
                      <span className={styles.scopeMainText}>{materia.nombre}</span>
                    </div>
                    <div className={styles.scopeDivider} />
                  </>
                )}
                <div className={styles.scopeItem}>
                  <UserOutlined className={styles.scopeIcon} />
                  <span className={materia ? styles.scopeSecondaryText : styles.scopeMainText}>
                    {curso.nombre} · {curso.turno}
                  </span>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {lastDeliveredBanner && (
        <Alert
          className={ui.operationalContent}
          type="success"
          showIcon
          closable
          onClose={() => setLastDeliveredBanner(null)}
          title={lastDeliveredBanner}
        />
      )}

      {hasMultipleCourses && (
        <Card
          className={`${ui.operationalContent} ${styles.coursesSwitcherCard}`}
          styles={{ body: { padding: '12px 18px' } }}
        >
          <div className={styles.coursesSwitcherRow}>
            <Space size={8}>
              <AppstoreOutlined style={{ color: 'var(--cys-color-primary-text)' }} />
              <Text strong>
                Grados asignados en este enlace ({cursosAsignados.length}):
              </Text>
            </Space>
            <div className={styles.coursesSwitcherPills}>
              {cursosAsignados.map((item) => {
                const isActive = item.instanciaId === instancia.id;
                const completedCount = isActive && activeCompletedOverride !== null
                  ? activeCompletedOverride
                  : item.alumnosCompletos;
                const isCourseComplete = item.totalAlumnos > 0 && completedCount === item.totalAlumnos;
                return (
                  <Button
                    key={item.instanciaId}
                    type={isActive ? 'primary' : 'default'}
                    onClick={() => handleSelectCourse(item.instanciaId)}
                  >
                    <Space size={6}>
                      <span>{item.cursoNombre}</span>
                      <Tag
                        color={isCourseComplete ? 'success' : isActive ? 'processing' : 'default'}
                        style={{ margin: 0 }}
                      >
                        {isCourseComplete && <CheckCircleOutlined style={{ marginRight: 3 }} />}
                        {completedCount}/{item.totalAlumnos}
                      </Tag>
                    </Space>
                  </Button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {!!context.cursadasPendientes.length && (
        <Alert
          className={ui.operationalContent}
          type="warning"
          showIcon
          title="Cursadas por confirmar"
          description="Dirección debe confirmar los bimestres evaluables antes de la entrega. Podés continuar guardando el borrador. Una vez confirmados, guardá tus cambios y volvé a abrir el enlace para actualizar la lista."
        />
      )}

      {alumnos.length === 0 ? (
        <Card className={`${ui.operationalContent} ${ui.emptyPanel}`}>
          <Text type="secondary">No hay estudiantes evaluables en este informe.</Text>
        </Card>
      ) : (
        <VistaInformePorAlumno
          key={instancia.id}
          plantilla={plantilla}
          items={items}
          alumnos={alumnos}
          access={access}
          workflowRevision={instancia.revision}
          cursoNombre={curso.nombre}
          tieneOtrosCursosAsignados={hasMultipleCourses}
          onCompletedCountChange={setActiveCompletedOverride}
          onPendingChangesChange={setHasPendingStudentChanges}
        />
      )}
    </div>
  );
};
