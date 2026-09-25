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
  UnorderedListOutlined,
} from '@ant-design/icons';
import {
  GradebookRevisionConflictError,
  staffGradebookDataSource,
} from '../services/gradebookDataSource.service';
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
import styles from './VistaPorAlumno.module.css';

const criterioFieldKey = (cursoMateriaId: string, criterioId: string) => (
  `criterio:${cursoMateriaId}:${criterioId}`
);

const calificacionGeneralFieldKey = (cursoMateriaId: string) => (
  `general:${cursoMateriaId}`
);

interface VistaPorAlumnoProps {
  periodoId: string;
  alumnos: AlumnoInscriptoRow[];
  cursoMaterias: CursoMateria[];
  valoresEscala: ValorEscala[];
  periodo: Periodo | undefined;
  access: GradebookAccessPolicy;
  readOnly?: boolean;
  workflowRevision?: number;
  onSaveSuccess?: (revision?: number) => void;
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
  workflowRevision,
  onSaveSuccess,
}) => {
  const { message, modal } = App.useApp();
  const dataSource = access.dataSource || staffGradebookDataSource;
  const [editingMateriaId, setEditingMateriaId] = useState<string | null>(null);
  const [editingGradeField, setEditingGradeField] = useState<string | null>(null);
  const [loadedRevision, setLoadedRevision] = useState<number | undefined>(workflowRevision);
  const [revisionConflict, setRevisionConflict] = useState(false);
  const workflowRevisionRef = useRef(workflowRevision);
  useEffect(() => {
    workflowRevisionRef.current = workflowRevision;
  }, [workflowRevision]);


  const gradeColor = '#0369a1';
  const valoresEscalaDesc = useMemo(
    () => [...valoresEscala].sort((a, b) => b.pesoNumerico - a.pesoNumerico || b.ordenVisual - a.ordenVisual),
    [valoresEscala],
  );

  const getClassNameForValor = useCallback((valorId?: string | null) => {
    if (!valorId) return 'cys-grade-select';
    const val = valoresEscala.find((v) => v.id === valorId);
    if (!val) return 'cys-grade-select';
    return 'cys-grade-select cys-grade-alcanzado';
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
        }
      } catch (err) {
        console.error('Error al calcular progreso del curso:', err);
      }
    };
    void loadProgreso();
    return () => {
      active = false;
    };
  }, [alumnos, cursoMaterias, criteriosMap, periodoId, dataSource, workflowRevision]);


  const [alumnoRevision, setAlumnoRevision] = useState(0);
  const loadAlumnoData = useCallback(() => setAlumnoRevision((value) => value + 1), []);
  const hasChanges = useMemo(() => {
    const matsModified = Object.values(materiasState).some((m) => m.isModified);
    const closureModified = access.canEditPeriodClosure && asistenciaState.isModified;
    const supportModified = access.canEditStudentSupport && Boolean(apoyoState.isModified);
    return matsModified || closureModified || supportModified;
  }, [access.canEditPeriodClosure, access.canEditStudentSupport, materiasState, asistenciaState, apoyoState]);
  const refreshRevision = hasChanges || editingMateriaId ? loadedRevision : workflowRevision;
  const alumnoRequestKey = [selectedInscripcionId, periodoId, alumnoRevision, refreshRevision].join(':');
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
        setEditingGradeField(null);
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
        setLoadedRevision(workflowRevisionRef.current);
        setRevisionConflict(false);
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


  const hasRevisionConflict = revisionConflict || Boolean(
    workflowRevision !== undefined
      && loadedRevision !== undefined
      && workflowRevision !== loadedRevision
      && (hasChanges || editingMateriaId),
  );

  const handleSave = async () => {
    if (hasRevisionConflict || (readOnly && !editingMateriaId) || !selectedInscripcionId || !periodoId || !alumnoDataReady) return;

    const incompleteMateria = cursoMaterias.find((cm) => {
      const mat = materiasState[cm.id];
      if (!mat?.isModified) return false;
      const criteriosCompletos = (criteriosMap[cm.id] || []).every(
        (criterio) => Boolean(mat.criteriosValores[criterio.id]),
      );
      const calificacionGeneralCompleta = esMateriaConducta(cm.materiaNombre)
        || Boolean(mat.calificacionGeneralId);
      return !criteriosCompletos || !calificacionGeneralCompleta;
    });

    if (incompleteMateria) {
      message.warning(`Completá todas las calificaciones obligatorias de ${incompleteMateria.materiaNombre} antes de guardar.`);
      return;
    }

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
      const cierre = access.canEditPeriodClosure
        && (access.mode === 'magic-link' || asistenciaState.isModified)
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
      const result = await dataSource.saveAlumno({
        inscripcionId: selectedInscripcionId,
        periodoId,
        expectedRevision: loadedRevision,
        materias,
        cierre,
        apoyos,
      });
      setLoadedRevision(result.revision ?? workflowRevision);
      setRevisionConflict(false);

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
      setEditingGradeField(null);
      if (readOnly) setEditingMateriaId(null);
      onSaveSuccess?.(result.revision);
    } catch (err) {
      console.error(err);
      if (err instanceof TeacherAccessDeniedError) {
        message.error('El acceso ya no está vigente. No se guardaron cambios.');
        access.onAccessDenied?.();
      } else if (err instanceof GradebookRevisionConflictError) {
        setRevisionConflict(true);
        onSaveSuccess?.(err.currentRevision);
        message.warning('Otra sesión actualizó esta planilla. No se guardó ningún cambio.');
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
      {hasRevisionConflict && (
        <Alert
          type="warning"
          showIcon
          title="Esta planilla cambió en otra sesión"
          description="Tus cambios locales no se sobrescribieron ni se guardaron. Cargá la versión actual antes de continuar."
          action={(
            <Button
              onClick={() => {
                setEditingMateriaId(null);
                setRevisionConflict(false);
                loadAlumnoData();
              }}
            >
              Cargar versión actual
            </Button>
          )}
        />
      )}
      { }
      {currentAlumno && (
        <div
          className={`${ui.operationalContent} cys-sticky-student-banner`}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <Tooltip title="Alumno anterior">
              <Button
                type="text"
                icon={<LeftOutlined style={{ fontSize: 11 }} />}
                onClick={handlePrevStudent}
                disabled={isFirst}
                style={{ borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: 'var(--cys-color-text-description)' }}
              >
                Anterior
              </Button>
            </Tooltip>
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
                  padding: '4px 10px',
                  borderRadius: 8,
                  transition: 'all 0.15s ease',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {currentAlumno.numeroOrden || <UserOutlined />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <div className={ui.tightRow}>
                    <Typography.Text strong ellipsis style={{ fontSize: 15, color: 'var(--cys-color-text)' }}>
                      {currentAlumno.nombreCompleto}
                    </Typography.Text>
                    <DownOutlined style={{ fontSize: 11, color: 'var(--cys-color-primary-text)', flexShrink: 0 }} />
                  </div>
                  <div className={ui.inlineControls}>
                    <Tag
                      color={stats.percent === 100 ? 'green' : 'blue'}
                      style={{ fontWeight: 700, margin: 0, fontSize: 10.5, padding: '1px 6px' }}
                    >
                      {stats.completedCount}/{stats.total} materias ({stats.percent}%)
                    </Tag>
                    <Progress
                      percent={stats.percent}
                      showInfo={false}
                      strokeColor={stats.percent === 100 ? '#10b981' : '#2563eb'}
                      size="small"
                      style={{ width: 110, margin: 0 }}
                    />
                  </div>
                </div>
              </div>
            </Popover>
            <Tooltip title="Alumno siguiente">
              <Button
                type="text"
                onClick={handleNextStudent}
                disabled={isLast}
                style={{ borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: 'var(--cys-color-text-description)' }}
              >
                Siguiente <RightOutlined style={{ fontSize: 11 }} />
              </Button>
            </Tooltip>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Button
              icon={<DashboardOutlined className={ui.primary} />}
              onClick={() => setDrawerResumenOpen(true)}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Guía del Curso
            </Button>
            {access.canSubmitPeriod && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmitPeriod}
                loading={submittingPeriod}
                disabled={!periodIsComplete || hasChanges}
                style={{ borderRadius: 8, fontWeight: 600 }}
              >
                Enviar bimestre
              </Button>
            )}
          </div>
        </div>
      )}
      { }
      {access.canEditStudentSupport && (
        <div className={ui.operationalContent}>
          <Card
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
          </Card>
        </div>
      )}

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
        <div className={ui.operationalContent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #1e40af, #2563eb)',
                  border: '1px solid #1d4ed8',
                }}
                >
                  <Space size={8} align="center" style={{ flexShrink: 0 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.16)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {matIdx + 1}
                    </div>
                    <div>
                      <Typography.Text strong style={{ fontSize: 14.5, color: '#ffffff' }}>
                        <BookOutlined style={{ marginRight: 6, color: '#ffffff' }} />
                        {cm.materiaNombre}
                      </Typography.Text>
                    </div>
                    {isMateriaComplete ? (
                      <Tag
                        icon={<CheckCircleOutlined />}
                        style={{
                          margin: 0,
                          padding: '1px 7px',
                          borderRadius: 6,
                          border: '1px solid rgba(255, 255, 255, 0.34)',
                          background: 'rgba(255, 255, 255, 0.18)',
                          color: '#ffffff',
                          fontSize: 10.5,
                          fontWeight: 700,
                        }}
                      >
                        Completa
                      </Tag>
                    ) : (
                      <Tag
                        icon={<ExclamationCircleOutlined />}
                        style={{
                          margin: 0,
                          padding: '1px 7px',
                          borderRadius: 6,
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          background: 'rgba(15, 23, 42, 0.16)',
                          color: '#ffffff',
                          fontSize: 10.5,
                          fontWeight: 700,
                        }}
                      >
                        Incompleta
                      </Tag>
                    )}
                  </Space>

                  { }
                  <Space size={8} align="center" wrap style={{ flexShrink: 0 }}>
                    {!esConducta && (
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
                          disabled={!mat.isModified || hasRevisionConflict}
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
                            <div style={{ flex: 1, minWidth: 240 }}>
                              <Typography.Text style={{ fontSize: 14, color: 'var(--cys-color-text)', fontWeight: 500, lineHeight: 1.4 }}>
                                <span style={{ fontWeight: 700, color: 'var(--cys-color-primary-text)', marginRight: 8, fontSize: 14.5 }}>
                                  {num}.
                                </span>
                                {crit.nombre}
                                {access.mode === 'magic-link' && (
                                  <Typography.Text type="danger" aria-hidden="true"> *</Typography.Text>
                                )}
                              </Typography.Text>
                            </div>

                            {isMateriaReadOnly ? (
                              <Typography.Text
                                strong
                                style={{
                                  color: valActual
                                    ? gradeColor
                                    : 'var(--cys-color-text-description)',
                                }}
                              >
                                {valoresEscala.find((v) => v.id === valActual)?.etiqueta || 'Sin calificar'}
                              </Typography.Text>
                            ) : access.mode === 'magic-link'
                              && valActual
                              && editingGradeField !== criterioFieldKey(cm.id, crit.id) ? (
                              <Space size={8} wrap className={styles.gradeSummary}>
                                <Typography.Text strong className={styles.gradeValue}>
                                  {valoresEscala.find((v) => v.id === valActual)?.etiqueta || 'Sin calificar'}
                                </Typography.Text>
                                <Tooltip title="Modificar calificación">
                                  <Button
                                    type="text"
                                    size="small"
                                    shape="circle"
                                    aria-label="Modificar calificación"
                                    icon={<EditOutlined />}
                                    onClick={() => setEditingGradeField(criterioFieldKey(cm.id, crit.id))}
                                  />
                                </Tooltip>
                              </Space>
                            ) : (
                              <div className={styles.gradeEditor}>
                                <Select
                                  size="middle"
                                  placeholder="Calificar..."
                                  aria-required="true"
                                  autoFocus={editingGradeField === criterioFieldKey(cm.id, crit.id)}
                                  value={valActual}
                                  onChange={(val) => {
                                    handleCriterioChange(cm.id, crit.id, val || null);
                                    setEditingGradeField(null);
                                  }}
                                  onSelect={() => setEditingGradeField(null)}
                                  onBlur={() => {
                                    if (valActual) setEditingGradeField(null);
                                  }}
                                  className={`${getClassNameForValor(valActual)} ${styles.gradeSelect}`}
                                  options={valoresEscalaDesc.map((v) => ({
                                    value: v.id,
                                    label: (
                                      <span style={{ color: gradeColor, fontWeight: 700, fontSize: 13 }}>
                                        {v.etiqueta}
                                      </span>
                                    ),
                                  }))}
                                />
                                {access.mode === 'magic-link'
                                  && valActual
                                  && editingGradeField === criterioFieldKey(cm.id, crit.id) && (
                                  <Tooltip title="Cancelar modificación">
                                    <Button
                                      type="text"
                                      size="small"
                                      shape="circle"
                                      aria-label="Cancelar modificación"
                                      icon={<CloseOutlined />}
                                      onClick={() => setEditingGradeField(null)}
                                    />
                                  </Tooltip>
                                )}
                              </div>
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
                          <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8 }}>
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
                              {access.mode === 'magic-link' && (
                                <Typography.Text type="danger" aria-hidden="true"> *</Typography.Text>
                              )}
                            </Typography.Text>
                          </div>

                          {isMateriaReadOnly ? (
                            <Typography.Text
                              strong
                              style={{
                                color: mat.calificacionGeneralId
                                  ? gradeColor
                                  : 'var(--cys-color-text-description)',
                              }}
                            >
                              {valoresEscala.find((v) => v.id === mat.calificacionGeneralId)?.etiqueta || 'Sin calificar'}
                            </Typography.Text>
                          ) : access.mode === 'magic-link'
                            && mat.calificacionGeneralId
                            && editingGradeField !== calificacionGeneralFieldKey(cm.id) ? (
                            <Space size={8} wrap className={styles.gradeSummary}>
                              <Typography.Text strong className={styles.gradeValue}>
                                {valoresEscala.find((v) => v.id === mat.calificacionGeneralId)?.etiqueta || 'Sin calificar'}
                              </Typography.Text>
                              <Tooltip title="Modificar calificación">
                                <Button
                                  type="text"
                                  size="small"
                                  shape="circle"
                                  aria-label="Modificar calificación general"
                                  icon={<EditOutlined />}
                                  onClick={() => setEditingGradeField(calificacionGeneralFieldKey(cm.id))}
                                />
                              </Tooltip>
                            </Space>
                          ) : (
                            <div className={styles.gradeEditor}>
                              <Select
                                size="middle"
                                placeholder="Calificar..."
                                aria-required="true"
                                autoFocus={editingGradeField === calificacionGeneralFieldKey(cm.id)}
                                value={mat.calificacionGeneralId || undefined}
                                onChange={(val) => {
                                  handleCalificacionGeneralChange(cm.id, val || null);
                                  setEditingGradeField(null);
                                }}
                                onSelect={() => setEditingGradeField(null)}
                                onBlur={() => {
                                  if (mat.calificacionGeneralId) setEditingGradeField(null);
                                }}
                                className={`${getClassNameForValor(mat.calificacionGeneralId)} ${styles.gradeSelect}`}
                                options={valoresEscalaDesc.map((v) => ({
                                  value: v.id,
                                  label: (
                                    <span style={{ color: gradeColor, fontWeight: 700, fontSize: 13 }}>
                                      {v.etiqueta}
                                    </span>
                                  ),
                                }))}
                              />
                              {access.mode === 'magic-link'
                                && mat.calificacionGeneralId
                                && editingGradeField === calificacionGeneralFieldKey(cm.id) && (
                                <Tooltip title="Cancelar modificación">
                                  <Button
                                    type="text"
                                    size="small"
                                    shape="circle"
                                    aria-label="Cancelar modificación"
                                    icon={<CloseOutlined />}
                                    onClick={() => setEditingGradeField(null)}
                                  />
                                </Tooltip>
                              )}
                            </div>
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
          {access.canEditPeriodClosure && (
            <>
              <Card
                style={{
                  borderRadius: 14,
                  border: asistenciaState.isModified ? '1.5px solid #7c3aed' : "1px solid var(--cys-color-border-secondary)",
                  background: 'var(--cys-color-bg-container)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                <Typography.Title level={5} style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>
                  Asistencias
                </Typography.Title>
                <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Space orientation="vertical" size={4} className={ui.fullWidth}>
                  <Typography.Text strong className={ui.secondaryCaption}>
                    ASISTENCIAS <Typography.Text type="danger" aria-hidden="true">*</Typography.Text>
                  </Typography.Text>
                  {readOnly ? <Typography.Text strong>{asistenciaState.asistencias}</Typography.Text> : (
                    <InputNumber
                      aria-required="true"
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
                    INASISTENCIAS <Typography.Text type="danger" aria-hidden="true">*</Typography.Text>
                  </Typography.Text>
                  {readOnly ? <Typography.Text strong>{asistenciaState.inasistencias}</Typography.Text> : (
                    <InputNumber
                      aria-required="true"
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
                    LLEGADAS TARDE <Typography.Text type="danger" aria-hidden="true">*</Typography.Text>
                  </Typography.Text>
                  {readOnly ? <Typography.Text strong>{asistenciaState.llegadasTarde}</Typography.Text> : (
                    <InputNumber
                      aria-required="true"
                      min={0}
                      max={180}
                      className={ui.fullWidth}
                      value={asistenciaState.llegadasTarde}
                      onChange={(val) => handleAsistenciaChange('llegadasTarde', val ?? 0)}
                    />
                  )}
                </Space>
              </Col>

                </Row>
              </Card>
              <Card
                style={{
                  borderRadius: 14,
                  border: asistenciaState.isModified ? '1.5px solid #7c3aed' : "1px solid var(--cys-color-border-secondary)",
                  background: 'var(--cys-color-bg-container)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                <Typography.Title level={5} style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>
                  Observaciones
                </Typography.Title>
                <Space orientation="vertical" size={4} className={ui.fullWidth}>
                  <Typography.Text strong className={ui.secondaryCaption}>
                    OBSERVACIONES
                  </Typography.Text>
                  {readOnly ? (
                    <Typography.Paragraph style={{ margin: 0 }}>
                      {asistenciaState.observaciones || 'Sin observaciones'}
                    </Typography.Paragraph>
                  ) : (
                    <Input.TextArea
                      rows={2}
                      value={asistenciaState.observaciones}
                      onChange={(e) => handleAsistenciaChange('observaciones', e.target.value)}
                      maxLength={300}
                      showCount
                    />
                  )}
                </Space>
              </Card>
            </>
          )}
        </div>
      )}

      { }
      {hasChanges && !readOnly && (
        <div
          className={`${ui.operationalContent} cys-floating-action-bar`}
          style={{
            position: 'sticky',
            bottom: 16,
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--cys-color-bg-container, #ffffff)',
            border: '1.5px solid #3b82f6',
            borderRadius: 14,
            padding: '10px 16px',
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
            <Typography.Text strong style={{ fontSize: 13.5, color: 'var(--cys-color-text)' }}>
              Cambios sin guardar
            </Typography.Text>
          </Space>

          <Space size={10}>
            <Button
              onClick={() => void loadAlumnoData()}
              disabled={saving || hasRevisionConflict}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Descartar
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={hasRevisionConflict}
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
                  borderRadius: 8,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography.Text type="secondary" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--cys-color-text-description)' }}>
                  Pendientes
                </Typography.Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cys-color-text)' }}>
                  {progresoResumen.totalAlumnos - progresoResumen.completadosCount}
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div
                style={{
                  background: "var(--cys-color-success-bg)",
                  border: '1px solid #86efac',
                  borderRadius: 8,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography.Text style={{ fontSize: 11.5, fontWeight: 600, color: "var(--cys-color-success-text)" }}>
                  Completos
                </Typography.Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cys-color-success-text)' }}>
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
              { value: 'TODOS', label: <Space size={5}><UnorderedListOutlined />Todos ({alumnos.length})</Space> },
              { value: 'PENDIENTES', label: <Space size={5}><ClockCircleOutlined />Pendientes ({progresoResumen.totalAlumnos - progresoResumen.completadosCount})</Space> },
              { value: 'COMPLETOS', label: <Space size={5}><CheckCircleOutlined />Completos ({progresoResumen.completadosCount})</Space> },
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
