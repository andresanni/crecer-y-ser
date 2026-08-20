import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  App,
  Tooltip,
  Row,
  Col,
  Spin,
  Result,
} from 'antd';
import {
  BookOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import pb from '../../../core/pocketbase';
import { boletinService } from '../services/boletin.service';
import { VistaPorAlumno } from './VistaPorAlumno';
import type {
  CursoMateria,
  Periodo,
  ValorEscala,
  AlumnoInscriptoRow,
  TokenAccesoDocente,
} from '../models/boletin.model';
import type { Curso } from '../../inscripciones/models/inscripcion.model';

const { Title, Text } = Typography;

export const CargaDocentePublicaPage: React.FC = () => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const tokenQuery = searchParams.get('token');

  // Estados de Validación de Token
  const [validating, setValidating] = useState<boolean>(true);
  const [tokenData, setTokenData] = useState<TokenAccesoDocente | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Datos del Curso y Período habilitados por el token
  const [curso, setCurso] = useState<Curso | null>(null);
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [cursoMaterias, setCursoMaterias] = useState<CursoMateria[]>([]);
  const [valoresEscala, setValoresEscala] = useState<ValorEscala[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoInscriptoRow[]>([]);

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [reloadCounter, setReloadCounter] = useState<number>(0);

  // 1. Validar el token en el montaje
  useEffect(() => {
    const validateToken = async () => {
      if (!tokenQuery) {
        setTokenError('No se proporcionó ningún token de acceso.');
        setValidating(false);
        return;
      }

      try {
        setValidating(true);
        const tok = await boletinService.validarTokenAccesoDocente(tokenQuery);
        if (!tok) {
          setTokenError('El enlace es inválido, ha expirado o fue desactivado por el equipo directivo.');
        } else {
          setTokenData(tok);
        }
      } catch (err) {
        console.error(err);
        setTokenError('Error al validar enlace docente. Por favor, reintente.');
      } finally {
        setValidating(false);
      }
    };

    void validateToken();
  }, [tokenQuery]);

  // 2. Al validar token con éxito: Cargar datos del curso, materias y alumnos
  useEffect(() => {
    if (!tokenData) return;
    let active = true;

    const loadContext = async () => {
      try {
        setLoadingData(true);

        // Preconfigurar período con los datos del token expandido
        if (tokenData.periodoNombre || tokenData.periodoId) {
          let numPer = tokenData.numeroPeriodo || 1;
          try {
            if (tokenData.periodoId) {
              const perRec = await pb.collection('periodos').getOne(tokenData.periodoId);
              if (perRec && perRec.numero_periodo) {
                numPer = Number(perRec.numero_periodo);
              }
            }
          } catch (e) {
            console.warn('[MagicLink] Usando numeroPeriodo expandido del token:', e);
          }

          if (active) {
            setPeriodo({
              id: tokenData.periodoId,
              cicloId: '',
              nombre: tokenData.periodoNombre || 'Período Activo',
              numeroPeriodo: numPer,
              createdAt: '',
              updatedAt: '',
            });
          }
        }

        // Cargar cursos para obtener escala y turno
        let cur: Curso | null = null;
        try {
          const cursosList = await boletinService.getCursos();
          cur = cursosList.find((c) => c.id === tokenData.cursoId) || null;
          if (active) setCurso(cur);
        } catch (err) {
          console.warn('[MagicLink] Error cargando cursos:', err);
        }

        // Cargar materias del curso
        try {
          let materias = await boletinService.getMateriasByCurso(tokenData.cursoId);
          if (tokenData.materiaId) {
            materias = materias.filter((m) => m.materiaId === tokenData.materiaId);
          }
          if (active) setCursoMaterias(materias);
        } catch (err) {
          console.warn('[MagicLink] Error cargando materias:', err);
        }

        // Cargar escala de calificación
        try {
          if (cur?.escalaId) {
            const vals = await boletinService.getValoresByEscala(cur.escalaId);
            if (active) setValoresEscala(vals);
          } else {
            const escalas = await boletinService.getEscalasCalificacion();
            if (escalas.length > 0) {
              const vals = await boletinService.getValoresByEscala(escalas[0].id);
              if (active) setValoresEscala(vals);
            }
          }
        } catch (err) {
          console.warn('[MagicLink] Error cargando escala:', err);
        }

        // Cargar alumnos inscritos en el curso
        try {
          const regularAlumnos = await boletinService.getAlumnosRegularesByCurso(tokenData.cursoId);
          if (active) setAlumnos(regularAlumnos);
        } catch (err) {
          console.error('[MagicLink] Error cargando alumnos del curso:', err);
          message.error('No se pudo cargar la lista de alumnos. Verifique los permisos de API.');
        }
      } catch (err) {
        console.error(err);
        message.error('Error al inicializar la planilla docente.');
      } finally {
        if (active) setLoadingData(false);
      }
    };

    void loadContext();
    return () => {
      active = false;
    };
  }, [tokenData, message, reloadCounter]);

  // Pantalla de validación en curso
  if (validating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Card style={{ padding: '40px 60px', textAlign: 'center', borderRadius: 16 }}>
          <Spin size="large" tip="Validando enlace de acceso docente..." />
        </Card>
      </div>
    );
  }

  // Pantalla de error de token
  if (tokenError || !tokenData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: 20 }}>
        <Card style={{ maxWidth: 540, width: '100%', borderRadius: 16, textAlign: 'center' }}>
          <Result
            status="403"
            title="Enlace No Válido o Expirado"
            subTitle={tokenError || 'No tiene autorización para acceder a esta planilla.'}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Banner de Cabecera Docente */}
      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(30, 64, 175, 0.18)',
        }}
        bodyStyle={{ padding: '18px 24px' }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 12]}>
          <Col xs={24} md={16}>
            <Space size={8} align="center" style={{ marginBottom: 4 }}>
              <CheckCircleFilled style={{ color: '#6ee7b7', fontSize: 16 }} />
              <Text style={{ color: '#bfdbfe', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Acceso Docente Autorizado
              </Text>
            </Space>
            <Title level={3} style={{ color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>
              {tokenData.docenteNombre}
            </Title>
            <Text style={{ color: '#e0e7ff', fontSize: 13.5, fontWeight: 500 }}>
              Carga de boletín
            </Text>
          </Col>

          <Col xs={24} md={8} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {curso && (
                <Tag style={{ background: 'rgba(255, 255, 255, 0.22)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.35)', fontSize: 13, padding: '5px 12px', borderRadius: 8, fontWeight: 700 }}>
                  <UserOutlined style={{ marginRight: 5 }} />
                  {curso.nombre} ({curso.turno})
                </Tag>
              )}
              {periodo && (
                <Tag style={{ background: 'rgba(255, 255, 255, 0.22)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.35)', fontSize: 13, padding: '5px 12px', borderRadius: 8, fontWeight: 700 }}>
                  <CalendarOutlined style={{ marginRight: 5 }} />
                  {periodo.nombre}
                </Tag>
              )}
              {tokenData.materiaNombre && (
                <Tag style={{ background: '#10b981', color: '#ffffff', border: 'none', fontSize: 13, padding: '5px 12px', borderRadius: 8, fontWeight: 700 }}>
                  <BookOutlined style={{ marginRight: 5 }} />
                  {tokenData.materiaNombre}
                </Tag>
              )}
            </div>

            <Tooltip title="Actualizar datos">
              <Button
                icon={<ReloadOutlined style={{ color: '#ffffff' }} />}
                type="text"
                onClick={() => setReloadCounter((c) => c + 1)}
                loading={loadingData}
                style={{ background: 'rgba(255, 255, 255, 0.2)', borderRadius: 8 }}
              />
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* Contenido Principal: Carga Integral por Alumno */}
      {loadingData ? (
        <Card style={{ textAlign: 'center', padding: 60, borderRadius: 16 }}>
          <Spin tip="Cargando planilla de calificaciones y estudiantes..." />
        </Card>
      ) : alumnos.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40, borderRadius: 16 }}>
          <Text type="secondary">No se encontraron estudiantes regulares inscriptos en este curso.</Text>
        </Card>
      ) : (
        <VistaPorAlumno
          cursoId={tokenData.cursoId}
          periodoId={tokenData.periodoId}
          alumnos={alumnos}
          cursoMaterias={cursoMaterias}
          valoresEscala={valoresEscala}
          periodo={periodo || undefined}
        />
      )}
    </div>
  );
};
