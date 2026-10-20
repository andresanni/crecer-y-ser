import type {
  EvaluacionInformeData,
  InstanciaInforme,
  RespuestaItemInforme,
  VisadoInformeDto,
} from './informe.model';

export interface InformeStudentSnapshot {
  inscripcionId: string;
  completo: boolean;
  itemsRespondidos: number;
  totalItems: number;
  desempenoGeneralCompleto: boolean;
  evaluacion: EvaluacionInformeData;
  visado?: VisadoInformeDto;
  revision?: number;
}

export interface InformeStudentWrite {
  inscripcionId: string;
  expectedRevision?: number;
  desempenoGeneralValor: string;
  observaciones: string;
  respuestas: RespuestaItemInforme[];
}

export interface InformeStudentSaveResult {
  revision?: number;
  completo: boolean;
  itemsRespondidos: number;
  totalItems: number;
  desempenoGeneralCompleto: boolean;
  evaluacion: EvaluacionInformeData;
  visado?: VisadoInformeDto;
  instancia?: InstanciaInforme;
}

export interface InformeSubmissionResult {
  instancia: InstanciaInforme;
  totalAlumnos: number;
  totalItems: number;
  cursosRestantes?: number;
  siguienteInstanciaId?: string | null;
}

export interface InformeSubmissionPendingStudent {
  inscripcionId: string;
  nombreCompleto: string;
  itemsPendientes: number;
  desempenoGeneralPendiente: boolean;
}

export interface InformeSubmissionIncomplete {
  completa: boolean;
  totalAlumnos: number;
  totalItems: number;
  alumnosCompletos: number;
  pendientes: InformeSubmissionPendingStudent[];
  cursadasPendientes: Array<{ inscripcionId: string; alumnoId?: string; nombreCompleto: string }>;
}

export interface InformeDataSource {
  getAlumno(inscripcionId: string): Promise<InformeStudentSnapshot>;
  saveAlumno(data: InformeStudentWrite): Promise<InformeStudentSaveResult>;
  submitReport?(): Promise<InformeSubmissionResult>;
}
