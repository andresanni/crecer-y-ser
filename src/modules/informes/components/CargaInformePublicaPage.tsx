import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  BookOutlined,
  CheckCircleFilled,
  FileTextOutlined,
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
  const [token] = useState(() => informesService.readTokenFromLocation());
  const [context, setContext] = useState<TeacherInformeContext | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(
    token ? null : 'No se proporcionó ningún enlace de acceso.',
  );
  const [reloadCount, setReloadCount] = useState(0);
  const [submission, setSubmission] = useState<InformeSubmissionResult | null>(null);

  const handleAccessDenied = useCallback(() => {
    setContext(null);
    setError('El enlace ya no está disponible.');
  }, []);

  const handleReportSubmitted = useCallback((result: InformeSubmissionResult) => {
    setSubmission(result);
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    informesService
      .getTeacherContext(token)
      .then((result) => {
        if (!active) return;
        setContext(result);
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
  }, [reloadCount, token]);

  const reloadContext = () => {
    setLoading(true);
    setError(null);
    setReloadCount((current) => current + 1);
  };

  const dataSource = useMemo(
    () => (token ? informesService.createTeacherDataSource(token) : null),
    [token],
  );

  const access = useMemo(
    () => (
      context && dataSource
        ? createMagicLinkInformeAccess(dataSource, handleAccessDenied, handleReportSubmitted)
        : null
    ),
    [context, dataSource, handleAccessDenied, handleReportSubmitted],
  );

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
            title="Informe enviado correctamente"
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
            subTitle={error || 'No tenés autorización para acceder a este informe.'}
            extra={token ? <Button onClick={reloadContext}>Reintentar</Button> : undefined}
          />
        </Card>
      </div>
    );
  }

  const { instancia, curso, materia, plantilla, items, alumnos, ciclo } = context;
  const tipoMeta = TIPOS_INFORME_META[instancia.tipoInforme];
  const teacherFullName = `${instancia.docenteNombre} ${instancia.docenteApellido}`.trim();

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
                  {teacherFullName}
                </Title>
                <Text style={{ color: '#e0e7ff' }}>
                  {tipoMeta?.titulo || 'Carga de informe'} · Ciclo {ciclo.ano}
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} lg={11}>
            <div className={styles.metadataContainer}>
              <div className={styles.courseCard}>
                <UserOutlined style={{ fontSize: 18, color: '#bfdbfe' }} />
                <div>
                  <Text
                    style={{
                      display: 'block',
                      color: '#bfdbfe',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    GRADO Y TURNO
                  </Text>
                  <Text
                    style={{
                      display: 'block',
                      color: '#ffffff',
                      fontSize: 16,
                      fontWeight: 800,
                      lineHeight: 1.3,
                    }}
                  >
                    {curso.nombre} · {curso.turno}
                  </Text>
                </div>
              </div>
              <div className={styles.periodCard}>
                {materia ? (
                  <BookOutlined style={{ fontSize: 18, color: '#dbeafe' }} />
                ) : (
                  <FileTextOutlined style={{ fontSize: 18, color: '#dbeafe' }} />
                )}
                <div>
                  <Text
                    style={{
                      display: 'block',
                      color: '#dbeafe',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    {materia ? 'ÁREA ESPECIAL' : 'ALCANCE'}
                  </Text>
                  <Text
                    style={{
                      display: 'block',
                      color: '#ffffff',
                      fontSize: 16,
                      fontWeight: 800,
                      lineHeight: 1.3,
                    }}
                  >
                    {materia ? materia.nombre : tipoMeta?.tituloCorto}
                  </Text>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {!!context.cursadasPendientes.length && (
        <Alert
          type="warning"
          showIcon
          title="Cursadas por confirmar"
          description="Dirección debe confirmar los bimestres evaluables antes de la entrega. Podés continuar guardando el borrador. Una vez confirmados, guardá tus cambios y volvé a abrir el enlace para actualizar la lista."
        />
      )}

      {alumnos.length === 0 ? (
        <Card className={ui.emptyPanel}>
          <Text type="secondary">No hay estudiantes evaluables en este informe.</Text>
        </Card>
      ) : (
        <VistaInformePorAlumno
          plantilla={plantilla}
          items={items}
          alumnos={alumnos}
          access={access}
          workflowRevision={instancia.revision}
        />
      )}
    </div>
  );
};
