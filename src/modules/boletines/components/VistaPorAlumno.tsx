import ui from '../../../shared/styles/ui.module.css';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Alert,
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
  SendOutlined,
  EditOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { staffGradebookDataSource } from '../services/gradebookDataSource.service';
import {
  TeacherAccessDeniedError,
  TeacherSubmissionIncompleteError,
} from '../services/accesoDocente.service';
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
import type { GradebookAccessPolicy } from '../models/gradebookAccess.model';

interface VistaPorAlumnoProps {
  periodoId: string;
  alumnos: AlumnoInscriptoRow[];
  cursoMaterias: CursoMateria[];
  valoresEscala: ValorEscala[];
  periodo: Periodo | undefined;
  access: GradebookAccessPolicy;
  readOnly?: boolean;
  onSaveSuccess?: () => void;
}

interface MateriaAlumnoState {
  evaluacionMateriaId?: string;
  ppi: boolean;
  calificacionGeneralId: string | null;
  criteriosValores: Record<string, string>;
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
  promocionoConAcompanamiento: string;
  poseeApoyos: string;
  cualesApoyos: string;
  isModified?: boolean;
}

export const VistaPorAlumno: React.FC<VistaPorAlumnoProps> = ({
  periodoId,
  alumnos,
  cursoMaterias,
  valoresEscala,
  periodo,
  access,
  readOnly = false,
  onSaveSuccess,
}) => {
  const { message, modal } = App.useApp();
  const dataSource = access.dataSource || staffGradebookDataSource;
  const [editingMateriaId, setEditingMateriaId] = useState<string | null>(null);


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


  const [requestedInscripcionId, setSelectedInscripcionId] = useState<string | null>(null);
  const selectedInscripcionId = alumnos.some((alumno) => alumno.inscripcionId === requestedInscripcionId)
    ? requestedInscripcionId
    : alumnos[0]?.inscripcionId ?? null;


  const [criteriosMap, setCriteriosMap] = useState<Record<string, CriterioEvaluacion[]>>({});
  const [loadingCriterios, setLoadingCriterios] = useState<boolean>(false);


  const [materiasState, setMateriasState] = useState<Record<string, MateriaAlumnoState>>({});

  const [asistenciaState, setAsistenciaState] = useState<AsistenciaAlumnoState>({
    asistencias: 0,
    inasistencias: 0,
    llegadasTarde: 0,
    observaciones: '',
    isModified: false,
  });

  const [apoyoState, setApoyoState] = useState<ApoyoInclusionState>({
    promocionoConAcompanamiento: '-',
    poseeApoyos: '-',
    cualesApoyos: '',
    isModified: false,
  });


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
  const [submittingPeriod, setSubmittingPeriod] = useState<boolean>(false);


  useEffect(() => {
    const loadCriterios = async () => {
      if (cursoMaterias.length === 0) return;
      try {
        setLoadingCriterios(true);
        const cmIds = cursoMaterias.map((cm) => cm.id);
        const map = await dataSource.getCriterios(cmIds);
        setCriteriosMap(map);
      } catch (err) {
        console.error(err);
        message.error('Error al cargar criterios de las materias');
      } finally {
        setLoadingCriterios(false);
      }
    };
    void loadCriterios();
  }, [cursoMaterias, dataSource, message]);


  useEffect(() => {
    let active = true;
    const loadProgreso = async () => {
      if (alumnos.length === 0 || cursoMaterias.length === 0 || !periodoId) return;
      try {
        const { alumnosProgreso, resumen } = await dataSource.getProgreso(
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
  }, [alumnos, cursoMaterias, criteriosMap, periodoId, checkPillsScroll, dataSource]);


  useEffect(() => {
    if (selectedInscripcionId) {
      const pillEl = document.getElementById(`pill-student-${selectedInscripcionId}`);
      if (pillEl) {
        pillEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedInscripcionId]);


  const [alumnoRevision, setAlumnoRevision] = useState(0);
  const loadAlumnoData = () => setAlumnoRevision((value) => value + 1);
  const alumnoRequestKey = [selectedInscripcionId, periodoId, alumnoRevision].join(':');
  const [alumnoResult, setAlumnoResult] = useState({ key: '', failed: false });
  const alumnoDataReady = alumnoResult.key === alumnoRequestKey && !alumnoResult.failed && !loadingEvaluaciones;
  useEffect(() => {
    let active = true;
    const fetchAlumnoData = async () => {
      if (!selectedInscripcionId || !periodoId) return;

      try {
        setLoadingEvaluaciones(true);


        const currentAlumno = alumnos.find((alumno) => alumno.inscripcionId === selectedInscripcionId);
        if (!currentAlumno) return;
        const snapshot = await dataSource.getAlumno(currentAlumno, periodoId);
        const evalMap = snapshot.materias;

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


        const cierre = snapshot.cierre;
        if (!active) return;
        setMateriasState(newMateriasState);
        setAsistenciaState({
          cierreId: cierre?.id,
          asistencias: cierre?.asistencias ?? 0,
          inasistencias: cierre?.inasistencias ?? 0,
          llegadasTarde: cierre?.llegadasTarde ?? 0,
          observaciones: cierre?.observaciones || '',
          isModified: false,
        });


        const curAlu = alumnos.find((a) => a.inscripcionId === selectedInscripcionId);
        const apoyos = snapshot.apoyos;
        setApoyoState({
          promocionoConAcompanamiento: apoyos?.promocionoConAcompanamiento || curAlu?.promocionoConAcompanamiento || '-',
          poseeApoyos: apoyos?.poseeApoyos || curAlu?.poseeApoyos || '-',
          cualesApoyos: apoyos?.cualesApoyos || curAlu?.cualesApoyos || '',
          isModified: false,
        });
        setAlumnoResult({ key: alumnoRequestKey, failed: false });
      } catch (err) {
        if (!active) return;
        console.error(err);
        if (err instanceof TeacherAccessDeniedError) access.onAccessDenied?.();
        setAlumnoResult({ key: alumnoRequestKey, failed: true });
        message.error('Error al cargar la libreta del alumno');
      } finally {
        if (active) setLoadingEvaluaciones(false);
      }
    };
    void fetchAlumnoData();
    return () => { active = false; };
  }, [selectedInscripcionId, periodoId, cursoMaterias, alumnos, message, alumnoRevision, alumnoRequestKey, dataSource, access]);


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


  const hasChanges = useMemo(() => {
    const matsModified = Object.values(materiasState).some((m) => m.isModified);
    const closureModified = access.canEditPeriodClosure && asistenciaState.isModified;
    const supportModified = access.canEditStudentSupport && Boolean(apoyoState.isModified);
    return matsModified || closureModified || supportModified;
  }, [access.canEditPeriodClosure, access.canEditStudentSupport, materiasState, asistenciaState, apoyoState]);

  const handleSave = async () => {
    if ((readOnly && !editingMateriaId) || !selectedInscripcionId || !periodoId || !alumnoDataReady) return;

    try {
      setSaving(true);
      const materias = cursoMaterias.flatMap((cm) => {
        const mat = materiasState[cm.id];
        if (!mat?.isModified) return [];
        return [{
          cursoMateriaId: cm.id,
          ppi: mat.ppi,
          calificacionGeneralId: mat.calificacionGeneralId || '',
          criterios: Object.entries(mat.criteriosValores).map(([criterioId, valorEscalaId]) => ({
            criterioId,
            valorEscalaId,
          })),
        }];
      });
      const cierre = access.canEditPeriodClosure && asistenciaState.isModified
        ? {
          asistencias: asistenciaState.asistencias,
          inasistencias: asistenciaState.inasistencias,
          llegadasTarde: asistenciaState.llegadasTarde,
          observaciones: asistenciaState.observaciones,
        }
        : undefined;
      const apoyos = access.canEditStudentSupport && apoyoState.isModified
        ? {
          promocionoConAcompanamiento: apoyoState.promocionoConAcompanamiento,
          poseeApoyos: apoyoState.poseeApoyos,
          cualesApoyos: apoyoState.cualesApoyos,
        }
        : undefined;
      await dataSource.saveAlumno({
        inscripcionId: selectedInscripcionId,
        periodoId,
        materias,
        cierre,
        apoyos,
      });

      if (apoyos) {
        const curAlu = alumnos.find((a) => a.inscripcionId === selectedInscripcionId);
        if (curAlu) {
          curAlu.promocionoConAcompanamiento = apoyoState.promocionoConAcompanamiento;
          curAlu.poseeApoyos = apoyoState.poseeApoyos;
          curAlu.cualesApoyos = apoyoState.cualesApoyos;
        }

        setApoyoState((prev) => ({ ...prev, isModified: false }));
      }


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
      const tieneAsist = Boolean(asistenciaState.cierreId || cierre);
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

      message.success('Los cambios del estudiante se guardaron correctamente');


      setMateriasState((prev) => {
        const next: Record<string, MateriaAlumnoState> = {};
        for (const [k, v] of Object.entries(prev)) {
          next[k] = { ...v, isModified: false };
        }
        return next;
      });
      setAsistenciaState((prev) => ({ ...prev, isModified: false }));
      if (readOnly) setEditingMateriaId(null);
      onSaveSuccess?.();
    } catch (err) {
      console.error(err);
      if (err instanceof TeacherAccessDeniedError) {
        message.error('El acceso ya no está vigente. No se guardaron cambios.');
        access.onAccessDenied?.();
      } else {
        message.error('Error al guardar datos del estudiante');
      }
    } finally {
      setSaving(false);
    }
  };

  const periodIsComplete = progresoResumen.totalAlumnos > 0
    && progresoResumen.completadosCount === progresoResumen.totalAlumnos;

  const handleSubmitPeriod = () => {
    if (!dataSource.submitPeriod || !access.canSubmitPeriod) return;
    if (hasChanges) {
      message.warning('Guardá los cambios pendientes de este alumno antes de enviar el bimestre.');
      return;
    }
    if (!periodIsComplete) {
      setDrawerResumenOpen(true);
      message.warning('Completá todos los alumnos antes de enviar el bimestre.');
      return;
    }

    modal.confirm({
      title: '¿Enviar el bimestre completo?',
      icon: <SendOutlined />,
      content: 'Se cerrará el acceso docente y el equipo directivo tomará el control de la revisión y las correcciones.',
      okText: 'Enviar bimestre',
      cancelText: 'Seguir revisando',
      onOk: async () => {
        try {
          setSubmittingPeriod(true);
          const result = await dataSource.submitPeriod!();
          message.success('El bimestre fue enviado al equipo directivo.');
          access.onPeriodSubmitted?.(result);
        } catch (error) {
          if (error instanceof TeacherSubmissionIncompleteError) {
            const count = error.detail.pendientes.length;
            message.warning(`La revisión del servidor encontró ${count} ${count === 1 ? 'alumno pendiente' : 'alumnos pendientes'}.`);
            setDrawerResumenOpen(true);
            return;
          }
          if (error instanceof TeacherAccessDeniedError) {
            message.error('El acceso ya no está vigente.');
            access.onAccessDenied?.();
            return;
          }
          console.error(error);
          message.error('No se pudo enviar el bimestre. Intentá nuevamente.');
          throw error;
        } finally {
          setSubmittingPeriod(false);
        }
      },
    });
  };


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
          setEditingMateriaId(null);
          setSelectedInscripcionId(targetStudent.inscripcionId);
        },
      });
    } else {
      setEditingMateriaId(null);
      setSelectedInscripcionId(targetStudent.inscripcionId);
    }
  };

  const handleDiscardMateria = (isModified: boolean) => {
    const discard = () => {
      setEditingMateriaId(null);
      if (isModified) loadAlumnoData();
    };

    if (!isModified) {
      discard();
      return;
    }

    modal.confirm({
      title: '¿Descartar los cambios de esta materia?',
      content: 'La materia volverá a mostrar las calificaciones guardadas.',
      okText: 'Descartar cambios',
      cancelText: 'Continuar editando',
      okButtonProps: { danger: true },
      onOk: discard,
    });
  };

  const handlePrevStudent = () => navigateToStudent(currentIndex - 1);
  const handleNextStudent = () => navigateToStudent(currentIndex + 1);


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

  if (!alumnoDataReady) {
    const failed = alumnoResult.key === alumnoRequestKey && alumnoResult.failed;
    return (
      <Card>
        {failed ? (
          <Alert
            type="error"
            showIcon
            title="No se pudo cargar la libreta del alumno"
            description="Reintentá la carga para continuar con la evaluación."
            action={<Button onClick={loadAlumnoData}>Reintentar</Button>}
          />
        ) : (
          <div className={ui.loadingPanel}>
            <Spin />
            <Typography.Text type="secondary">Cargando la libreta del alumno…</Typography.Text>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className={ui.page}>
      { }
      <Card
        style={{
          borderRadius: 14,
          background: 'var(--cys-color-bg-container, #ffffff)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        }}
        styles={{ body: { padding: '10px 14px' } }}
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
          { }
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flex: 1,
              minWidth: 0,
            }}
          >
            { }
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

            { }
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
                  border: "1px solid var(--cys-color-border)",
                }}
              />
            </Tooltip>

            { }
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
                      border: isSelected ? '2px solid #2563eb' : "1px solid var(--cys-color-border-secondary)",
                      background: isSelected ? "var(--cys-color-primary-bg)" : "var(--cys-color-fill-quaternary)",
                      boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.18)' : 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 11.5, color: isSelected ? "var(--cys-color-primary-text)" : "var(--cys-color-text-description)" }}>
                      {alu.numeroOrden ? `${alu.numeroOrden}.` : `${idx + 1}.`}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--cys-color-primary-text)" : "var(--cys-color-text)" }}>
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
                          ? "var(--cys-color-success-bg)"
                          : isProgreso
                          ? "var(--cys-color-warning-bg)"
                          : "var(--cys-color-fill-tertiary)",
                        color: isCompleto
                          ? "var(--cys-color-success-text)"
                          : isProgreso
                          ? "var(--cys-color-warning-text)"
                          : "var(--cys-color-text-secondary)",
                      }}
                    >
                      {isCompleto ? '✓ 100%' : `${porcentaje}%`}
                    </span>
                  </button>
                );
              })}
            </div>

            { }
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
                  border: "1px solid var(--cys-color-border)",
                }}
              />
            </Tooltip>

            { }
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

          { }
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Button
              icon={<DashboardOutlined className={ui.primary} />}
              onClick={() => setDrawerResumenOpen(true)}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Guía del Curso
            </Button>

            {!readOnly && (
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
            )}
          </div>
        </div>
      </Card>

      {access.canSubmitPeriod && (
        <Alert
          type={periodIsComplete ? 'success' : 'info'}
          showIcon
          title={periodIsComplete ? 'El bimestre está listo para enviar' : 'Entrega completa del bimestre'}
          description={periodIsComplete
            ? 'Revisá que no queden cambios sin guardar y enviá la carga completa al equipo directivo.'
            : `${progresoResumen.completadosCount} de ${progresoResumen.totalAlumnos} estudiantes están completos. Podés continuar guardando el avance.`}
          action={(
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmitPeriod}
              loading={submittingPeriod}
              disabled={!periodIsComplete || hasChanges}
            >
              Enviar bimestre completo
            </Button>
          )}
        />
      )}

      { }
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
            background: 'var(--cys-color-bg-container)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(37, 99, 235, 0.22)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
            flexWrap: 'wrap',
          }}
        >
          { }
          <Popover
            open={stickySelectorOpen}
            onOpenChange={setStickySelectorOpen}
            trigger="click"
            placement="bottomLeft"
            overlayStyle={{ width: 340 }}
            content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: "1px solid var(--cys-color-border-secondary)" }}>
                  <Typography.Text strong style={{ fontSize: 13, color: 'var(--cys-color-text)' }}>
                    Seleccionar Alumno
                  </Typography.Text>
                  <Typography.Text type="secondary" className={ui.smallText}>
                    {alumnos.length} estudiantes
                  </Typography.Text>
                </div>

                <Input
                  prefix={<SearchOutlined style={{ color: 'var(--cys-color-text-secondary)' }} />}
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
                            background: isSelected ? "var(--cys-color-primary-bg)" : 'transparent',
                            border: isSelected ? "1px solid var(--cys-color-primary-border)" : '1px solid transparent',
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
                                background: isSelected ? '#2563eb' : "var(--cys-color-fill-tertiary)",
                                color: isSelected ? '#ffffff' : "var(--cys-color-text-description)",
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
                                color: isSelected ? "var(--cys-color-primary-text)" : "var(--cys-color-text)",
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
              <div className={ui.tightRow}>
                <Typography.Text strong style={{ fontSize: 15, color: 'var(--cys-color-text)' }}>
                  {currentAlumno.nombreCompleto}
                </Typography.Text>
                <DownOutlined style={{ fontSize: 11, color: 'var(--cys-color-primary-text)', marginTop: 1 }} />
              </div>
            </div>
          </Popover>

          { }
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className={ui.inlineControls}>
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

            <Tag color="purple" className={ui.strongTag}>
              {periodo?.nombre || 'Período Activo'}
            </Tag>
          </div>
        </div>
      )}
      { }
      {access.canEditStudentSupport && <Card
        style={{
          borderRadius: 12,
          border: apoyoState.isModified ? '1px solid #3b82f6' : "1px solid var(--cys-color-border-secondary)",
          background: 'var(--cys-color-bg-container, #ffffff)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
          transition: 'all 0.2s ease',
        }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ marginBottom: 12 }}>
          <Space size={6} align="center">
            <SafetyCertificateOutlined style={{ color: 'var(--cys-color-primary-text)', fontSize: 15 }} />
            <Typography.Text strong style={{ fontSize: 13.5, color: 'var(--cys-color-text)' }}>
              Apoyos e Integración Escolar (Trayectoria Anual)
            </Typography.Text>
          </Space>
        </div>

        <Row gutter={[16, 14]}>
          { }
          <Col xs={24} lg={14}>
            <div
              style={{
                background: isPrimerBimestre ? 'var(--cys-color-success-bg)' : "var(--cys-color-fill-quaternary)",
                border: isPrimerBimestre ? '1px solid #86efac' : "1px solid var(--cys-color-border-secondary)",
                borderRadius: 10,
                padding: '10px 14px',
                height: '100%',
                opacity: isPrimerBimestre ? 1 : 0.75,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <Space size={4}>
                  {!isPrimerBimestre && <LockOutlined style={{ color: 'var(--cys-color-text-secondary)', fontSize: 12 }} />}
                  <Typography.Text strong style={{ fontSize: 12.5, color: isPrimerBimestre ? "var(--cys-color-success-text)" : "var(--cys-color-text-description)" }}>
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
                    background: isPrimerBimestre ? 'rgba(34, 197, 94, 0.12)' : "var(--cys-color-fill-tertiary)",
                    color: isPrimerBimestre ? "var(--cys-color-success-text)" : "var(--cys-color-text-secondary)",
                    border: isPrimerBimestre ? '1px solid rgba(34, 197, 94, 0.3)' : "1px solid var(--cys-color-border)",
                  }}
                >
                  1ER BIMESTRE
                </Tag>
              </div>

              <Row gutter={[12, 10]} align="middle">
                <Col xs={24} sm={10}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Typography.Text style={{ fontSize: 11.5, color: isPrimerBimestre ? "var(--cys-color-text-description)" : "var(--cys-color-text-secondary)", fontWeight: 600 }}>
                      ¿Posee apoyos?
                    </Typography.Text>
                    <Tooltip title={!isPrimerBimestre ? 'Los dispositivos de apoyo se establecen al inicio del ciclo lectivo en el 1° Bimestre.' : undefined}>
                      <div>
                        {readOnly ? (
                          <Typography.Text strong>
                            {apoyoState.poseeApoyos === 'SI' ? 'Sí' : apoyoState.poseeApoyos === 'NO' ? 'No' : 'Sin especificar'}
                          </Typography.Text>
                        ) : (
                          <Select
                            value={apoyoState.poseeApoyos}
                            onChange={(val) => handleApoyoChange('poseeApoyos', val)}
                            size="middle"
                            disabled={!isPrimerBimestre}
                            className={ui.fullWidth}
                            options={[
                              { value: 'SI', label: 'Sí' },
                              { value: 'NO', label: 'No' },
                              { value: '-', label: 'Sin especificar (—)' },
                            ]}
                          />
                        )}
                      </div>
                    </Tooltip>
                  </div>
                </Col>

                <Col xs={24} sm={14}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Typography.Text
                      style={{
                        fontSize: 11.5,
                        color: isPrimerBimestre && apoyoState.poseeApoyos === 'SI' ? "var(--cys-color-text-description)" : "var(--cys-color-text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      ¿Cuáles? {isPrimerBimestre && apoyoState.poseeApoyos === 'SI' && <span style={{ color: '#ef4444' }}>*</span>}
                    </Typography.Text>
                    {readOnly ? (
                      <Typography.Text strong>
                        {apoyoState.poseeApoyos === 'SI' ? apoyoState.cualesApoyos || 'Sin detalle' : 'No corresponde'}
                      </Typography.Text>
                    ) : (
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
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          </Col>

          { }
          <Col xs={24} lg={10}>
            <div
              style={{
                background: isCuartoBimestre ? 'var(--cys-color-primary-bg)' : "var(--cys-color-fill-quaternary)",
                border: isCuartoBimestre ? '1px solid #93c5fd' : "1px solid var(--cys-color-border-secondary)",
                borderRadius: 10,
                padding: '10px 14px',
                height: '100%',
                opacity: isCuartoBimestre ? 1 : 0.75,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <Space size={4}>
                  {isCuartoBimestre ? <FlagOutlined style={{ color: 'var(--cys-color-primary-text)', fontSize: 12 }} /> : <LockOutlined style={{ color: 'var(--cys-color-text-secondary)', fontSize: 12 }} />}
                  <Typography.Text strong style={{ fontSize: 12.5, color: isCuartoBimestre ? "var(--cys-color-primary-text)" : "var(--cys-color-text-description)" }}>
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
                    background: isCuartoBimestre ? 'rgba(37, 99, 235, 0.12)' : "var(--cys-color-fill-tertiary)",
                    color: isCuartoBimestre ? "var(--cys-color-primary-text)" : "var(--cys-color-text-secondary)",
                    border: isCuartoBimestre ? '1px solid rgba(37, 99, 235, 0.3)' : "1px solid var(--cys-color-border)",
                  }}
                >
                  4TO BIMESTRE
                </Tag>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography.Text style={{ fontSize: 11.5, color: isCuartoBimestre ? "var(--cys-color-text-description)" : "var(--cys-color-text-secondary)", fontWeight: 600 }}>
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
                    {readOnly ? (
                      <Typography.Text strong>
                        {apoyoState.promocionoConAcompanamiento === 'SI' ? 'Sí' : apoyoState.promocionoConAcompanamiento === 'NO' ? 'No' : 'Sin especificar'}
                      </Typography.Text>
                    ) : (
                      <Select
                        value={apoyoState.promocionoConAcompanamiento}
                        onChange={(val) => handleApoyoChange('promocionoConAcompanamiento', val)}
                        size="middle"
                        disabled={!isCuartoBimestre}
                        className={ui.fullWidth}
                        options={[
                          { value: 'SI', label: 'Sí' },
                          { value: 'NO', label: 'No' },
                          { value: '-', label: 'Sin especificar (—)' },
                        ]}
                      />
                    )}
                  </div>
                </Tooltip>
              </div>
            </div>
          </Col>
        </Row>
      </Card>}

      { }
      {loadingEvaluaciones || loadingCriterios ? (
        <Card className={ui.loadingPanel}>
          <Spin description="Cargando materias del estudiante..." />
        </Card>
      ) : cursoMaterias.length === 0 ? (
        <Card className={ui.emptyPanel}>
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
            const isEditingMateria = editingMateriaId === cm.id;
            const isMateriaReadOnly = readOnly && !isEditingMateria;
            const anotherMateriaIsEditing = Boolean(editingMateriaId && !isEditingMateria);

            const isMateriaComplete =
              crits.length > 0 &&
              crits.every((c) => Boolean(mat.criteriosValores[c.id])) &&
              (esConducta || Boolean(mat.calificacionGeneralId));

            return (
              <Card
                key={cm.id}
                style={{
                  borderRadius: 14,
                  border: mat.isModified ? '1.5px solid #3b82f6' : "1px solid var(--cys-color-border-secondary)",
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.2s ease',
                }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                { }
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
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
                        color: 'var(--cys-color-primary-text)',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {matIdx + 1}
                    </div>
                    <div>
                      <Typography.Text strong style={{ fontSize: 14.5, color: 'var(--cys-color-text)' }}>
                        <BookOutlined style={{ marginRight: 6, color: 'var(--cys-color-primary-text)' }} />
                        {cm.materiaNombre}
                      </Typography.Text>
                    </div>
                    {isMateriaComplete ? (
                      <Tag color="success" icon={<CheckCircleOutlined />} className={ui.compactTag}>
                        Completa
                      </Tag>
                    ) : (
                      <Tag color="warning" icon={<ExclamationCircleOutlined />} className={ui.compactTag}>
                        Incompleta
                      </Tag>
                    )}
                  </Space>

                  { }
                  <Space size={8} align="center" wrap style={{ flexShrink: 0 }}>
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
                        {isMateriaReadOnly ? (
                          <Typography.Text strong>{mat.ppi ? 'Sí' : 'No'}</Typography.Text>
                        ) : (
                          <Switch
                            size="small"
                            checked={mat.ppi}
                            onChange={(checked) => handlePpiChange(cm.id, checked)}
                            checkedChildren="SÍ"
                            unCheckedChildren="NO"
                            style={{ background: mat.ppi ? '#7c3aed' : undefined }}
                          />
                        )}
                      </Space>
                    )}
                    {readOnly && (isEditingMateria ? (
                      <Space size={6}>
                        <Button
                          size="small"
                          icon={<CloseOutlined />}
                          disabled={saving}
                          onClick={() => handleDiscardMateria(Boolean(mat.isModified))}
                        >
                          Descartar
                        </Button>
                        <Button
                          type="primary"
                          size="small"
                          icon={<SaveOutlined />}
                          loading={saving}
                          disabled={!mat.isModified}
                          onClick={() => void handleSave()}
                        >
                          Guardar
                        </Button>
                      </Space>
                    ) : (
                      <Tooltip title={anotherMateriaIsEditing ? 'Guardá o descartá la materia que estás editando.' : 'Editar únicamente esta materia'}>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          disabled={anotherMateriaIsEditing}
                          onClick={() => setEditingMateriaId(cm.id)}
                        >
                          Editar
                        </Button>
                      </Tooltip>
                    ))}
                  </Space>
                </div>

                <Divider style={{ margin: '8px 0 10px' }} />

                { }
                {crits.length === 0 ? (
                  <Typography.Text type="secondary" className={ui.caption}>
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
                              background: "var(--cys-color-fill-quaternary)",
                              padding: '7px 14px',
                              borderRadius: 8,
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <Typography.Text style={{ fontSize: 14, color: 'var(--cys-color-text)', fontWeight: 500, lineHeight: 1.4 }}>
                                <span style={{ fontWeight: 700, color: 'var(--cys-color-primary-text)', marginRight: 8, fontSize: 14.5 }}>
                                  {num}.
                                </span>
                                {crit.nombre}
                              </Typography.Text>
                            </div>

                            {isMateriaReadOnly ? (
                              <Typography.Text
                                strong
                                style={{
                                  color: valActual
                                    ? getEtiquetaColor(valoresEscala.find((v) => v.id === valActual)?.etiqueta || '').color
                                    : 'var(--cys-color-text-description)',
                                }}
                              >
                                {valoresEscala.find((v) => v.id === valActual)?.etiqueta || 'Sin calificar'}
                              </Typography.Text>
                            ) : (
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
                            )}
                          </div>
                        </Col>
                      );
                    })}

                    { }
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

                          {isMateriaReadOnly ? (
                            <Typography.Text
                              strong
                              style={{
                                color: mat.calificacionGeneralId
                                  ? getEtiquetaColor(valoresEscala.find((v) => v.id === mat.calificacionGeneralId)?.etiqueta || '').color
                                  : 'var(--cys-color-text-description)',
                              }}
                            >
                              {valoresEscala.find((v) => v.id === mat.calificacionGeneralId)?.etiqueta || 'Sin calificar'}
                            </Typography.Text>
                          ) : (
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
                          )}
                        </div>
                      </Col>
                    )}
                  </Row>
                )}
              </Card>
            );
          })}

          { }
          {access.canEditPeriodClosure && <Card
            style={{
              borderRadius: 14,
              border: asistenciaState.isModified ? '1.5px solid #7c3aed' : "1px solid var(--cys-color-border-secondary)",
              background: 'var(--cys-color-bg-container)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
            }}
            styles={{ body: { padding: '18px 20px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ClockCircleOutlined style={{ color: '#7c3aed', fontSize: 18 }} />
              <div>
                <Typography.Title level={5} style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>
                  Cierre Bimestral & Asistencia del Estudiante
                </Typography.Title>
                <Typography.Text type="secondary" className={ui.caption}>
                  Registro de asistencia y concepto pedagógico general del período.
                </Typography.Text>
              </div>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Space orientation="vertical" size={4} className={ui.fullWidth}>
                  <Typography.Text strong className={ui.secondaryCaption}>
                    ASISTENCIAS
                  </Typography.Text>
                  {readOnly ? <Typography.Text strong>{asistenciaState.asistencias}</Typography.Text> : (
                    <InputNumber
                      min={0}
                      max={180}
                      className={ui.fullWidth}
                      value={asistenciaState.asistencias}
                      onChange={(val) => handleAsistenciaChange('asistencias', val ?? 0)}
                    />
                  )}
                </Space>
              </Col>

              <Col xs={12} sm={8}>
                <Space orientation="vertical" size={4} className={ui.fullWidth}>
                  <Typography.Text strong className={ui.secondaryCaption}>
                    INASISTENCIAS
                  </Typography.Text>
                  {readOnly ? <Typography.Text strong>{asistenciaState.inasistencias}</Typography.Text> : (
                    <InputNumber
                      min={0}
                      max={180}
                      className={ui.fullWidth}
                      value={asistenciaState.inasistencias}
                      onChange={(val) => handleAsistenciaChange('inasistencias', val ?? 0)}
                    />
                  )}
                </Space>
              </Col>

              <Col xs={12} sm={8}>
                <Space orientation="vertical" size={4} className={ui.fullWidth}>
                  <Typography.Text strong className={ui.secondaryCaption}>
                    LLEGADAS TARDE
                  </Typography.Text>
                  {readOnly ? <Typography.Text strong>{asistenciaState.llegadasTarde}</Typography.Text> : (
                    <InputNumber
                      min={0}
                      max={180}
                      className={ui.fullWidth}
                      value={asistenciaState.llegadasTarde}
                      onChange={(val) => handleAsistenciaChange('llegadasTarde', val ?? 0)}
                    />
                  )}
                </Space>
              </Col>

              <Col xs={24}>
                <Space orientation="vertical" size={4} className={ui.fullWidth}>
                  <Typography.Text strong className={ui.secondaryCaption}>
                    OBSERVACIONES GENERALES DEL PERÍODO
                  </Typography.Text>
                  {readOnly ? (
                    <Typography.Paragraph style={{ margin: 0 }}>
                      {asistenciaState.observaciones || 'Sin observaciones'}
                    </Typography.Paragraph>
                  ) : (
                    <Input.TextArea
                      rows={2}
                      placeholder="Concepto pedagógico institucional u observaciones sobre el desempeño y convivencia del estudiante en este bimestre..."
                      value={asistenciaState.observaciones}
                      onChange={(e) => handleAsistenciaChange('observaciones', e.target.value)}
                      maxLength={300}
                      showCount
                    />
                  )}
                </Space>
              </Col>
            </Row>
          </Card>}
        </div>
      )}

      { }
      {hasChanges && !readOnly && (
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
            <ExclamationCircleOutlined style={{ color: 'var(--cys-color-primary-text)', fontSize: 18 }} />
            <div>
              <Typography.Text strong style={{ fontSize: 13.5, color: 'var(--cys-color-text)', display: 'block', lineHeight: 1.25 }}>
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

      { }
      <Drawer
        title={
          <div className={ui.inlineControls}>
            <DashboardOutlined style={{ color: 'var(--cys-color-primary-text)', fontSize: 18 }} />
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
        size={560}
        onClose={() => setDrawerResumenOpen(false)}
        open={drawerResumenOpen}
      >
        <div className={ui.page}>
          { }
          <Row gutter={[12, 12]}>
            <Col span={12}>
              <div
                style={{
                  background: "var(--cys-color-fill-quaternary)",
                  border: "1px solid var(--cys-color-border)",
                  borderRadius: 12,
                  padding: '14px 16px',
                  textAlign: 'center',
                }}
              >
                <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--cys-color-text-description)' }}>
                  Pendientes
                </Typography.Text>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--cys-color-text)', marginTop: 2 }}>
                  {progresoResumen.totalAlumnos - progresoResumen.completadosCount}
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div
                style={{
                  background: "var(--cys-color-success-bg)",
                  border: '1px solid #86efac',
                  borderRadius: 12,
                  padding: '14px 16px',
                  textAlign: 'center',
                }}
              >
                <Typography.Text style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: "var(--cys-color-success-text)" }}>
                  Completos
                </Typography.Text>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--cys-color-success-text)', marginTop: 2 }}>
                  {progresoResumen.completadosCount}
                </div>
              </div>
            </Col>
          </Row>

          { }
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

          { }
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
                      border: isSelected ? '2px solid #2563eb' : "1px solid var(--cys-color-border-secondary)",
                      borderRadius: 12,
                      padding: '12px 14px',
                      background: isSelected ? "var(--cys-color-fill-quaternary)" : "var(--cys-color-bg-container)",
                      boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div className={ui.inlineControls}>
                        <span style={{ fontWeight: 700, color: isSelected ? "var(--cys-color-primary-text)" : "var(--cys-color-text-description)", fontSize: 13 }}>
                          {alu.numeroOrden ? `${alu.numeroOrden}.` : '•'}
                        </span>
                        <Typography.Text strong style={{ fontSize: 13.5, color: 'var(--cys-color-text)' }}>
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
                          {isSelected ? (readOnly ? 'Revisando' : 'Editando') : (readOnly ? 'Revisar' : 'Cargar')}
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
