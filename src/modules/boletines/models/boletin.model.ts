import type { CursoRecord } from '../../inscripciones/models/inscripcion.model';

// ==========================================
// 1. MATERIAS (Catálogo General)
// ==========================================
export interface MateriaRecord {
  id: string;
  created: string;
  updated: string;
  nombre: string;
}

export interface Materia {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export const materiaAdapter = (record: MateriaRecord): Materia => ({
  id: record.id,
  nombre: record.nombre || '',
  createdAt: record.created,
  updatedAt: record.updated,
});

// ==========================================
// 2. PERIODOS (Bimestres por Ciclo Lectivo)
// ==========================================
export interface PeriodoRecord {
  id: string;
  created: string;
  updated: string;
  ciclo_id: string;
  nombre: string;
  numero_periodo: number;
  expand?: {
    ciclo_id?: {
      id: string;
      ano: number;
      actual: boolean;
    };
  };
}

export interface Periodo {
  id: string;
  cicloId: string;
  nombre: string;
  numeroPeriodo: number;
  cicloAno?: number;
  createdAt: string;
  updatedAt: string;
}

export const periodoAdapter = (record: PeriodoRecord): Periodo => ({
  id: record.id,
  cicloId: record.ciclo_id,
  nombre: record.nombre || '',
  numeroPeriodo: Number(record.numero_periodo) || 1,
  cicloAno: record.expand?.ciclo_id?.ano,
  createdAt: record.created,
  updatedAt: record.updated,
});

// ==========================================
// 3. CURSO_MATERIAS (Malla Curricular del Curso)
// ==========================================
export interface CursoMateriaRecord {
  id: string;
  created: string;
  updated: string;
  curso_id: string;
  materia_id: string;
  orden_visual: number;
  expand?: {
    curso_id?: CursoRecord;
    materia_id?: MateriaRecord;
  };
}

export interface CursoMateria {
  id: string;
  cursoId: string;
  materiaId: string;
  ordenVisual: number;
  materiaNombre: string;
  cursoNombre?: string;
  criteriosCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const cursoMateriaAdapter = (record: CursoMateriaRecord): CursoMateria => ({
  id: record.id,
  cursoId: record.curso_id,
  materiaId: record.materia_id,
  ordenVisual: Number(record.orden_visual) || 0,
  materiaNombre: record.expand?.materia_id?.nombre || 'Materia sin nombre',
  cursoNombre: record.expand?.curso_id?.nombre || '',
  createdAt: record.created,
  updatedAt: record.updated,
});

// ==========================================
// 4. CRITERIOS_EVALUACION (5 Conceptos por Materia)
// ==========================================
export interface CriterioEvaluacionRecord {
  id: string;
  created: string;
  updated: string;
  curso_materia_id: string;
  nombre: string;
  orden_visual: number;
  expand?: {
    curso_materia_id?: CursoMateriaRecord;
  };
}

export interface CriterioEvaluacion {
  id: string;
  cursoMateriaId: string;
  nombre: string;
  ordenVisual: number;
  createdAt: string;
  updatedAt: string;
}

export const criterioEvaluacionAdapter = (record: CriterioEvaluacionRecord): CriterioEvaluacion => ({
  id: record.id,
  cursoMateriaId: record.curso_materia_id,
  nombre: record.nombre || '',
  ordenVisual: Number(record.orden_visual) || 1,
  createdAt: record.created,
  updatedAt: record.updated,
});

// Tipos auxiliares para formularios del constructor
export interface CriterioFormItem {
  id?: string;
  orden_visual: number;
  nombre: string;
}

// ==========================================
// 5. ESCALAS DE CALIFICACIÓN Y VALORES
// ==========================================
export interface EscalaCalificacionRecord {
  id: string;
  created: string;
  updated: string;
  nombre: string;
}

export interface EscalaCalificacion {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export const escalaCalificacionAdapter = (record: EscalaCalificacionRecord): EscalaCalificacion => ({
  id: record.id,
  nombre: record.nombre || '',
  createdAt: record.created,
  updatedAt: record.updated,
});

export interface ValorEscalaRecord {
  id: string;
  created: string;
  updated: string;
  escala_id: string;
  peso_numerico: number;
  etiqueta: string;
  orden_visual: number;
  expand?: {
    escala_id?: EscalaCalificacionRecord;
  };
}

export interface ValorEscala {
  id: string;
  escalaId: string;
  pesoNumerico: number;
  etiqueta: string;
  ordenVisual: number;
  escalaNombre?: string;
  createdAt: string;
  updatedAt: string;
}

export const valorEscalaAdapter = (record: ValorEscalaRecord): ValorEscala => ({
  id: record.id,
  escalaId: record.escala_id,
  pesoNumerico: Number(record.peso_numerico) || 0,
  etiqueta: record.etiqueta || '',
  ordenVisual: Number(record.orden_visual) || 0,
  escalaNombre: record.expand?.escala_id?.nombre,
  createdAt: record.created,
  updatedAt: record.updated,
});

// =========================================================================
// 6. EVALUACIONES_MATERIA (Cierre de materia por bimestre para un alumno)
// =========================================================================
export interface EvaluacionMateriaRecord {
  id: string;
  created: string;
  updated: string;
  inscripcion_id: string;
  curso_materia_id: string;
  periodo_id: string;
  ppi: boolean;
  calificacion_general_id: string;
  expand?: {
    inscripcion_id?: unknown;
    curso_materia_id?: CursoMateriaRecord;
    periodo_id?: PeriodoRecord;
    calificacion_general_id?: ValorEscalaRecord;
  };
}

export interface EvaluacionMateria {
  id: string;
  inscripcionId: string;
  cursoMateriaId: string;
  periodoId: string;
  ppi: boolean;
  calificacionGeneralId: string;
  calificacionGeneralEtiqueta?: string;
  cursoMateriaNombre?: string;
  periodoNombre?: string;
  createdAt: string;
  updatedAt: string;
}

export const evaluacionMateriaAdapter = (record: EvaluacionMateriaRecord): EvaluacionMateria => ({
  id: record.id,
  inscripcionId: record.inscripcion_id,
  cursoMateriaId: record.curso_materia_id,
  periodoId: record.periodo_id,
  ppi: Boolean(record.ppi),
  calificacionGeneralId: record.calificacion_general_id || '',
  calificacionGeneralEtiqueta: record.expand?.calificacion_general_id?.etiqueta,
  cursoMateriaNombre: record.expand?.curso_materia_id?.expand?.materia_id?.nombre,
  periodoNombre: record.expand?.periodo_id?.nombre,
  createdAt: record.created,
  updatedAt: record.updated,
});

// =========================================================================
// 7. EVALUACIONES_CRITERIOS (Respuesta a cada uno de los 5 conceptos)
// =========================================================================
export interface EvaluacionCriterioRecord {
  id: string;
  created: string;
  updated: string;
  evaluacion_materia_id: string;
  criterio_id: string;
  valor_escala_id: string;
  expand?: {
    evaluacion_materia_id?: EvaluacionMateriaRecord;
    criterio_id?: CriterioEvaluacionRecord;
    valor_escala_id?: ValorEscalaRecord;
  };
}

export interface EvaluacionCriterio {
  id: string;
  evaluacionMateriaId: string;
  criterioId: string;
  valorEscalaId: string;
  criterioNombre?: string;
  criterioOrden?: number;
  valorEscalaEtiqueta?: string;
  createdAt: string;
  updatedAt: string;
}

export const evaluacionCriterioAdapter = (record: EvaluacionCriterioRecord): EvaluacionCriterio => ({
  id: record.id,
  evaluacionMateriaId: record.evaluacion_materia_id,
  criterioId: record.criterio_id,
  valorEscalaId: record.valor_escala_id || '',
  criterioNombre: record.expand?.criterio_id?.nombre,
  criterioOrden: record.expand?.criterio_id?.orden_visual,
  valorEscalaEtiqueta: record.expand?.valor_escala_id?.etiqueta,
  createdAt: record.created,
  updatedAt: record.updated,
});

// =========================================================================
// 8. CIERRES_PERIODO_ALUMNO (Asistencias y observaciones globales del bimestre)
// =========================================================================
export interface CierrePeriodoAlumnoRecord {
  id: string;
  created: string;
  updated: string;
  inscripcion_id: string;
  periodo_id: string;
  asistencias: number;
  inasistencias: number;
  llegadas_tarde: number;
  observaciones: string;
  expand?: {
    inscripcion_id?: unknown;
    periodo_id?: PeriodoRecord;
  };
}

export interface CierrePeriodoAlumno {
  id: string;
  inscripcionId: string;
  periodoId: string;
  asistencias: number;
  inasistencias: number;
  llegadasTarde: number;
  observaciones: string;
  periodoNombre?: string;
  createdAt: string;
  updatedAt: string;
}

export const cierrePeriodoAlumnoAdapter = (record: CierrePeriodoAlumnoRecord): CierrePeriodoAlumno => ({
  id: record.id,
  inscripcionId: record.inscripcion_id,
  periodoId: record.periodo_id,
  asistencias: Number(record.asistencias) || 0,
  inasistencias: Number(record.inasistencias) || 0,
  llegadasTarde: Number(record.llegadas_tarde) || 0,
  observaciones: record.observaciones || '',
  periodoNombre: record.expand?.periodo_id?.nombre,
  createdAt: record.created,
  updatedAt: record.updated,
});

// =========================================================================
// 9. MODELOS COMBINADOS DE DOMINIO PARA LA VISTA/CARGA DE CALIFICACIONES
// =========================================================================
export interface CalificacionCriterioItem {
  criterioId: string;
  criterioNombre: string;
  ordenVisual: number;
  valorEscalaId: string;
  etiqueta?: string;
}

export interface EvaluacionMateriaBimestre {
  inscripcionId: string;
  cursoMateriaId: string;
  periodoId: string;
  evaluacionMateriaId?: string;
  criterios: CalificacionCriterioItem[];
  ppi: boolean;
  calificacionGeneralId: string | null;
  calificacionGeneralEtiqueta?: string;
}

export interface AlumnoInscriptoRow {
  inscripcionId: string;
  alumnoId: string;
  numeroOrden: number | null;
  numeroLegajo: string;
  dni: string;
  apellidos: string;
  nombres: string;
  nombreCompleto: string;
  estado: string;
  promocionoConAcompanamiento?: string;
  poseeApoyos?: string;
  cualesApoyos?: string;
}

// =========================================================================
// 9. PROGRESO Y GUÍA VISUAL DE ALUMNOS (ESTADOS SEMAFÓRICOS)
// =========================================================================
export type EstadoProgresoAlumno = 'COMPLETO' | 'EN_PROGRESO' | 'SIN_INICIAR';

export interface MateriaProgresoItem {
  cursoMateriaId: string;
  materiaNombre: string;
  completada: boolean;
  ppi: boolean;
  calificacionGeneralId: string | null;
  criteriosEvaluados: number;
  criteriosTotal: number;
}

export interface ProgresoAlumnoDetalle {
  inscripcionId: string;
  alumnoId: string;
  numeroOrden: number | null;
  nombreCompleto: string;
  totalMaterias: number;
  materiasCompletadas: number;
  tieneAsistencia: boolean;
  porcentaje: number;
  estado: EstadoProgresoAlumno;
  materiasDetalle: MateriaProgresoItem[];
}

export interface ProgresoCursoResumen {
  totalAlumnos: number;
  completadosCount: number;
  enProgresoCount: number;
  sinIniciarCount: number;
  porcentajeGlobal: number;
}

// =========================================================================
// 9.1 MONITOREO Y SEGUIMIENTO INSTITUCIONAL (VISTA DIRECTIVA)
// =========================================================================
export type EstadoMonitoreoCurso = 'COMPLETO' | 'EN_PROGRESO' | 'SIN_INICIAR' | 'SIN_ENLACE';

export interface MateriaMonitoreoResumen {
  cursoMateriaId: string;
  materiaId: string;
  materiaNombre: string;
  totalAlumnos: number;
  alumnosEvaluados: number;
  porcentaje: number;
  docenteNombre?: string;
  tieneToken: boolean;
}

export interface CursoMonitoreoResumen {
  cursoId: string;
  cursoNombre: string;
  gradoNumero: number | null;
  totalAlumnos: number;
  alumnosCompletos: number;
  alumnosEnProgreso: number;
  alumnosSinIniciar: number;
  porcentaje: number;
  estado: EstadoMonitoreoCurso;
  tokenDocente?: TokenAccesoDocente;
  materias: MateriaMonitoreoResumen[];
}

export interface MonitoreoInstitucionalData {
  totalAlumnosColegio: number;
  completadosColegio: number;
  enProgresoColegio: number;
  sinIniciarColegio: number;
  porcentajeGlobalColegio: number;
  cursosCompletosCount: number;
  cursosEnProgresoCount: number;
  cursosSinIniciarCount: number;
  cursosSinTokenCount: number;
  cursos: CursoMonitoreoResumen[];
}


// =========================================================================
// 10. TOKENS DE ACCESO EXTERNO DOCENTE (MAGIC LINKS / MODO KIOSCO)
// =========================================================================
export interface TokenAccesoDocenteRecord {
  id: string;
  created: string;
  updated: string;
  token: string;
  curso_id: string;
  periodo_id: string;
  materia_id?: string;
  docente_nombre: string;
  activo: boolean;
  fecha_expiracion?: string;
  expand?: {
    curso_id?: CursoRecord;
    periodo_id?: PeriodoRecord;
    materia_id?: MateriaRecord;
  };
}

export interface TokenAccesoDocente {
  id: string;
  token: string;
  cursoId: string;
  periodoId: string;
  materiaId?: string;
  docenteNombre: string;
  activo: boolean;
  fechaExpiracion?: string;
  cursoNombre?: string;
  periodoNombre?: string;
  numeroPeriodo?: number;
  materiaNombre?: string;
  createdAt: string;
  updatedAt: string;
}

export const tokenAccesoDocenteAdapter = (record: TokenAccesoDocenteRecord): TokenAccesoDocente => ({
  id: record.id,
  token: record.token || '',
  cursoId: record.curso_id || '',
  periodoId: record.periodo_id || '',
  materiaId: record.materia_id || undefined,
  docenteNombre: record.docente_nombre || '',
  activo: Boolean(record.activo),
  fechaExpiracion: record.fecha_expiracion || undefined,
  cursoNombre: record.expand?.curso_id?.nombre,
  periodoNombre: record.expand?.periodo_id?.nombre,
  numeroPeriodo:
    record.expand?.periodo_id?.numero_periodo !== undefined
      ? Number(record.expand.periodo_id.numero_periodo)
      : undefined,
  materiaNombre: record.expand?.materia_id?.nombre,
  createdAt: record.created,
  updatedAt: record.updated,
});

/**
 * Determina si una materia corresponde a un área formativa / conductual
 * (ej: "TRABAJO EN EL AULA", "CONVIVENCIA"), las cuales evalúan sus 5 criterios
 * pedagógicos pero no llevan indicador de PPI ni Calificación General.
 */
export const esMateriaConducta = (nombre?: string): boolean => {
  if (!nombre) return false;
  const n = nombre.trim().toUpperCase();
  return (
    n.includes('TRABAJO EN EL AULA') ||
    n.includes('TRABAJO PERSONAL') ||
    n.includes('CONVIVENCIA') ||
    n.includes('CONDUCTA')
  );
};

// =========================================================================
// 11. PROGRESO GLOBAL DE CONSTRUCCIÓN DE MALLA CURRICULAR (POR CURSO)
// =========================================================================
export interface ProgresoConstructorCurso {
  cursoId: string;
  totalMaterias: number;
  materiasCompletas: number;
  criteriosConfigurados: number;
  criteriosTotalEsperado: number;
  porcentaje: number;
  estado: 'COMPLETO' | 'EN_PROGRESO' | 'SIN_CRITERIOS' | 'VACIO';
}




