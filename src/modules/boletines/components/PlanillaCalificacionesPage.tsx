import ui from '../../../shared/styles/ui.module.css';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Select,
  Button,
  Typography,
  Space,
  Tag,
  App,
  Tooltip,
  Row,
  Col,
  Empty,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  LinkOutlined,
  CalendarOutlined,
  IdcardOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { boletinService } from '../services/boletin.service';
import { VistaPorAlumno } from './VistaPorAlumno';
import { staffGradebookAccess } from '../models/gradebookAccess.model';
import { GestorEnlacesModal } from './GestorEnlacesModal';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import type {
  CursoMateria,
  Periodo,
  ValorEscala,
  AlumnoInscriptoRow,
} from '../models/boletin.model';
import { useAppStore } from '../../../store/appStore';

const { Text } = Typography;

export const PlanillaCalificacionesPage: React.FC = () => {
  const { message } = App.useApp();
  const { cicloActual } = useAppStore();
  const [searchParams] = useSearchParams();
  const urlCursoId = searchParams.get('curso');
  const urlPeriodoId = searchParams.get('periodo');


  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(urlCursoId);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string | null>(urlPeriodoId);


  const [cursoMaterias, setCursoMaterias] = useState<CursoMateria[]>([]);
  const [valoresEscala, setValoresEscala] = useState<ValorEscala[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoInscriptoRow[]>([]);


  const [loadingCursos, setLoadingCursos] = useState(false);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [loadingCursoData, setLoadingCursoData] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);


  const [gestorEnlacesOpen, setGestorEnlacesOpen] = useState(false);


  useEffect(() => {
    let active = true;
    const fetchCursos = async () => {
      try {
        setLoadingCursos(true);
        const data = await boletinService.getCursos();
        if (!active) return;
        setCursos(data);
        if (data.length > 0) {
          setSelectedCursoId((prev) => prev || urlCursoId || data[0].id);
        }
      } catch (err) {
        console.error(err);
        message.error('Error al cargar cursos');
      } finally {
        if (active) setLoadingCursos(false);
      }
    };
    void fetchCursos();
    return () => {
      active = false;
    };
  }, [message, reloadCounter, urlCursoId]);


  useEffect(() => {
    if (!cicloActual?.id) return;
    let active = true;
    const fetchPeriodos = async () => {
      try {
        setLoadingPeriodos(true);
        const data = await boletinService.getPeriodosByCiclo(cicloActual.id);
        if (!active) return;
        setPeriodos(data);
        if (data.length > 0) {
          setSelectedPeriodoId((prev) => prev || urlPeriodoId || data[0].id);
        }
      } catch (err) {
        console.error(err);
        message.error('Error al cargar períodos escolares');
      } finally {
        if (active) setLoadingPeriodos(false);
      }
    };
    void fetchPeriodos();
    return () => {
      active = false;
    };
  }, [cicloActual?.id, message, reloadCounter, urlPeriodoId]);


  useEffect(() => {
    if (!selectedCursoId) return;
    let active = true;
    const fetchCursoData = async () => {
      try {
        setLoadingCursoData(true);
        const cur = cursos.find((c) => c.id === selectedCursoId);

        const [materias, regularAlumnos] = await Promise.all([
          boletinService.getMateriasByCurso(selectedCursoId),
          boletinService.getAlumnosRegularesByCurso(selectedCursoId),
        ]);

        if (!active) return;
        setCursoMaterias(materias);
        setAlumnos(regularAlumnos);

        if (cur?.escalaId) {
          const vals = await boletinService.getValoresByEscala(cur.escalaId);
          if (active) setValoresEscala(vals);
        } else {
          const escalas = await boletinService.getEscalasCalificacion();
          if (escalas.length > 0) {
            const vals = await boletinService.getValoresByEscala(escalas[0].id);
            if (active) setValoresEscala(vals);
          } else {
            if (active) setValoresEscala([]);
          }
        }
      } catch (err) {
        console.error(err);
        message.error('Error al cargar datos del curso');
      } finally {
        if (active) setLoadingCursoData(false);
      }
    };
    void fetchCursoData();
    return () => {
      active = false;
    };
  }, [selectedCursoId, cursos, message, reloadCounter]);

  const selectedPeriodo = useMemo(
    () => periodos.find((p) => p.id === selectedPeriodoId),
    [periodos, selectedPeriodoId]
  );



  return (
    <SectionLayout title="Carga de notas de boletines" icon={<TableOutlined />} actions={
        <Space size="middle" wrap>
          <Button
            icon={<LinkOutlined className={ui.primary} />}
            onClick={() => setGestorEnlacesOpen(true)}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Enlaces Mágicos Docentes
          </Button>
          <Tooltip title="Actualizar datos">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => setReloadCounter((c) => c + 1)}
              loading={loadingCursoData || loadingPeriodos}
            />
          </Tooltip>
        </Space>
      }>

      { }
      <Card
        style={{
          borderRadius: 14,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          border: "1px solid var(--cys-color-border-secondary)",
        }}
        styles={{ body: { padding: '14px 18px' } }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Space orientation="vertical" size={2} className={ui.fullWidth}>
              <Text strong className={ui.secondaryCaption}>
                <IdcardOutlined style={{ marginRight: 4 }} />
                CURSO / GRADO
              </Text>
              <Select
                size="middle"
                className={ui.fullWidth}
                placeholder="Seleccione curso..."
                loading={loadingCursos}
                value={selectedCursoId}
                onChange={(val) => setSelectedCursoId(val)}
                options={cursos.map((c) => ({
                  value: c.id,
                  label: `${c.nombre} (${c.turno})`,
                }))}
              />
            </Space>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Space orientation="vertical" size={2} className={ui.fullWidth}>
              <Text strong className={ui.secondaryCaption}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                PERÍODO ESCOLAR (BIMESTRE)
              </Text>
              <Select
                size="middle"
                className={ui.fullWidth}
                placeholder="Seleccione bimestre..."
                loading={loadingPeriodos}
                value={selectedPeriodoId}
                onChange={(val) => setSelectedPeriodoId(val)}
                options={periodos.map((p) => ({
                  value: p.id,
                  label: p.nombre,
                }))}
              />
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
              }}
            >
              {selectedPeriodo && (
                <Tag
                  style={{
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '5px 12px',
                    background: 'rgba(37, 99, 235, 0.08)',
                    color: 'var(--cys-color-primary-text)',
                    border: '1px solid rgba(37, 99, 235, 0.22)',
                    boxShadow: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    margin: 0,
                  }}
                >
                  <CalendarOutlined style={{ fontSize: 13, color: 'var(--cys-color-primary-text)' }} />
                  <span>{selectedPeriodo.numeroPeriodo}° Bimestre</span>
                </Tag>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      { }
      {!selectedCursoId ? (
        <Card className={ui.emptyPanel}>
          <Empty description="Seleccione un curso para visualizar la libreta de calificaciones" />
        </Card>
      ) : loadingCursoData ? (
        <Card className={ui.loadingPanel}>
          <Spin description="Cargando materias y estudiantes del curso..." />
        </Card>
      ) : cursoMaterias.length === 0 ? (
        <Card className={ui.emptyPanel}>
          <Empty description="Este curso no tiene materias asignadas. Configure la malla curricular en el Constructor de Boletines." />
        </Card>
      ) : (
        <VistaPorAlumno
          periodoId={selectedPeriodoId || ''}
          alumnos={alumnos}
          cursoMaterias={cursoMaterias}
          valoresEscala={valoresEscala}
          periodo={selectedPeriodo}
          access={staffGradebookAccess}
        />
      )}

      { }
      <GestorEnlacesModal
        open={gestorEnlacesOpen}
        onClose={() => setGestorEnlacesOpen(false)}
        cursos={cursos}
        periodos={periodos}
        activeCursoId={selectedCursoId}
        activePeriodoId={selectedPeriodoId}
      />
    </SectionLayout>
  );
};
