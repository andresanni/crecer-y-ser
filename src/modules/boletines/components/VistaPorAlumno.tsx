import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  Select,
  Button,
  Typography,
  Space,
  Tag,
  App,
  Switch,
  InputNumber,
  Input,
  Row,
  Col,
  Empty,
  Spin,
  Tooltip,
  Divider,
  Progress,
  Drawer,
  Segmented,
  Popover,
} from 'antd';
import {
  SaveOutlined,
  BookOutlined,
  LeftOutlined,
  RightOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  FlagOutlined,
  TrophyOutlined,
  DashboardOutlined,
  ArrowRightOutlined,
  DownOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { boletinService } from '../services/boletin.service';
import {
  esMateriaConducta,
  type CursoMateria,
  type Periodo,
  type ValorEscala,
  type CriterioEvaluacion,
  type AlumnoInscriptoRow,
  type ProgresoAlumnoDetalle,
  type ProgresoCursoResumen,
  type EstadoProgresoAlumno,
} from '../models/boletin.model';

interface VistaPorAlumnoProps {
  cursoId: string;
  periodoId: string;
  alumnos: AlumnoInscriptoRow[];
  cursoMaterias: CursoMateria[];
  valoresEscala: ValorEscala[];
  periodo: Periodo | undefined;
}

interface MateriaAlumnoState {
  evaluacionMateriaId?: string;
  ppi: boolean;
  calificacionGeneralId: string | null;
  criteriosValores: Record<string, string>; // criterioId -> valorEscalaId
  isModified?: boolean;
}

interface AsistenciaAlumnoState {
  cierreId?: string;
  asistencias: number;
  inasistencias: number;
  llegadasTarde: number;
  observaciones: string;
  isModified?: boolean;
}

interface ApoyoInclusionState {
  promocionoConAcompanamiento: string; // 'SI' | 'NO' | '-'
  poseeApoyos: string; // 'SI' | 'NO' | '-'
  cualesApoyos: string;
  isModified?: boolean;
}

export const VistaPorAlumno: React.FC<VistaPorAlumnoProps> = ({
  periodoId,
  alumnos,
  cursoMaterias,
  valoresEscala,
  periodo,
}) => {
  const { message, modal } = App.useApp();

  // Helper para asignar colores según la escala de notas
  const getEtiquetaColor = useCallback((etiqueta: string) => {
    const label = etiqueta.toLowerCase();
    if (label.includes('destacado')) return { color: '#047857' };
    if (label.includes('avanzado')) return { color: '#1d4ed8' };
    if (label.includes('alcanzado') || label.includes('logrado')) return { color: '#0369a1' };
    if (label.includes('proceso')) return { color: '#b45309' };
    return { color: '#b91c1c' };
  }, []);

  const getClassNameForValor = useCallback((valorId?: string | null) => {
    if (!valorId) return 'cys-grade-select';
    const val = valoresEscala.find((v) => v.id === valorId);
    if (!val) return 'cys-grade-select';
    const label = val.etiqueta.toLowerCase();
    if (label.includes('destacado')) return 'cys-grade-select cys-grade-destacado';
    if (label.includes('avanzado')) return 'cys-grade-select cys-grade-avanzado';
    if (label.includes('alcanzado') || label.includes('logrado')) return 'cys-grade-select cys-grade-alcanzado';
    if (label.includes('proceso')) return 'cys-grade-select cys-grade-proceso';
    return 'cys-grade-select cys-grade-no-alcanzado';
  }, [valoresEscala]);

  // Alumno seleccionado actualmente
  const [selectedInscripcionId, setSelectedInscripcionId] = useState<string | null>(null);

  // Criterios de todas las materias del curso { cursoMateriaId: CriterioEvaluacion[] }
  const [criteriosMap, setCriteriosMap] = useState<Record<string, CriterioEvaluacion[]>>({});
  const [loadingCriterios, setLoadingCriterios] = useState<boolean>(false);

  // Estado de evaluación de las materias para el alumno seleccionado
  const [materiasState, setMateriasState] = useState<Record<string, MateriaAlumnoState>>({});
  // Estado de cierre de asistencias para el alumno seleccionado
  const [asistenciaState, setAsistenciaState] = useState<AsistenciaAlumnoState>({
    asistencias: 0,
    inasistencias: 0,
    llegadasTarde: 0,
    observaciones: '',
    isModified: false,
  });
  // Estado del informe sobre dispositivos de apoyo e integración escolar (anual en inscripciones)
  const [apoyoState, setApoyoState] = useState<ApoyoInclusionState>({
    promocionoConAcompanamiento: '-',
    poseeApoyos: '-',
    cualesApoyos: '',
    isModified: false,
  });

  // Estados de Progreso del Curso (Guía Visual & Semáforos)
  const [progresoMap, setProgresoMap] = useState<Record<string, ProgresoAlumnoDetalle>>({});
  const [progresoResumen, setProgresoResumen] = useState<ProgresoCursoResumen>({
    totalAlumnos: alumnos.length,
    completadosCount: 0,
    enProgresoCount: 0,
    sinIniciarCount: alumnos.length,
    porcentajeGlobal: 0,
  });
  const [drawerResumenOpen, setDrawerResumenOpen] = useState<boolean>(false);
  const [filtroDrawer, setFiltroDrawer] = useState<'TODOS' | 'PENDIENTES' | 'COMPLETOS'>('TODOS');

  // Selector desplegable en el Sticky Banner
  const [stickySelectorOpen, setStickySelectorOpen] = useState<boolean>(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  const searchedAlumnos = useMemo(() => {
    if (!studentSearchQuery.trim()) return alumnos;
    const q = studentSearchQuery.toLowerCase().trim();
    return alumnos.filter((a) => {
      const matchName = a.nombreCompleto.toLowerCase().includes(q);
      const matchOrder = a.numeroOrden ? String(a.numeroOrden).includes(q) : false;
      return matchName || matchOrder;
    });
  }, [alumnos, studentSearchQuery]);

  // Referencias para el scroll de la tira de alumnos
  const pillsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollPillsLeft, setCanScrollPillsLeft] = useState(false);
  const [canScrollPillsRight, setCanScrollPillsRight] = useState(false);

  const checkPillsScroll = useCallback(() => {
    const el = pillsContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollPillsLeft(scrollLeft > 6);
    setCanScrollPillsRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  const scrollPills = (direction: 'left' | 'right') => {
    const el = pillsContainerRef.current;
    if (!el) return;
    const scrollAmount = 260;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    setTimeout(checkPillsScroll, 300);
  };

  const [loadingEvaluaciones, setLoadingEvaluaciones] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Inicializar con el primer alumno
  useEffect(() => {
    if (alumnos.length > 0 && !selectedInscripcionId) {
      setSelectedInscripcionId(alumnos[0].inscripcionId);
    }
  }, [alumnos, selectedInscripcionId]);

  // 1. Cargar criterios de todas las materias del curso en lote
  useEffect(() => {
    const loadCriterios = async () => {
      if (cursoMaterias.length === 0) return;
      try {
        setLoadingCriterios(true);
        const cmIds = cursoMaterias.map((cm) => cm.id);
        const map = await boletinService.getCriteriosByCursoMateriasBatch(cmIds);
        setCriteriosMap(map);
      } catch (err) {
        console.error(err);
        message.error('Error al cargar criterios de las materias');
      } finally {
        setLoadingCriterios(false);
      }
    };
    void loadCriterios();
  }, [cursoMaterias, message]);

  // 2. Cargar Progreso del Curso para la Guía Visual (Semáforos y Estadísticas)
  useEffect(() => {
    let active = true;
    const loadProgreso = async () => {
      if (alumnos.length === 0 || cursoMaterias.length === 0 || !periodoId) return;
      try {
        const { alumnosProgreso, resumen } = await boletinService.getProgresoCursoPeriodo(
          alumnos,
          cursoMaterias,
          criteriosMap,
          periodoId
        );
        if (active) {
          setProgresoMap(alumnosProgreso);
          setProgresoResumen(resumen);
          setTimeout(checkPillsScroll, 100);
        }
      } catch (err) {
        console.error('Error al calcular progreso del curso:', err);
      }
    };
    void loadProgreso();
    return () => {
      active = false;
    };
  }, [alumnos, cursoMaterias, criteriosMap, periodoId, checkPillsScroll]);

  // Auto-scroll de la píldora del alumno activo al centro de la tira
  useEffect(() => {
    if (selectedInscripcionId) {
      const pillEl = document.getElementById(`pill-student-${selectedInscripcionId}`);
      if (pillEl) {
        pillEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedInscripcionId]);

  // 2. Cargar evaluaciones y asistencia para el alumno seleccionado
  const loadAlumnoData = useCallback(async () => {
    if (!selectedInscripcionId || !periodoId) return;

    try {
      setLoadingEvaluaciones(true);

      // Cargar evaluaciones de materias
      const evalMap = await boletinService.getEvaluacionesByInscripcionAndPeriodo(
        selectedInscripcionId,
        periodoId
      );

      const newMateriasState: Record<string, MateriaAlumnoState> = {};
      for (const cm of cursoMaterias) {
        const ev = evalMap[cm.id];
        newMateriasState[cm.id] = {
          evaluacionMateriaId: ev?.evaluacionMateriaId,
          ppi: ev?.ppi ?? false,
          calificacionGeneralId: ev?.calificacionGeneralId ?? null,
          criteriosValores: ev?.criteriosValores ? { ...ev.criteriosValores } : {},
          isModified: false,
        };
      }
      setMateriasState(newMateriasState);

      // Cargar cierre de asistencia
      const cierre = await boletinService.getCierrePeriodoAlumno(selectedInscripcionId, periodoId);
      setAsistenciaState({
        cierreId: cierre?.id,
        asistencias: cierre?.asistencias ?? 0,
        inasistencias: cierre?.inasistencias ?? 0,
        llegadasTarde: cierre?.llegadasTarde ?? 0,
        observaciones: cierre?.observaciones || '',
        isModified: false,
      });

      // Cargar datos de apoyo escolar de la inscripción activa
      const curAlu = alumnos.find((a) => a.inscripcionId === selectedInscripcionId);
      setApoyoState({
        promocionoConAcompanamiento: curAlu?.promocionoConAcompanamiento || '-',
        poseeApoyos: curAlu?.poseeApoyos || '-',
        cualesApoyos: curAlu?.cualesApoyos || '',
        isModified: false,
      });
    } catch (err) {
      console.error(err);
      message.error('Error al cargar la libreta del alumno');
    } finally {
      setLoadingEvaluaciones(false);
    }
  }, [selectedInscripcionId, periodoId, cursoMaterias, alumnos, message]);

  useEffect(() => {
    void loadAlumnoData();
  }, [loadAlumnoData]);

  // Manejadores de cambios
  const handleCriterioChange = (
    cursoMateriaId: string,
    criterioId: string,
    valorEscalaId: string | null
  ) => {
    setMateriasState((prev) => {
      const mat = prev[cursoMateriaId] || {
        ppi: false,
        calificacionGeneralId: null,
        criteriosValores: {},
      };
      const newCrit = { ...mat.criteriosValores };
      if (valorEscalaId) {
        newCrit[criterioId] = valorEscalaId;
      } else {
        delete newCrit[criterioId];
      }
      return {
        ...prev,
        [cursoMateriaId]: {
          ...mat,
          criteriosValores: newCrit,
          isModified: true,
        },
      };
    });
  };

  const handlePpiChange = (cursoMateriaId: string, ppi: boolean) => {
    setMateriasState((prev) => {
      const mat = prev[cursoMateriaId] || {
        ppi: false,
        calificacionGeneralId: null,
        criteriosValores: {},
      };
      return {
        ...prev,
        [cursoMateriaId]: {
          ...mat,
          ppi,
          isModified: true,
        },
      };
    });
  };

  const handleCalificacionGeneralChange = (
    cursoMateriaId: string,
    calificacionGeneralId: string | null
  ) => {
    setMateriasState((prev) => {
      const mat = prev[cursoMateriaId] || {
        ppi: false,
        calificacionGeneralId: null,
        criteriosValores: {},
      };
      return {
        ...prev,
        [cursoMateriaId]: {
          ...mat,
          calificacionGeneralId,
          isModified: true,
        },
      };
    });
  };

  const handleAsistenciaChange = (
    field: 'asistencias' | 'inasistencias' | 'llegadasTarde' | 'observaciones',
    val: number | string
  ) => {
    setAsistenciaState((prev) => ({
      ...prev,
      [field]: val,
      isModified: true,
    }));
  };

  const isPrimerBimestre = periodo?.numeroPeriodo === 1;
  const isCuartoBimestre = periodo?.numeroPeriodo === 4;

  const handleApoyoChange = (
    field: 'promocionoConAcompanamiento' | 'poseeApoyos' | 'cualesApoyos',
    val: string
  ) => {
    // Restringir edición según el bimestre
    if (field === 'promocionoConAcompanamiento' && !isCuartoBimestre) return;
    if ((field === 'poseeApoyos' || field === 'cualesApoyos') && !isPrimerBimestre) return;

    setApoyoState((prev) => {
      const next = { ...prev, [field]: val, isModified: true };
      if (field === 'poseeApoyos' && val !== 'SI') {
        next.cualesApoyos = '';
      }
      return next;
    });
  };

  // Detectar cambios pendientes
  const hasChanges = useMemo(() => {
    const matsModified = Object.values(materiasState).some((m) => m.isModified);
    return matsModified || asistenciaState.isModified || Boolean(apoyoState.isModified);
  }, [materiasState, asistenciaState, apoyoState]);

  // Guardar datos del alumno actual
  const handleSave = async () => {
    if (!selectedInscripcionId || !periodoId) return;

    try {
      setSaving(true);

      // 1. Guardar materias
      for (const cm of cursoMaterias) {
        const mat = materiasState[cm.id];
        if (!mat) continue;

        const criteriosPayload = Object.entries(mat.criteriosValores).map(([critId, valId]) => ({
          criterioId: critId,
          valorEscalaId: valId,
        }));

        await boletinService.saveEvaluacionMateriaCompleta({
          inscripcionId: selectedInscripcionId,
          cursoMateriaId: cm.id,
          periodoId,
          ppi: mat.ppi,
          calificacionGeneralId: mat.calificacionGeneralId || '',
          criterios: criteriosPayload,
        });
      }

      // 2. Guardar asistencia
      await boletinService.saveCierrePeriodoAlumno({
        inscripcionId: selectedInscripcionId,
        periodoId,
        asistencias: asistenciaState.asistencias,
        inasistencias: asistenciaState.inasistencias,
        llegadasTarde: asistenciaState.llegadasTarde,
        observaciones: asistenciaState.observaciones,
      });

      // 3. Guardar informe sobre dispositivos de apoyo e integración escolar (inscripción)
      if (apoyoState.isModified) {
        await boletinService.updateInscripcionApoyos(selectedInscripcionId, {
          promocionoConAcompanamiento: apoyoState.promocionoConAcompanamiento,
          poseeApoyos: apoyoState.poseeApoyos,
          cualesApoyos: apoyoState.cualesApoyos,
        });

        // Sincronizar en memoria en el array de alumnos
        const curAlu = alumnos.find((a) => a.inscripcionId === selectedInscripcionId);
        if (curAlu) {
          curAlu.promocionoConAcompanamiento = apoyoState.promocionoConAcompanamiento;
          curAlu.poseeApoyos = apoyoState.poseeApoyos;
          curAlu.cualesApoyos = apoyoState.cualesApoyos;
        }

        setApoyoState((prev) => ({ ...prev, isModified: false }));
      }

      // Sincronizar estado de progreso del alumno en tiempo real en memoria
      const curInscId = selectedInscripcionId;
      const curAlu = alumnos.find((a) => a.inscripcionId === curInscId);

      let matCompletadas = 0;
      const materiasDetalle = cursoMaterias.map((cm) => {
        const mat = materiasState[cm.id];
        const esConducta = esMateriaConducta(cm.materiaNombre);
        const critsTotal = (criteriosMap[cm.id] || []).length;
        const criteriosEvaluados = Object.keys(mat?.criteriosValores || {}).length;
        const hasCalGral = Boolean(mat?.calificacionGeneralId);
        const hasAllCrits = critsTotal === 0 || criteriosEvaluados >= critsTotal;
        const completada = esConducta ? hasAllCrits : (hasCalGral && hasAllCrits);

        if (completada) {
          matCompletadas++;
        }

        return {
          cursoMateriaId: cm.id,
          materiaNombre: cm.materiaNombre,
          completada,
          ppi: mat?.ppi ?? false,
          calificacionGeneralId: mat?.calificacionGeneralId || null,
          criteriosEvaluados,
          criteriosTotal: critsTotal,
        };
      });

      const totalMats = cursoMaterias.length;
      const tieneAsist = Boolean(
        asistenciaState.asistencias > 0 ||
        asistenciaState.inasistencias > 0 ||
        asistenciaState.llegadasTarde > 0 ||
        asistenciaState.observaciones
      );
      const porc = totalMats > 0 ? Math.round((matCompletadas / totalMats) * 100) : 0;
      const nuevoEstado: EstadoProgresoAlumno =
        matCompletadas === totalMats && tieneAsist
          ? 'COMPLETO'
          : matCompletadas > 0 || tieneAsist
          ? 'EN_PROGRESO'
          : 'SIN_INICIAR';

      setProgresoMap((prev) => {
        const nextMap = {
          ...prev,
          [curInscId]: {
            inscripcionId: curInscId,
            alumnoId: curAlu?.alumnoId || '',
            numeroOrden: curAlu?.numeroOrden ?? null,
            nombreCompleto: curAlu?.nombreCompleto || '',
            totalMaterias: totalMats,
            materiasCompletadas: matCompletadas,
            tieneAsistencia: tieneAsist,
            porcentaje: porc,
            estado: nuevoEstado,
            materiasDetalle,
          },
        };

        // Recalcular resumen global
        let compCount = 0;
        let progCount = 0;
        let sinCount = 0;
        let sumPorc = 0;
        for (const a of alumnos) {
          const p = nextMap[a.inscripcionId];
          if (p?.estado === 'COMPLETO') compCount++;
          else if (p?.estado === 'EN_PROGRESO') progCount++;
          else sinCount++;
          sumPorc += p?.porcentaje || 0;
        }

        setProgresoResumen({
          totalAlumnos: alumnos.length,
          completadosCount: compCount,
          enProgresoCount: progCount,
          sinIniciarCount: sinCount,
          porcentajeGlobal: alumnos.length > 0 ? Math.round(sumPorc / alumnos.length) : 0,
        });

        return nextMap;
      });

      message.success('Calificaciones, asistencia y datos de apoyo del estudiante guardados con éxito');

      // Marcar limpio
      setMateriasState((prev) => {
        const next: Record<string, MateriaAlumnoState> = {};
        for (const [k, v] of Object.entries(prev)) {
          next[k] = { ...v, isModified: false };
        }
        return next;
      });
      setAsistenciaState((prev) => ({ ...prev, isModified: false }));
    } catch (err) {
      console.error(err);
      message.error('Error al guardar datos del estudiante');
    } finally {
      setSaving(false);
    }
  };

  // Navegación de alumnos
  const currentIndex = alumnos.findIndex((a) => a.inscripcionId === selectedInscripcionId);
  const currentAlumno = alumnos[currentIndex];
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= alumnos.length - 1;

  const navigateToStudent = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= alumnos.length) return;
    const targetStudent = alumnos[newIndex];

    if (hasChanges) {
      modal.confirm({
        title: '¿Desea cambiar de alumno sin guardar?',
        content: 'Tiene modificaciones pendientes que se perderán si no las guarda.',
        okText: 'Cambiar sin guardar',
        okType: 'danger',
        cancelText: 'Permanecer aquí',
        onOk: () => {
          setSelectedInscripcionId(targetStudent.inscripcionId);
        },
      });
    } else {
      setSelectedInscripcionId(targetStudent.inscripcionId);
    }
  };

  const handlePrevStudent = () => navigateToStudent(currentIndex - 1);
  const handleNextStudent = () => navigateToStudent(currentIndex + 1);

  // Estadísticas de progreso del alumno
  const stats = useMemo(() => {
    let completedCount = 0;
    for (const cm of cursoMaterias) {
      const mat = materiasState[cm.id];
      const crits = criteriosMap[cm.id] || [];
      if (!mat) continue;

      const esConducta = esMateriaConducta(cm.materiaNombre);
      const hasAllCrit =
        crits.length > 0 &&
        crits.every((c) => Boolean(mat.criteriosValores[c.id]));
      const hasCalGral = Boolean(mat.calificacionGeneralId);

      const isCompleted = esConducta ? hasAllCrit : (hasAllCrit && hasCalGral);
      if (isCompleted) {
        completedCount++;
      }
    }

    const total = cursoMaterias.length;
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    return { completedCount, total, percent };
  }, [cursoMaterias, materiasState, criteriosMap]);

  // Lista de alumnos filtrados para el Drawer
  const alumnosDrawerFiltrados = useMemo(() => {
    if (filtroDrawer === 'TODOS') return alumnos;
    return alumnos.filter((a) => {
      const prog = progresoMap[a.inscripcionId];
      const isCompleto = prog?.estado === 'COMPLETO';
      if (filtroDrawer === 'COMPLETOS') return isCompleto;
      if (filtroDrawer === 'PENDIENTES') return !isCompleto;
      return true;
    });
  }, [alumnos, progresoMap, filtroDrawer]);

  if (alumnos.length === 0) {
    return <Empty description="No hay alumnos inscriptos en este curso." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. Barra Superior Unificada de Navegación del Aula y Tira de Alumnos */}
      <Card
        style={{
          borderRadius: 14,
          background: 'var(--cys-color-bg-container, #ffffff)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        }}
        bodyStyle={{ padding: '10px 14px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'nowrap',
          }}
        >
          {/* Navegación y Tira Semafórica de Píldoras */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Botón Anterior */}
            <Tooltip title="Alumno anterior">
              <Button
                icon={<LeftOutlined />}
                onClick={handlePrevStudent}
                disabled={isFirst}
                style={{ borderRadius: 8, fontWeight: 600, flexShrink: 0 }}
                size="middle"
              >
                Anterior
              </Button>
            </Tooltip>

            {/* Flecha Scroll Izquierda */}
            <Tooltip title="Desplazar lista a la izquierda">
              <Button
                shape="circle"
                size="small"
                icon={<LeftOutlined style={{ fontSize: 10 }} />}
                onClick={() => scrollPills('left')}
                disabled={!canScrollPillsLeft}
                style={{
                  flexShrink: 0,
                  opacity: canScrollPillsLeft ? 1 : 0.35,
                  border: '1px solid #cbd5e1',
                }}
              />
            </Tooltip>

            {/* Carrusel de Píldoras de todos los Alumnos del Curso */}
            <div
              ref={pillsContainerRef}
              onScroll={checkPillsScroll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                scrollBehavior: 'smooth',
                padding: '3px 2px',
                flex: 1,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {alumnos.map((alu, idx) => {
                const isSelected = alu.inscripcionId === selectedInscripcionId;
                const prog = progresoMap[alu.inscripcionId];
                const estado = prog?.estado || 'SIN_INICIAR';
                const porcentaje = prog?.porcentaje ?? 0;

                const isCompleto = estado === 'COMPLETO';
                const isProgreso = estado === 'EN_PROGRESO';

                return (
                  <button
                    key={alu.inscripcionId}
                    id={`pill-student-${alu.inscripcionId}`}
                    type="button"
                    onClick={() => navigateToStudent(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 11px',
                      borderRadius: 20,
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#f8fafc',
                      boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.18)' : 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 11.5, color: isSelected ? '#1e40af' : '#64748b' }}>
                      {alu.numeroOrden ? `${alu.numeroOrden}.` : `${idx + 1}.`}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1e40af' : '#1e293b' }}>
                      {alu.apellidos} {alu.nombres ? alu.nombres.charAt(0) + '.' : ''}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: isCompleto
                          ? '#dcfce7'
                          : isProgreso
                          ? '#fef3c7'
                          : '#f1f5f9',
                        color: isCompleto
                          ? '#15803d'
                          : isProgreso
                          ? '#b45309'
                          : '#94a3b8',
                      }}
                    >
                      {isCompleto ? '✓ 100%' : `${porcentaje}%`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Flecha Scroll Derecha */}
            <Tooltip title="Desplazar lista a la derecha">
              <Button
                shape="circle"
                size="small"
                icon={<RightOutlined style={{ fontSize: 10 }} />}
                onClick={() => scrollPills('right')}
                disabled={!canScrollPillsRight}
                style={{
                  flexShrink: 0,
                  opacity: canScrollPillsRight ? 1 : 0.35,
                  border: '1px solid #cbd5e1',
                }}
              />
            </Tooltip>

            {/* Botón Siguiente */}
            <Tooltip title="Alumno siguiente">
              <Button
                icon={<RightOutlined />}
                onClick={handleNextStudent}
                disabled={isLast}
                style={{ borderRadius: 8, fontWeight: 600, flexShrink: 0 }}
                size="middle"
              >
                Siguiente
              </Button>
            </Tooltip>
          </div>

          {/* Acciones Globales: Guía del Curso y Guardar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Button
              icon={<DashboardOutlined style={{ color: '#2563eb' }} />}
              onClick={() => setDrawerResumenOpen(true)}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Guía del Curso
            </Button>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
              className={hasChanges ? 'btn-primary-gradient' : undefined}
              style={{ borderRadius: 8, fontWeight: 600, minWidth: 145 }}
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Banner de Información del Estudiante Activo (Sticky Header Único) */}
      {currentAlumno && (
        <div
          className="cys-sticky-student-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 16px',
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(37, 99, 235, 0.22)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
            flexWrap: 'wrap',
          }}
        >
          {/* Identidad del Estudiante Activo con Selector Desplegable de Acceso Rápido */}
          <Popover
            open={stickySelectorOpen}
            onOpenChange={setStickySelectorOpen}
            trigger="click"
            placement="bottomLeft"
            overlayStyle={{ width: 340 }}
            content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography.Text strong style={{ fontSize: 13, color: '#0f172a' }}>
                    Seleccionar Alumno
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {alumnos.length} estudiantes
                  </Typography.Text>
                </div>

                <Input
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Buscar por apellido o N° de orden..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  allowClear
                  size="small"
                  style={{ borderRadius: 8 }}
                  autoFocus
                />

                <div
                  style={{
                    maxHeight: 280,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    paddingRight: 2,
                  }}
                >
                  {searchedAlumnos.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No se encontraron alumnos" />
                  ) : (
                    searchedAlumnos.map((alu) => {
                      const isSelected = alu.inscripcionId === selectedInscripcionId;
                      const prog = progresoMap[alu.inscripcionId];
                      const estado = prog?.estado || 'SIN_INICIAR';
                      const porcentaje = prog?.porcentaje ?? 0;

                      const isCompleto = estado === 'COMPLETO';
                      const isProgreso = estado === 'EN_PROGRESO';

                      return (
                        <div
                          key={alu.inscripcionId}
                          onClick={() => {
                            const idx = alumnos.findIndex((a) => a.inscripcionId === alu.inscripcionId);
                            if (idx !== -1) navigateToStudent(idx);
                            setStickySelectorOpen(false);
                            setStudentSearchQuery('');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: isSelected ? '#eff6ff' : 'transparent',
                            border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                background: isSelected ? '#2563eb' : '#f1f5f9',
                                color: isSelected ? '#ffffff' : '#475569',
                                fontWeight: 700,
                                fontSize: 11,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {alu.numeroOrden || '•'}
                            </span>
                            <Typography.Text
                              strong={isSelected}
                              style={{
                                fontSize: 12.5,
                                color: isSelected ? '#1e40af' : '#1e293b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {alu.nombreCompleto}
                            </Typography.Text>
                          </div>

                          <Tag
                            color={isCompleto ? 'success' : isProgreso ? 'warning' : 'default'}
                            style={{ margin: 0, fontSize: 10.5, fontWeight: 600, borderRadius: 6 }}
                          >
                            {isCompleto ? '✓ 100%' : `${porcentaje}%`}
                          </Tag>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            }
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                }}
              >
                {currentAlumno.numeroOrden || <UserOutlined />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Typography.Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                  {currentAlumno.nombreCompleto}
                </Typography.Text>
                <DownOutlined style={{ fontSize: 11, color: '#2563eb', marginTop: 1 }} />
              </div>
            </div>
          </Popover>

          {/* Progreso del Estudiante y Período Escolar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag
                color={stats.percent === 100 ? 'green' : 'blue'}
                style={{ fontWeight: 700, margin: 0, fontSize: 11.5, padding: '2px 8px' }}
              >
                {stats.completedCount}/{stats.total} Materias Evaluadas ({stats.percent}%)
              </Tag>
              <Progress
                percent={stats.percent}
                showInfo={false}
                strokeColor={stats.percent === 100 ? '#10b981' : '#2563eb'}
                size="small"
                style={{ width: 100, margin: 0 }}
              />
            </div>

            <Tag color="purple" style={{ borderRadius: 6, fontSize: 11, margin: 0, fontWeight: 600 }}>
              {periodo?.nombre || 'Período Activo'}
            </Tag>
          </div>
        </div>
      )}
      {/* 3. Cuadro de Informe sobre Dispositivos de Apoyo e Integración Escolar (Abstracción Bimestral / Trayectoria Anual) */}
      <Card
        style={{
          borderRadius: 12,
          border: apoyoState.isModified ? '1px solid #3b82f6' : '1px solid #e2e8f0',
          background: 'var(--cys-color-bg-container, #ffffff)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
          transition: 'all 0.2s ease',
        }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ marginBottom: 12 }}>
          <Space size={6} align="center">
            <SafetyCertificateOutlined style={{ color: '#2563eb', fontSize: 15 }} />
            <Typography.Text strong style={{ fontSize: 13.5, color: '#1e293b' }}>
              Apoyos e Integración Escolar (Trayectoria Anual)
            </Typography.Text>
          </Space>
        </div>

        <Row gutter={[16, 14]}>
          {/* 1. Bloque: Dispositivos de Apoyo (Carga en 1° Bimestre) */}
          <Col xs={24} lg={14}>
            <div
              style={{
                background: isPrimerBimestre ? 'rgba(240, 253, 244, 0.7)' : '#f8fafc',
                border: isPrimerBimestre ? '1px solid #86efac' : '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 14px',
                height: '100%',
                opacity: isPrimerBimestre ? 1 : 0.75,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <Space size={4}>
                  {!isPrimerBimestre && <LockOutlined style={{ color: '#94a3b8', fontSize: 12 }} />}
                  <Typography.Text strong style={{ fontSize: 12.5, color: isPrimerBimestre ? '#166534' : '#64748b' }}>
                    1. Dispositivos de Apoyo / Acompañamiento
                  </Typography.Text>
                </Space>
                <Tag
                  style={{
                    fontSize: 10.5,
                    borderRadius: 6,
                    margin: 0,
                    fontWeight: 700,
                    padding: '1px 8px',
                    background: isPrimerBimestre ? 'rgba(34, 197, 94, 0.12)' : '#f1f5f9',
                    color: isPrimerBimestre ? '#15803d' : '#94a3b8',
                    border: isPrimerBimestre ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid #cbd5e1',
                  }}
                >
                  1ER BIMESTRE
                </Tag>
              </div>

              <Row gutter={[12, 10]} align="middle">
                <Col xs={24} sm={10}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Typography.Text style={{ fontSize: 11.5, color: isPrimerBimestre ? '#475569' : '#94a3b8', fontWeight: 600 }}>
                      ¿Posee apoyos?
                    </Typography.Text>
                    <Tooltip title={!isPrimerBimestre ? 'Los dispositivos de apoyo se establecen al inicio del ciclo lectivo en el 1° Bimestre.' : undefined}>
                      <div>
                        <Select
                          value={apoyoState.poseeApoyos}
                          onChange={(val) => handleApoyoChange('poseeApoyos', val)}
                          size="middle"
                          disabled={!isPrimerBimestre}
                          style={{ width: '100%' }}
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                            { value: '-', label: 'Sin especificar (—)' },
                          ]}
                        />
                      </div>
                    </Tooltip>
                  </div>
                </Col>

                <Col xs={24} sm={14}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Typography.Text
                      style={{
                        fontSize: 11.5,
                        color: isPrimerBimestre && apoyoState.poseeApoyos === 'SI' ? '#475569' : '#94a3b8',
                        fontWeight: 600,
                      }}
                    >
                      ¿Cuáles? {isPrimerBimestre && apoyoState.poseeApoyos === 'SI' && <span style={{ color: '#ef4444' }}>*</span>}
                    </Typography.Text>
                    <Input
                      size="middle"
                      placeholder={
                        !isPrimerBimestre
                          ? apoyoState.cualesApoyos || (apoyoState.poseeApoyos === 'NO' ? 'Sin apoyos' : 'Sin especificar')
                          : apoyoState.poseeApoyos === 'SI'
                          ? 'Detallar apoyos (ej: DIL, MAI, etc.)...'
                          : 'Sin apoyos'
                      }
                      disabled={!isPrimerBimestre || apoyoState.poseeApoyos !== 'SI'}
                      value={apoyoState.poseeApoyos === 'SI' ? apoyoState.cualesApoyos : ''}
                      onChange={(e) => handleApoyoChange('cualesApoyos', e.target.value)}
                      maxLength={150}
                    />
                  </div>
                </Col>
              </Row>
            </div>
          </Col>

          {/* 2. Bloque: Promoción con Acompañamiento (Carga en 4° Bimestre) */}
          <Col xs={24} lg={10}>
            <div
              style={{
                background: isCuartoBimestre ? 'rgba(239, 246, 255, 0.7)' : '#f8fafc',
                border: isCuartoBimestre ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 14px',
                height: '100%',
                opacity: isCuartoBimestre ? 1 : 0.75,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <Space size={4}>
                  {isCuartoBimestre ? <FlagOutlined style={{ color: '#2563eb', fontSize: 12 }} /> : <LockOutlined style={{ color: '#94a3b8', fontSize: 12 }} />}
                  <Typography.Text strong style={{ fontSize: 12.5, color: isCuartoBimestre ? '#1e40af' : '#64748b' }}>
                    2. Promoción con Acompañamiento
                  </Typography.Text>
                </Space>
                <Tag
                  style={{
                    fontSize: 10.5,
                    borderRadius: 6,
                    margin: 0,
                    fontWeight: 700,
                    padding: '1px 8px',
                    background: isCuartoBimestre ? 'rgba(37, 99, 235, 0.12)' : '#f1f5f9',
                    color: isCuartoBimestre ? '#1d4ed8' : '#94a3b8',
                    border: isCuartoBimestre ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid #cbd5e1',
                  }}
                >
                  4TO BIMESTRE
                </Tag>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography.Text style={{ fontSize: 11.5, color: isCuartoBimestre ? '#475569' : '#94a3b8', fontWeight: 600 }}>
                  ¿Promocionó con acompañamiento?
                </Typography.Text>
                <Tooltip
                  title={
                    !isCuartoBimestre
                      ? 'La condición de promoción con acompañamiento se define exclusivamente durante el cierre del 4° Bimestre.'
                      : undefined
                  }
                >
                  <div>
                    <Select
                      value={apoyoState.promocionoConAcompanamiento}
                      onChange={(val) => handleApoyoChange('promocionoConAcompanamiento', val)}
                      size="middle"
                      disabled={!isCuartoBimestre}
                      style={{ width: '100%' }}
                      options={[
                        { value: 'SI', label: 'Sí' },
                        { value: 'NO', label: 'No' },
                        { value: '-', label: 'Sin especificar (—)' },
                      ]}
                    />
                  </div>
                </Tooltip>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 4. Listado de Materias del Alumno */}
      {loadingEvaluaciones || loadingCriterios ? (
        <Card style={{ textAlign: 'center', padding: 60, borderRadius: 16 }}>
          <Spin tip="Cargando materias del estudiante..." />
        </Card>
      ) : cursoMaterias.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40, borderRadius: 16 }}>
          <Empty description="No hay materias asignadas a este curso." />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cursoMaterias.map((cm, matIdx) => {
            const mat = materiasState[cm.id] || {
              ppi: false,
              calificacionGeneralId: null,
              criteriosValores: {},
            };
            const crits = criteriosMap[cm.id] || [];
            const esConducta = esMateriaConducta(cm.materiaNombre);

            const isMateriaComplete =
              crits.length > 0 &&
              crits.every((c) => Boolean(mat.criteriosValores[c.id])) &&
              (esConducta || Boolean(mat.calificacionGeneralId));

            return (
              <Card
                key={cm.id}
                style={{
                  borderRadius: 14,
                  border: mat.isModified ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.2s ease',
                }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                {/* Encabezado de la Materia (Título + Estado + Switch PPI o Tag Formativa) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'nowrap',
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <Space size={8} align="center" style={{ flexShrink: 0 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: 'rgba(37, 99, 235, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563eb',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {matIdx + 1}
                    </div>
                    <div>
                      <Typography.Text strong style={{ fontSize: 14.5, color: '#0f172a' }}>
                        <BookOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                        {cm.materiaNombre}
                      </Typography.Text>
                    </div>
                    {isMateriaComplete ? (
                      <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                        Completa
                      </Tag>
                    ) : (
                      <Tag color="warning" icon={<ExclamationCircleOutlined />} style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                        Incompleta
                      </Tag>
                    )}
                  </Space>

                  {/* Switch PPI o Badge Formativa */}
                  {esConducta ? (
                    <Tag color="cyan" style={{ margin: 0, fontWeight: 700, borderRadius: 4, fontSize: 11 }}>
                      Conducta / Formativa
                    </Tag>
                  ) : (
                    <Space size={6} align="center" style={{ flexShrink: 0 }}>
                      <Tooltip title="Proyecto Pedagógico Individual (Apoyo a la inclusión en esta materia)">
                        <Tag color="purple" style={{ margin: 0, fontWeight: 700, borderRadius: 4 }}>
                          PPI
                        </Tag>
                      </Tooltip>
                      <Switch
                        size="small"
                        checked={mat.ppi}
                        onChange={(checked) => handlePpiChange(cm.id, checked)}
                        checkedChildren="SÍ"
                        unCheckedChildren="NO"
                        style={{ background: mat.ppi ? '#7c3aed' : undefined }}
                      />
                    </Space>
                  )}
                </div>

                <Divider style={{ margin: '8px 0 10px' }} />

                {/* 5 Criterios Pedagógicos de la Materia + Calificación General */}
                {crits.length === 0 ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Esta materia no tiene criterios pedagógicos configurados en la malla curricular.
                  </Typography.Text>
                ) : (
                  <Row gutter={[12, 6]}>
                    {crits.map((crit, cIdx) => {
                      const num = crit.ordenVisual || cIdx + 1;
                      const valActual = mat.criteriosValores[crit.id] || undefined;
                      return (
                        <Col xs={24} sm={12} lg={24} key={crit.id}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#f8fafc',
                              padding: '7px 14px',
                              borderRadius: 8,
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <Typography.Text style={{ fontSize: 14, color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>
                                <span style={{ fontWeight: 700, color: '#2563eb', marginRight: 8, fontSize: 14.5 }}>
                                  {num}.
                                </span>
                                {crit.nombre}
                              </Typography.Text>
                            </div>

                            <Select
                              size="middle"
                              placeholder="Calificar..."
                              allowClear
                              value={valActual}
                              onChange={(val) => handleCriterioChange(cm.id, crit.id, val || null)}
                              style={{ width: 140 }}
                              className={getClassNameForValor(valActual)}
                              options={valoresEscala.map((v) => ({
                                value: v.id,
                                label: (
                                  <span style={{ color: getEtiquetaColor(v.etiqueta).color, fontWeight: 700, fontSize: 13 }}>
                                    {v.etiqueta}
                                  </span>
                                ),
                              }))}
                            />
                          </div>
                        </Col>
                      );
                    })}

                    {/* Ítem Destacado Final: Calificación General de la Materia (Solo si no es pseudo-materia de conducta) */}
                    {!esConducta && (
                      <Col xs={24} sm={12} lg={24}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(59, 130, 246, 0.03))',
                            border: '1px solid rgba(37, 99, 235, 0.22)',
                            padding: '8px 14px',
                            borderRadius: 8,
                            gap: 12,
                            flexWrap: 'wrap',
                            marginTop: 4,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                background: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontSize: 12,
                                flexShrink: 0,
                              }}
                            >
                              <TrophyOutlined />
                            </div>
                            <Typography.Text style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 700 }}>
                              Calificación General
                            </Typography.Text>
                          </div>

                          <Select
                            size="middle"
                            placeholder="Calificar..."
                            allowClear
                            value={mat.calificacionGeneralId || undefined}
                            onChange={(val) => handleCalificacionGeneralChange(cm.id, val || null)}
                            style={{ width: 140 }}
                            className={getClassNameForValor(mat.calificacionGeneralId)}
                            options={valoresEscala.map((v) => ({
                              value: v.id,
                              label: (
                                <span style={{ color: getEtiquetaColor(v.etiqueta).color, fontWeight: 700, fontSize: 13 }}>
                                  {v.etiqueta}
                                </span>
                              ),
                            }))}
                          />
                        </div>
                      </Col>
                    )}
                  </Row>
                )}
              </Card>
            );
          })}

          {/* 4. Sección Final: Cierre Bimestral y Asistencias */}
          <Card
            style={{
              borderRadius: 14,
              border: asistenciaState.isModified ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.02), #ffffff)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
            }}
            bodyStyle={{ padding: '18px 20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ClockCircleOutlined style={{ color: '#7c3aed', fontSize: 18 }} />
              <div>
                <Typography.Title level={5} style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>
                  Cierre Bimestral & Asistencia del Estudiante
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Registro de asistencia y concepto pedagógico general del período.
                </Typography.Text>
              </div>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Typography.Text strong style={{ fontSize: 12, color: '#64748b' }}>
                    ASISTENCIAS
                  </Typography.Text>
                  <InputNumber
                    min={0}
                    max={180}
                    style={{ width: '100%' }}
                    value={asistenciaState.asistencias}
                    onChange={(val) => handleAsistenciaChange('asistencias', val ?? 0)}
                  />
                </Space>
              </Col>

              <Col xs={12} sm={8}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Typography.Text strong style={{ fontSize: 12, color: '#64748b' }}>
                    INASISTENCIAS
                  </Typography.Text>
                  <InputNumber
                    min={0}
                    max={180}
                    style={{ width: '100%' }}
                    value={asistenciaState.inasistencias}
                    onChange={(val) => handleAsistenciaChange('inasistencias', val ?? 0)}
                  />
                </Space>
              </Col>

              <Col xs={12} sm={8}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Typography.Text strong style={{ fontSize: 12, color: '#64748b' }}>
                    LLEGADAS TARDE
                  </Typography.Text>
                  <InputNumber
                    min={0}
                    max={180}
                    style={{ width: '100%' }}
                    value={asistenciaState.llegadasTarde}
                    onChange={(val) => handleAsistenciaChange('llegadasTarde', val ?? 0)}
                  />
                </Space>
              </Col>

              <Col xs={24}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Typography.Text strong style={{ fontSize: 12, color: '#64748b' }}>
                    OBSERVACIONES GENERALES DEL PERÍODO
                  </Typography.Text>
                  <Input.TextArea
                    rows={2}
                    placeholder="Concepto pedagógico institucional u observaciones sobre el desempeño y convivencia del estudiante en este bimestre..."
                    value={asistenciaState.observaciones}
                    onChange={(e) => handleAsistenciaChange('observaciones', e.target.value)}
                    maxLength={300}
                    showCount
                  />
                </Space>
              </Col>
            </Row>
          </Card>
        </div>
      )}

      {/* 5. Barra de Acción Flotante para Cambios Pendientes */}
      {hasChanges && (
        <div
          className="cys-floating-action-bar"
          style={{
            position: 'sticky',
            bottom: 16,
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--cys-color-bg-container, #ffffff)',
            border: '1.5px solid #3b82f6',
            borderRadius: 14,
            padding: '12px 20px',
            boxShadow: '0 10px 30px -10px rgba(37, 99, 235, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginTop: 20,
          }}
        >
          <Space size={8}>
            <ExclamationCircleOutlined style={{ color: '#2563eb', fontSize: 18 }} />
            <div>
              <Typography.Text strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block', lineHeight: 1.25 }}>
                Cambios pendientes sin guardar
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11.5 }}>
                Tiene modificaciones sin guardar en la libreta de {currentAlumno?.nombreCompleto || 'este alumno'}.
              </Typography.Text>
            </div>
          </Space>

          <Space size={10}>
            <Button
              onClick={() => void loadAlumnoData()}
              disabled={saving}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Descartar
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              className="btn-primary-gradient"
              style={{ borderRadius: 8, fontWeight: 600, paddingInline: 20 }}
            >
              Guardar Cambios
            </Button>
          </Space>
        </div>
      )}

      {/* 6. Drawer de Resumen y Monitoreo del Curso */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DashboardOutlined style={{ color: '#2563eb', fontSize: 18 }} />
            <div>
              <Typography.Text strong style={{ fontSize: 15 }}>
                Guía de Carga y Monitoreo del Curso
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block' }}>
                {periodo?.nombre || 'Período escolar activo'} • {alumnos.length} estudiantes inscriptos
              </Typography.Text>
            </div>
          </div>
        }
        placement="right"
        width={560}
        onClose={() => setDrawerResumenOpen(false)}
        open={drawerResumenOpen}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tarjetas KPI de Estado: Pendientes vs Completos */}
          <Row gutter={[12, 12]}>
            <Col span={12}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: '14px 16px',
                  textAlign: 'center',
                }}
              >
                <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                  Pendientes
                </Typography.Text>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#334155', marginTop: 2 }}>
                  {progresoResumen.totalAlumnos - progresoResumen.completadosCount}
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 12,
                  padding: '14px 16px',
                  textAlign: 'center',
                }}
              >
                <Typography.Text style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#166534' }}>
                  Completos
                </Typography.Text>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#15803d', marginTop: 2 }}>
                  {progresoResumen.completadosCount}
                </div>
              </div>
            </Col>
          </Row>

          {/* Filtro por Estado */}
          <Segmented
            block
            value={filtroDrawer}
            onChange={(val) => setFiltroDrawer(val as 'TODOS' | 'PENDIENTES' | 'COMPLETOS')}
            options={[
              { value: 'TODOS', label: `Todos (${alumnos.length})` },
              { value: 'PENDIENTES', label: `⏳ Pendientes (${progresoResumen.totalAlumnos - progresoResumen.completadosCount})` },
              { value: 'COMPLETOS', label: `🟢 Completos (${progresoResumen.completadosCount})` },
            ]}
          />

          {/* Listado de Estudiantes con Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {alumnosDrawerFiltrados.length === 0 ? (
              <Empty description="No hay estudiantes en esta categoría de progreso." />
            ) : (
              alumnosDrawerFiltrados.map((alu) => {
                const prog = progresoMap[alu.inscripcionId];
                const estado = prog?.estado || 'SIN_INICIAR';
                const isSelected = alu.inscripcionId === selectedInscripcionId;

                const isCompleto = estado === 'COMPLETO';
                const isProgreso = estado === 'EN_PROGRESO';

                return (
                  <div
                    key={alu.inscripcionId}
                    onClick={() => {
                      const idx = alumnos.findIndex((a) => a.inscripcionId === alu.inscripcionId);
                      if (idx !== -1) navigateToStudent(idx);
                      setDrawerResumenOpen(false);
                    }}
                    style={{
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '12px 14px',
                      background: isSelected ? '#f8fafc' : '#ffffff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: isSelected ? '#2563eb' : '#64748b', fontSize: 13 }}>
                          {alu.numeroOrden ? `${alu.numeroOrden}.` : '•'}
                        </span>
                        <Typography.Text strong style={{ fontSize: 13.5, color: '#0f172a' }}>
                          {alu.nombreCompleto}
                        </Typography.Text>
                      </div>

                      <Space size={6}>
                        <Tag
                          color={isCompleto ? 'success' : isProgreso ? 'warning' : 'default'}
                          style={{ margin: 0, fontWeight: 600, fontSize: 11 }}
                        >
                          {isCompleto ? '✓ Completo' : isProgreso ? `${prog?.porcentaje}%` : '0%'}
                        </Tag>
                        <Button
                          size="small"
                          type={isSelected ? 'default' : 'primary'}
                          icon={<ArrowRightOutlined />}
                          style={{ borderRadius: 6, fontSize: 11 }}
                        >
                          {isSelected ? 'Editando' : 'Cargar'}
                        </Button>
                      </Space>
                    </div>

                    <Progress
                      percent={prog?.porcentaje || 0}
                      showInfo={false}
                      strokeColor={isCompleto ? '#10b981' : isProgreso ? '#f59e0b' : '#cbd5e1'}
                      size="small"
                      style={{ margin: '4px 0 0' }}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
};
