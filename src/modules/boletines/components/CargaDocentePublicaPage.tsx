import ui from '../../../shared/styles/ui.module.css';
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


  const [validating, setValidating] = useState<boolean>(true);
  const [tokenData, setTokenData] = useState<TokenAccesoDocente | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);


  const [curso, setCurso] = useState<Curso | null>(null);
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [cursoMaterias, setCursoMaterias] = useState<CursoMateria[]>([]);
  const [valoresEscala, setValoresEscala] = useState<ValorEscala[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoInscriptoRow[]>([]);

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [reloadCounter, setReloadCounter] = useState<number>(0);


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


  useEffect(() => {
    if (!tokenData) return;
    let active = true;

    const loadContext = async () => {
      try {
        setLoadingData(true);


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


        let cur: Curso | null = null;
        try {
          const cursosList = await boletinService.getCursos();
          cur = cursosList.find((c) => c.id === tokenData.cursoId) || null;
          if (active) setCurso(cur);
        } catch (err) {
          console.warn('[MagicLink] Error cargando cursos:', err);
        }


        try {
          let materias = await boletinService.getMateriasByCurso(tokenData.cursoId);
          if (tokenData.materiaId) {
            materias = materias.filter((m) => m.materiaId === tokenData.materiaId);
          }
          if (active) setCursoMaterias(materias);
        } catch (err) {
          console.warn('[MagicLink] Error cargando materias:', err);
        }


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


  if (validating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Card style={{ padding: '40px 60px', textAlign: 'center', borderRadius: 16 }}>
          <Spin size="large" tip="Validando enlace de acceso docente..." />
        </Card>
      </div>
    );
  }


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
    <div className={ui.publicPage}>
      { }
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
                  flexShrink: 0,
                }}
              >
                <img
                  src="/isotype.png"
                  alt="Colegio Crecer y Ser"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div>
                <Space size={6} align="center" style={{ marginBottom: 2 }}>
                  <CheckCircleFilled style={{ color: '#6ee7b7', fontSize: 13 }} />
                  <Text style={{ color: '#bfdbfe', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Colegio Crecer y Ser • Acceso Docente
                  </Text>
                </Space>
                <Title level={3} style={{ color: '#ffffff', margin: 0, letterSpacing: '-0.3px', fontSize: 22, fontWeight: 700 }}>
                  {tokenData.docenteNombre}
                </Title>
                <Text style={{ color: '#e0e7ff', fontSize: 13.5, fontWeight: 500 }}>
                  Carga de boletín
                </Text>
              </div>
            </div>
          </Col>

          <Col xs={24} lg={11} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
              {curso && (
                <Tag
                  style={{
                    background: 'rgba(255, 255, 255, 0.22)',
                    color: '#ffffff',
                    border: '1.5px solid rgba(255, 255, 255, 0.4)',
                    fontSize: 14.5,
                    padding: '6px 14px',
                    borderRadius: 10,
                    fontWeight: 700,
                    margin: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <UserOutlined style={{ fontSize: 15 }} />
                  <span>{curso.nombre} ({curso.turno})</span>
                </Tag>
              )}
              {periodo && (
                <Tag
                  style={{
                    background: 'rgba(255, 255, 255, 0.22)',
                    color: '#ffffff',
                    border: '1.5px solid rgba(255, 255, 255, 0.4)',
                    fontSize: 14.5,
                    padding: '6px 14px',
                    borderRadius: 10,
                    fontWeight: 700,
                    margin: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CalendarOutlined style={{ fontSize: 15 }} />
                  <span>{periodo.nombre}</span>
                </Tag>
              )}
              {tokenData.materiaNombre && (
                <Tag
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: '1.5px solid #34d399',
                    fontSize: 14.5,
                    padding: '6px 14px',
                    borderRadius: 10,
                    fontWeight: 700,
                    margin: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <BookOutlined style={{ fontSize: 15 }} />
                  <span>{tokenData.materiaNombre}</span>
                </Tag>
              )}
            </div>

            <Tooltip title="Actualizar datos">
              <Button
                icon={<ReloadOutlined style={{ color: '#ffffff', fontSize: 15 }} />}
                type="text"
                onClick={() => setReloadCounter((c) => c + 1)}
                loading={loadingData}
                style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  border: '1.5px solid rgba(255, 255, 255, 0.35)',
                  borderRadius: 10,
                  height: 38,
                  width: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              />
            </Tooltip>
          </Col>
        </Row>
      </Card>

      { }
      {loadingData ? (
        <Card className={ui.loadingPanel}>
          <Spin tip="Cargando planilla de calificaciones y estudiantes..." />
        </Card>
      ) : alumnos.length === 0 ? (
        <Card className={ui.emptyPanel}>
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
