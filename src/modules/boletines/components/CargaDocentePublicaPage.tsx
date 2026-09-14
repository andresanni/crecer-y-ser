import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Result,
  Row,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import ui from '../../../shared/styles/ui.module.css';
import { createMagicLinkGradebookAccess } from '../models/gradebookAccess.model';
import {
  accesoDocenteService,
  TeacherAccessDeniedError,
  type TeacherGradebookContext,
} from '../services/accesoDocente.service';
import { VistaPorAlumno } from './VistaPorAlumno';

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

  const handleAccessDenied = useCallback(() => {
    setContext(null);
    setError('El enlace expiró o fue desactivado por el equipo directivo.');
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
          ? 'El enlace es inválido, expiró o fue desactivado por el equipo directivo.'
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

  const dataSource = useMemo(() => (
    token && context ? accesoDocenteService.createDataSource(token, context) : null
  ), [context, token]);

  const access = useMemo(() => (
    context && dataSource
      ? createMagicLinkGradebookAccess(Boolean(context.acceso.materiaId), dataSource, handleAccessDenied)
      : null
  ), [context, dataSource, handleAccessDenied]);

  if (loading) {
    return (
      <div className={ui.publicPage}>
        <Card className={ui.loadingPanel}>
          <Spin size="large" description="Validando el acceso y preparando la planilla..." />
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
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(30, 64, 175, 0.18)',
        }}
        styles={{ body: { padding: '18px 24px' } }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} lg={13}>
            <Space size={16} align="center">
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: '#ffffff',
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                }}
              >
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
                <Title level={3} style={{ color: '#ffffff', margin: 0, fontSize: 22 }}>
                  {acceso.docenteNombre}
                </Title>
                <Text style={{ color: '#e0e7ff' }}>Carga de boletín</Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={11}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Tag icon={<UserOutlined />} color="blue">{curso.nombre} ({curso.turno})</Tag>
              <Tag icon={<CalendarOutlined />} color="geekblue">{periodo.nombre}</Tag>
              {acceso.materiaNombre && (
                <Tag icon={<BookOutlined />} color="green">{acceso.materiaNombre}</Tag>
              )}
              <Tooltip title="Actualizar datos">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    message.info('Actualizando planilla...');
                    reloadContext();
                  }}
                  aria-label="Actualizar datos de la planilla"
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {alumnos.length === 0 ? (
        <Card className={ui.emptyPanel}>
          <Text type="secondary">No hay estudiantes regulares en el alcance de este enlace.</Text>
        </Card>
      ) : (
        <VistaPorAlumno
          periodoId={periodo.id}
          alumnos={alumnos}
          cursoMaterias={materias}
          valoresEscala={valoresEscala}
          periodo={periodo}
          access={access}
        />
      )}
    </div>
  );
};
