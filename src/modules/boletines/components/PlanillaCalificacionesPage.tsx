import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Select,
  Button,
  Table,
  Typography,
  Space,
  Tag,
  App,
  Switch,
  InputNumber,
  Input,
  Tooltip,
  Row,
  Col,
  Empty,
  Spin,
  Segmented,
} from 'antd';
import {
  SaveOutlined,
  BookOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  UserSwitchOutlined,
  LeftOutlined,
  RightOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { boletinService } from '../services/boletin.service';
import { VistaPorAlumno } from './VistaPorAlumno';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import type {
  CursoMateria,
  Periodo,
  ValorEscala,
  CriterioEvaluacion,
  AlumnoInscriptoRow,
  FilaCalificacionMateria,
  FilaCierreAsistencia,
} from '../models/boletin.model';
import { useAppStore } from '../../../store/appStore';

export const PlanillaCalificacionesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { cicloActual } = useAppStore();

  // Modo de vista: 'materia' (sábana grupal) vs 'alumno' (carga integral individual)
  const [modoVista, setModoVista] = useState<'materia' | 'alumno'>('materia');

  // Estados de Contexto y Filtros
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(null);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string | null>(null);

  // Estados de Materias y Pestaña activa
  const [cursoMaterias, setCursoMaterias] = useState<CursoMateria[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>(''); // cursoMateriaId o 'asistencias'

  // Referencia y estado de scroll para el carrusel de materias
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Datos del Curso activo
  const [valoresEscala, setValoresEscala] = useState<ValorEscala[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoInscriptoRow[]>([]);
  const [criteriosMateria, setCriteriosMateria] = useState<CriterioEvaluacion[]>([]);

  // Estados de Filas de la Matriz (Calificaciones)
  const [filasCalificaciones, setFilasCalificaciones] = useState<FilaCalificacionMateria[]>([]);
  // Estados de Filas de Cierre (Asistencias y Observaciones)
  const [filasAsistencias, setFilasAsistencias] = useState<FilaCierreAsistencia[]>([]);

  // Estados de Carga y Guardado
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [loadingMatriz, setLoadingMatriz] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Cargar Cursos
  useEffect(() => {
    const loadCursos = async () => {
      try {
        setLoadingCursos(true);
        const data = await boletinService.getCursos();
        setCursos(data);
        if (data.length > 0) {
          setSelectedCursoId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        message.error('Error al cargar cursos');
      } finally {
        setLoadingCursos(false);
      }
    };
    loadCursos();
  }, []);

  // 2. Cargar Períodos del Ciclo Activo
  useEffect(() => {
    const loadPeriodos = async () => {
      if (!cicloActual?.id) return;
      try {
        setLoadingPeriodos(true);
        const data = await boletinService.getPeriodosByCiclo(cicloActual.id);
        setPeriodos(data);
        if (data.length > 0) {
          setSelectedPeriodoId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        message.error('Error al cargar períodos escolares');
      } finally {
        setLoadingPeriodos(false);
      }
    };
    loadPeriodos();
  }, [cicloActual?.id]);

  // 3. Al cambiar Curso: Cargar Materias del Curso y Valores de Escala
  useEffect(() => {
    const loadCursoData = async () => {
      if (!selectedCursoId) return;
      try {
        const cur = cursos.find((c) => c.id === selectedCursoId);
        // Cargar materias asignadas
        const materias = await boletinService.getMateriasByCurso(selectedCursoId);
        setCursoMaterias(materias);

        // Cargar escala de calificación del curso si tiene
        if (cur?.escalaId) {
          const vals = await boletinService.getValoresByEscala(cur.escalaId);
          setValoresEscala(vals);
        } else {
          // Si no tiene escala específica, cargar primera escala disponible
          const escalas = await boletinService.getEscalasCalificacion();
          if (escalas.length > 0) {
            const vals = await boletinService.getValoresByEscala(escalas[0].id);
            setValoresEscala(vals);
          } else {
            setValoresEscala([]);
          }
        }

        // Cargar alumnos regulares
        const regularAlumnos = await boletinService.getAlumnosRegularesByCurso(selectedCursoId);
        setAlumnos(regularAlumnos);

        // Pestaña inicial
        if (materias.length > 0) {
          setActiveTabKey(materias[0].id);
        } else {
          setActiveTabKey('asistencias');
        }
      } catch (err) {
        console.error(err);
        message.error('Error al cargar datos del curso');
      }
    };

    loadCursoData();
  }, [selectedCursoId, cursos]);

  // 4. Cargar Matriz según Pestaña activa (Materia o Asistencias) y Período
  const loadMatrizData = useCallback(async () => {
    if (!selectedCursoId || !selectedPeriodoId || alumnos.length === 0) return;

    try {
      setLoadingMatriz(true);

      if (activeTabKey === 'asistencias') {
        // Cargar cierres de asistencia
        const cierresMap = await boletinService.getCierresPeriodoByPeriodo(selectedPeriodoId);

        const filas: FilaCierreAsistencia[] = alumnos.map((alu) => {
          const cierre = cierresMap[alu.inscripcionId];
          return {
            inscripcionId: alu.inscripcionId,
            alumno: alu,
            cierreId: cierre?.id,
            asistencias: cierre?.asistencias ?? 0,
            inasistenciasJustificadas: cierre?.inasistenciasJustificadas ?? 0,
            inasistenciasInjustificadas: cierre?.inasistenciasInjustificadas ?? 0,
            observaciones: cierre?.observaciones || '',
            isModified: false,
          };
        });

        setFilasAsistencias(filas);
      } else if (activeTabKey) {
        // Cargar criterios de la materia seleccionada
        const crits = await boletinService.getCriteriosByCursoMateria(activeTabKey);
        setCriteriosMateria(crits);

        // Cargar evaluaciones cargadas para esta materia y periodo
        const evalMap = await boletinService.getMatrizEvaluacionesByCursoMateriaAndPeriodo(
          activeTabKey,
          selectedPeriodoId
        );

        const filas: FilaCalificacionMateria[] = alumnos.map((alu) => {
          const ev = evalMap[alu.inscripcionId];
          return {
            inscripcionId: alu.inscripcionId,
            alumno: alu,
            evaluacionMateriaId: ev?.evaluacionMateriaId,
            ppi: ev?.ppi ?? false,
            calificacionGeneralId: ev?.calificacionGeneralId ?? null,
            criteriosValores: ev?.criteriosValores ? { ...ev.criteriosValores } : {},
            isModified: false,
          };
        });

        setFilasCalificaciones(filas);
      }
    } catch (err) {
      console.error(err);
      message.error('Error al cargar la matriz de calificaciones');
    } finally {
      setLoadingMatriz(false);
    }
  }, [selectedCursoId, selectedPeriodoId, activeTabKey, alumnos]);

  useEffect(() => {
    loadMatrizData();
  }, [loadMatrizData]);

  // Manejadores de cambios en Calificaciones de Materia
  const handleCriterioChange = (inscripcionId: string, criterioId: string, valorEscalaId: string | null) => {
    setFilasCalificaciones((prev) =>
      prev.map((f) => {
        if (f.inscripcionId !== inscripcionId) return f;
        const newCriterios = { ...f.criteriosValores };
        if (valorEscalaId) {
          newCriterios[criterioId] = valorEscalaId;
        } else {
          delete newCriterios[criterioId];
        }
        return {
          ...f,
          criteriosValores: newCriterios,
          isModified: true,
        };
      })
    );
  };

  const handlePpiChange = (inscripcionId: string, ppi: boolean) => {
    setFilasCalificaciones((prev) =>
      prev.map((f) => (f.inscripcionId === inscripcionId ? { ...f, ppi, isModified: true } : f))
    );
  };

  const handleCalificacionGeneralChange = (inscripcionId: string, calificacionGeneralId: string | null) => {
    setFilasCalificaciones((prev) =>
      prev.map((f) =>
        f.inscripcionId === inscripcionId ? { ...f, calificacionGeneralId, isModified: true } : f
      )
    );
  };

  // Manejadores de cambios en Asistencias
  const handleAsistenciaChange = (
    inscripcionId: string,
    field: 'asistencias' | 'inasistenciasJustificadas' | 'inasistenciasInjustificadas' | 'observaciones',
    val: number | string
  ) => {
    setFilasAsistencias((prev) =>
      prev.map((f) => (f.inscripcionId === inscripcionId ? { ...f, [field]: val, isModified: true } : f))
    );
  };

  // Detectar cambios no guardados
  const hasCalificacionesChanges = useMemo(
    () => filasCalificaciones.some((f) => f.isModified),
    [filasCalificaciones]
  );
  const hasAsistenciasChanges = useMemo(
    () => filasAsistencias.some((f) => f.isModified),
    [filasAsistencias]
  );

  // Guardar Calificaciones de la Materia
  const handleSaveCalificaciones = async () => {
    if (!activeTabKey || activeTabKey === 'asistencias' || !selectedPeriodoId) return;

    try {
      setSaving(true);
      await boletinService.saveMatrizCalificacionesBatch(
        activeTabKey,
        selectedPeriodoId,
        filasCalificaciones
      );
      message.success('Calificaciones de la materia guardadas con éxito');
      setFilasCalificaciones((prev) => prev.map((f) => ({ ...f, isModified: false })));
    } catch (err) {
      console.error(err);
      message.error('Error al guardar las calificaciones');
    } finally {
      setSaving(false);
    }
  };

  // Guardar Asistencias y Cierre
  const handleSaveAsistencias = async () => {
    if (!selectedPeriodoId) return;

    try {
      setSaving(true);
      await boletinService.saveCierresPeriodoBatch(selectedPeriodoId, filasAsistencias);
      message.success('Cierres de asistencia y observaciones guardados con éxito');
      setFilasAsistencias((prev) => prev.map((f) => ({ ...f, isModified: false })));
    } catch (err) {
      console.error(err);
      message.error('Error al guardar asistencias');
    } finally {
      setSaving(false);
    }
  };

  // Carrusel de Materias: Control de desplazamiento y botones
  const checkScrollButtons = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScrollButtons();
    const el = carouselRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollButtons, { passive: true });
    window.addEventListener('resize', checkScrollButtons);
    return () => {
      el.removeEventListener('scroll', checkScrollButtons);
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [cursoMaterias, checkScrollButtons]);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 260;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleTabChange = (key: string) => {
    if (key === activeTabKey) return;
    if (hasCalificacionesChanges && activeTabKey !== 'asistencias') {
      modal.confirm({
        title: '¿Desea cambiar de materia sin guardar?',
        content: 'Tiene calificaciones pendientes de guardar en esta materia.',
        okText: 'Cambiar de todas formas',
        okType: 'danger',
        cancelText: 'Permanecer aquí',
        onOk: () => {
          setActiveTabKey(key);
        },
      });
    } else if (hasAsistenciasChanges && activeTabKey === 'asistencias') {
      modal.confirm({
        title: '¿Desea cambiar sin guardar asistencias?',
        content: 'Tiene cambios de asistencia pendientes de guardar.',
        okText: 'Cambiar de todas formas',
        okType: 'danger',
        cancelText: 'Permanecer aquí',
        onOk: () => {
          setActiveTabKey(key);
        },
      });
    } else {
      setActiveTabKey(key);
    }
  };

  useEffect(() => {
    if (!activeTabKey || !carouselRef.current) return;
    const activeBtn = document.getElementById(`materia-tab-${activeTabKey}`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
    setTimeout(checkScrollButtons, 350);
  }, [activeTabKey, checkScrollButtons]);

  const selectedPeriodo = periodos.find((p) => p.id === selectedPeriodoId);
  const activeMateria = cursoMaterias.find((cm) => cm.id === activeTabKey);

  // Columnas para la Planilla de Calificaciones por Materia
  const columnasCalificaciones: ColumnsType<FilaCalificacionMateria> = useMemo(() => {
    const cols: ColumnsType<FilaCalificacionMateria> = [
      {
        title: (
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Nº</span>
          </div>
        ),
        key: 'orden',
        width: 50,
        align: 'center',
        fixed: 'left',
        render: (_, record) => (
          <Typography.Text strong style={{ color: '#64748b', fontSize: 12 }}>
            {record.alumno.numeroOrden ?? '—'}
          </Typography.Text>
        ),
      },
      {
        title: (
          <div style={{ padding: '4px 0', textAlign: 'left' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
              Estudiante
            </span>
          </div>
        ),
        key: 'alumno',
        width: 220,
        fixed: 'left',
        render: (_, record) => (
          <div>
            <Typography.Text strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block' }}>
              {record.alumno.nombreCompleto}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              DNI: {record.alumno.dni || 'Sin DNI'}
            </Typography.Text>
          </div>
        ),
      },
    ];

    // Agregar las columnas dinámicas para los 5 criterios configurados con numeración inline
    criteriosMateria.forEach((crit, index) => {
      const num = crit.ordenVisual || index + 1;
      cols.push({
        title: (
          <Tooltip title={`${num}. ${crit.nombre}`} placement="top">
            <div style={{ padding: '4px 2px', textAlign: 'left' }}>
              <Typography.Paragraph
                ellipsis={{ rows: 3, tooltip: false }}
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1e293b',
                  lineHeight: 1.35,
                  wordBreak: 'normal',
                }}
              >
                <span style={{ color: '#2563eb', fontWeight: 700, marginRight: 4 }}>{num}.</span>
                {crit.nombre}
              </Typography.Paragraph>
            </div>
          </Tooltip>
        ),
        key: `crit_${crit.id}`,
        width: 220,
        align: 'center',
        render: (_, record) => {
          const valActual = record.criteriosValores[crit.id] || undefined;
          return (
            <Select
              size="middle"
              placeholder="Calificar..."
              allowClear
              value={valActual}
              onChange={(val) => handleCriterioChange(record.inscripcionId, crit.id, val || null)}
              style={{ width: '100%' }}
              options={valoresEscala.map((v) => ({
                value: v.id,
                label: (
                  <Space orientation="horizontal" size={4}>
                    <Tag color="blue" style={{ margin: 0, padding: '0 6px', fontSize: 12, fontWeight: 700 }}>
                      {v.etiqueta}
                    </Tag>
                  </Space>
                ),
              }))}
            />
          );
        },
      });
    });

    // Columna PPI (Inclusión Sí / No)
    cols.push({
      title: (
        <Tooltip title="Proyecto Pedagógico Individual (Apoyo a la Inclusión en esta materia)" placement="top">
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <Tag color="purple" style={{ margin: 0, fontWeight: 700, borderRadius: 4, fontSize: 11 }}>
              PPI
            </Tag>
          </div>
        </Tooltip>
      ),
      key: 'ppi',
      width: 85,
      align: 'center',
      render: (_, record) => (
        <Switch
          size="default"
          checked={record.ppi}
          onChange={(checked) => handlePpiChange(record.inscripcionId, checked)}
          checkedChildren="SÍ"
          unCheckedChildren="NO"
          style={{ background: record.ppi ? '#7c3aed' : undefined }}
        />
      ),
    });

    // Columna Calificación General de Cierre de Bimestre
    cols.push({
      title: (
        <Tooltip title="Calificación General asignada por la docente para el cierre del bimestre (Ingreso manual)" placement="top">
          <div style={{ padding: '4px 0', textAlign: 'center' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
              Calificación General
            </span>
          </div>
        </Tooltip>
      ),
      key: 'calificacion_general',
      className: 'cys-col-calificacion-general',
      width: 180,
      align: 'center',
      render: (_, record) => {
        const valActual = record.calificacionGeneralId || undefined;
        return (
          <Select
            size="middle"
            placeholder="Nota final..."
            allowClear
            value={valActual}
            onChange={(val) => handleCalificacionGeneralChange(record.inscripcionId, val || null)}
            style={{ width: '100%' }}
            className="cys-select-calificacion-general"
            options={valoresEscala.map((v) => ({
              value: v.id,
              label: (
                <Space size={6}>
                  <Tag color="green" style={{ margin: 0, padding: '0 8px', fontWeight: 700, fontSize: 12 }}>
                    {v.etiqueta}
                  </Tag>
                </Space>
              ),
            }))}
          />
        );
      },
    });

    return cols;
  }, [criteriosMateria, valoresEscala]);

  // Columnas para la Pestaña de Asistencias y Cierre de Período
  const columnasAsistencias: ColumnsType<FilaCierreAsistencia> = [
    {
      title: '#',
      key: 'orden',
      width: 50,
      align: 'center',
      render: (_, record) => (
        <Typography.Text strong style={{ color: '#64748b', fontSize: 12 }}>
          {record.alumno.numeroOrden ?? '—'}
        </Typography.Text>
      ),
    },
    {
      title: 'Estudiante',
      key: 'alumno',
      width: 240,
      render: (_, record) => (
        <div>
          <Typography.Text strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block' }}>
            {record.alumno.nombreCompleto}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            DNI: {record.alumno.dni || 'Sin DNI'} • Legajo: {record.alumno.numeroLegajo || '—'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Asistencias',
      key: 'asistencias',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <InputNumber
          min={0}
          max={180}
          size="small"
          value={record.asistencias}
          onChange={(val) => handleAsistenciaChange(record.inscripcionId, 'asistencias', val ?? 0)}
          style={{ width: 85 }}
        />
      ),
    },
    {
      title: 'Inasistencias Justificadas',
      key: 'inasistencias_justificadas',
      width: 170,
      align: 'center',
      render: (_, record) => (
        <InputNumber
          min={0}
          max={180}
          size="small"
          value={record.inasistenciasJustificadas}
          onChange={(val) =>
            handleAsistenciaChange(record.inscripcionId, 'inasistenciasJustificadas', val ?? 0)
          }
          style={{ width: 85 }}
        />
      ),
    },
    {
      title: 'Inasistencias Injustificadas',
      key: 'inasistencias_injustificadas',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <InputNumber
          min={0}
          max={180}
          size="small"
          value={record.inasistenciasInjustificadas}
          onChange={(val) =>
            handleAsistenciaChange(record.inscripcionId, 'inasistenciasInjustificadas', val ?? 0)
          }
          style={{ width: 85 }}
        />
      ),
    },
    {
      title: 'Total Inasistencias',
      key: 'total_inasistencias',
      width: 140,
      align: 'center',
      render: (_, record) => {
        const total = record.inasistenciasJustificadas + record.inasistenciasInjustificadas;
        return (
          <Tag color={total > 0 ? 'volcano' : 'default'} style={{ fontWeight: 600, borderRadius: 4 }}>
            {total} {total === 1 ? 'falta' : 'faltas'}
          </Tag>
        );
      },
    },
    {
      title: 'Observaciones Generales del Bimestre',
      key: 'observaciones',
      render: (_, record) => (
        <Input
          size="small"
          placeholder="Concepto pedagógico o notas del período..."
          value={record.observaciones}
          onChange={(e) => handleAsistenciaChange(record.inscripcionId, 'observaciones', e.target.value)}
          maxLength={250}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Barra Superior de Título y Contexto */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <Space size={10} align="center">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 20,
            }}
          >
            <TableOutlined />
          </div>
          <div>
            <Typography.Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              Carga de Calificaciones
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Libreta de calificaciones, conceptos pedagógicos y cierres de período bimestral.
            </Typography.Text>
          </div>
        </Space>
      </div>

      {/* 1. Encabezado y Filtros Principales */}
      <Card
        style={{
          borderRadius: 14,
          background: 'var(--cys-color-bg-container, #ffffff)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          {/* Selector de Curso y Período */}
          <Col xs={24} lg={14}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Typography.Text strong style={{ fontSize: 12, color: '#64748b' }}>
                    CURSO / DIVISIÓN
                  </Typography.Text>
                  <Select
                    size="middle"
                    style={{ width: '100%' }}
                    placeholder="Seleccione curso..."
                    loading={loadingCursos}
                    value={selectedCursoId}
                    onChange={(val) => setSelectedCursoId(val)}
                    options={cursos.map((c) => ({
                      value: c.id,
                      label: `${c.nombre} (${c.nivelNombre || 'Nivel'} - ${c.turno})`,
                    }))}
                  />
                </Space>
              </Col>

              <Col xs={24} sm={12}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Typography.Text strong style={{ fontSize: 12, color: '#64748b' }}>
                    PERÍODO ESCOLAR (BIMESTRE)
                  </Typography.Text>
                  <Select
                    size="middle"
                    style={{ width: '100%' }}
                    placeholder="Seleccione bimestre..."
                    loading={loadingPeriodos}
                    value={selectedPeriodoId}
                    onChange={(val) => setSelectedPeriodoId(val)}
                    options={periodos.map((p) => ({
                      value: p.id,
                      label: `${p.nombre} (Período ${p.numeroPeriodo})`,
                    }))}
                  />
                </Space>
              </Col>
            </Row>
          </Col>

          {/* Selector de Modo de Vista y Estadísticas */}
          <Col xs={24} lg={10}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <Segmented
                size="middle"
                value={modoVista}
                onChange={(val) => {
                  const nextMode = val as 'materia' | 'alumno';
                  if ((hasCalificacionesChanges || hasAsistenciasChanges) && modoVista === 'materia') {
                    modal.confirm({
                      title: '¿Desea cambiar de vista sin guardar?',
                      content: 'Tiene calificaciones pendientes de guardar en la planilla actual.',
                      okText: 'Cambiar de todas formas',
                      okType: 'danger',
                      cancelText: 'Permanecer aquí',
                      onOk: () => {
                        setModoVista(nextMode);
                      },
                    });
                  } else {
                    setModoVista(nextMode);
                  }
                }}
                options={[
                  {
                    value: 'materia',
                    label: (
                      <Space size={6} style={{ padding: '0 4px', fontWeight: 600 }}>
                        <AppstoreOutlined />
                        <span>Por Materia</span>
                      </Space>
                    ),
                  },
                  {
                    value: 'alumno',
                    label: (
                      <Space size={6} style={{ padding: '0 4px', fontWeight: 600 }}>
                        <UserSwitchOutlined />
                        <span>Por Alumno</span>
                      </Space>
                    ),
                  },
                ]}
              />

              <Tooltip title="Recargar datos">
                <Button type="text" icon={<ReloadOutlined />} onClick={loadMatrizData} />
              </Tooltip>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 2. Renderizado según Modo de Vista */}
      {!selectedCursoId ? (
        <Card style={{ textAlign: 'center', padding: 40, borderRadius: 16 }}>
          <Empty description="Seleccione un curso para visualizar la libreta de calificaciones" />
        </Card>
      ) : cursoMaterias.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40, borderRadius: 16 }}>
          <Empty description="Este curso no tiene materias asignadas. Configure la malla curricular en el Constructor de Boletines." />
        </Card>
      ) : modoVista === 'alumno' ? (
        /* VISTA POR ALUMNO (CARGA INTEGRAL INDIVIDUAL) */
        <VistaPorAlumno
          cursoId={selectedCursoId}
          periodoId={selectedPeriodoId || ''}
          alumnos={alumnos}
          cursoMaterias={cursoMaterias}
          valoresEscala={valoresEscala}
          periodo={selectedPeriodo}
        />
      ) : (
        /* VISTA POR MATERIA (SÁBANA MATRICIAL) */
        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          }}
          bodyStyle={{ padding: '0 18px 18px' }}
        >
          {/* Barra de Navegación de Materias Tipo Carrusel + Acción de Guardado */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 0',
              borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            {/* Carrusel de Materias */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <Tooltip title="Desplazar materias a la izquierda">
                <Button
                  shape="circle"
                  size="small"
                  icon={<LeftOutlined style={{ fontSize: 11 }} />}
                  onClick={() => scrollCarousel('left')}
                  disabled={!canScrollLeft}
                  style={{
                    flexShrink: 0,
                    opacity: canScrollLeft ? 1 : 0.35,
                    boxShadow: canScrollLeft ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </Tooltip>

              <div
                ref={carouselRef}
                className="cys-materia-carousel-track"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  overflowX: 'auto',
                  scrollBehavior: 'smooth',
                  padding: '4px 2px',
                  flex: 1,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {cursoMaterias.map((cm) => {
                  const isActive = activeTabKey === cm.id;
                  return (
                    <button
                      key={cm.id}
                      id={`materia-tab-${cm.id}`}
                      type="button"
                      className={`cys-materia-tab-pill ${isActive ? 'active' : ''}`}
                      onClick={() => handleTabChange(cm.id)}
                    >
                      <BookOutlined style={{ fontSize: 13 }} />
                      <span>{cm.materiaNombre}</span>
                    </button>
                  );
                })}

                <button
                  key="asistencias"
                  id="materia-tab-asistencias"
                  type="button"
                  className={`cys-materia-tab-pill asistencias ${activeTabKey === 'asistencias' ? 'active' : ''}`}
                  onClick={() => handleTabChange('asistencias')}
                >
                  <ClockCircleOutlined style={{ fontSize: 13 }} />
                  <span>Asistencias & Cierre</span>
                </button>
              </div>

              <Tooltip title="Desplazar materias a la derecha">
                <Button
                  shape="circle"
                  size="small"
                  icon={<RightOutlined style={{ fontSize: 11 }} />}
                  onClick={() => scrollCarousel('right')}
                  disabled={!canScrollRight}
                  style={{
                    flexShrink: 0,
                    opacity: canScrollRight ? 1 : 0.35,
                    boxShadow: canScrollRight ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </Tooltip>
            </div>

            {/* Botón Principal de Guardado */}
            <div style={{ flexShrink: 0 }}>
              {activeTabKey === 'asistencias' ? (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveAsistencias}
                  loading={saving}
                  disabled={!hasAsistenciasChanges && filasAsistencias.length > 0}
                  className="btn-primary-gradient"
                  style={{ borderRadius: 8, fontWeight: 600 }}
                >
                  {hasAsistenciasChanges ? 'Guardar Asistencias' : 'Asistencias Guardadas'}
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveCalificaciones}
                  loading={saving}
                  disabled={!hasCalificacionesChanges && filasCalificaciones.length > 0}
                  className="btn-primary-gradient"
                  style={{ borderRadius: 8, fontWeight: 600 }}
                >
                  {hasCalificacionesChanges
                    ? `Guardar Notas (${activeMateria?.materiaNombre || 'Materia'})`
                    : 'Planilla al Día (Guardada)'}
                </Button>
              )}
            </div>
          </div>

          {/* Banner descriptivo de la Materia */}
          {activeTabKey !== 'asistencias' && activeMateria && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '8px 14px',
                marginBottom: 14,
                background: 'rgba(37, 99, 235, 0.04)',
                border: '1px solid rgba(37, 99, 235, 0.12)',
                borderRadius: 8,
                fontSize: 12,
                color: '#334155',
                flexWrap: 'wrap',
              }}
            >
              <Space size={8}>
                <BookOutlined style={{ color: '#2563eb', fontSize: 14 }} />
                <span>
                  Evaluando <strong>{activeMateria.materiaNombre}</strong> en el{' '}
                  <strong>{selectedPeriodo?.nombre || 'Período'}</strong> ({criteriosMateria.length}{' '}
                  criterios pedagógicos oficiales).
                </span>
              </Space>

              <Space size={8} style={{ fontSize: 11, color: '#64748b' }}>
                <span>Valores de escala:</span>
                {valoresEscala.map((v) => (
                  <Tag key={v.id} color="blue" style={{ margin: 0, padding: '0 5px', fontSize: 10, borderRadius: 4 }}>
                    {v.etiqueta}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* Tabla de Calificaciones de la Materia */}
          {activeTabKey !== 'asistencias' ? (
            loadingMatriz ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin tip="Cargando planilla de calificaciones..." />
              </div>
            ) : alumnos.length === 0 ? (
              <Empty description="No hay alumnos regulares inscriptos en este curso." />
            ) : (
              <Table
                className="cys-materias-table"
                rowKey="inscripcionId"
                size="middle"
                columns={columnasCalificaciones}
                dataSource={filasCalificaciones}
                pagination={false}
                scroll={{ x: 'max-content', y: 520 }}
              />
            )
          ) : (
            /* Tabla de Asistencias y Cierre de Período */
            loadingMatriz ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin tip="Cargando cierres de asistencia..." />
              </div>
            ) : (
              <Table
                className="cys-materias-table"
                rowKey="inscripcionId"
                size="middle"
                columns={columnasAsistencias}
                dataSource={filasAsistencias}
                pagination={false}
                scroll={{ x: 900, y: 520 }}
              />
            )
          )}
        </Card>
      )}
    </div>
  );
};
