import type {
  AlumnoInscriptoRow,
  CierrePeriodoAlumno,
  CriterioEvaluacion,
  CursoMateria,
  ProgresoAlumnoDetalle,
  ProgresoCursoResumen,
} from './boletin.model';

export interface GradebookSubjectState {
  evaluacionMateriaId?: string;
  ppi: boolean;
  calificacionGeneralId: string | null;
  criteriosValores: Record<string, string>;
}

export interface GradebookSupportState {
  promocionoConAcompanamiento: string;
  poseeApoyos: string;
  cualesApoyos: string;
}

export interface GradebookStudentSnapshot {
  materias: Record<string, GradebookSubjectState>;
  cierre: CierrePeriodoAlumno | null;
  apoyos: GradebookSupportState | null;
}

export interface GradebookSubjectWrite {
  cursoMateriaId: string;
  ppi: boolean;
  calificacionGeneralId: string;
  criterios: Array<{ criterioId: string; valorEscalaId: string }>;
}

export interface GradebookStudentWrite {
  inscripcionId: string;
  periodoId: string;
  materias: GradebookSubjectWrite[];
  cierre?: {
    asistencias: number;
    inasistencias: number;
    llegadasTarde: number;
    observaciones: string;
  };
  apoyos?: GradebookSupportState;
}

export interface GradebookSubmissionResult {
  estado: 'CONTROL_DIRECTIVO';
  revision: number;
  enviadoAt: string;
  totalAlumnos: number;
  totalMaterias: number;
}

export interface GradebookSubmissionPendingStudent {
  inscripcionId: string;
  nombreCompleto: string;
  materiasPendientes: string[];
  cierrePendiente: boolean;
}

export interface GradebookSubmissionIncomplete {
  totalAlumnos: number;
  totalMaterias: number;
  alumnosCompletos: number;
  pendientes: GradebookSubmissionPendingStudent[];
}

export interface GradebookDataSource {
  getCriterios(
    cursoMateriaIds: string[],
  ): Promise<Record<string, CriterioEvaluacion[]>>;
  getProgreso(
    alumnos: AlumnoInscriptoRow[],
    cursoMaterias: CursoMateria[],
    criteriosMap: Record<string, CriterioEvaluacion[]>,
    periodoId: string,
  ): Promise<{
    alumnosProgreso: Record<string, ProgresoAlumnoDetalle>;
    resumen: ProgresoCursoResumen;
  }>;
  getAlumno(
    alumno: AlumnoInscriptoRow,
    periodoId: string,
  ): Promise<GradebookStudentSnapshot>;
  saveAlumno(data: GradebookStudentWrite): Promise<GradebookStudentSnapshot>;
  submitPeriod?(): Promise<GradebookSubmissionResult>;
}
