export type EtapaAsistenciaB4 =
  | 'PENDIENTE_EMISION'
  | 'CARGA_DOCENTE'
  | 'CARGA_PAUSADA'
  | 'CONTROL_DIRECTIVO'
  | 'COMPLETADO';

export interface InstanciaAsistenciaB4 {
  id: string;
  cursoId: string;
  periodoId: string;
  estado: 'BORRADOR_DOCENTE' | 'CONTROL_DIRECTIVO';
  revision: number;
  enviadoEn: string | null;
  enviadoPor: string | null;
}

export interface TokenAsistenciaB4 {
  id: string;
  cursoId: string;
  periodoId: string;
  docenteNombre: string;
  tokenPrefijo: string;
  recuperable: boolean;
  ultimoUso: string | null;
  created: string;
}

export interface CursoAsistenciaB4Etapa {
  cursoId: string;
  cursoNombre: string;
  turno: string;
  etapa: EtapaAsistenciaB4;
  instancia: InstanciaAsistenciaB4 | null;
  tokenDocente: TokenAsistenciaB4 | null;
  totalAlumnos: number;
  alumnosCargados: number;
  porcentaje: number;
}

export interface AlumnoAsistenciaB4Row {
  inscripcionId: string;
  alumnoId: string;
  numeroOrden: number | null;
  apellidos: string;
  nombres: string;
  nombreCompleto: string;
  estadoAdministrativo: string;
  cargado: boolean;
  asistencias: number | null;
  inasistencias: number | null;
  llegadasTarde: number | null;
}

export interface AlumnoExcluidoAsistenciaB4 {
  inscripcionId: string;
  alumnoId: string;
  numeroOrden: number | null;
  apellidos: string;
  nombres: string;
  nombreCompleto: string;
  estadoAdministrativo: string;
}

export interface CursoAsistenciaB4Snapshot {
  curso: {
    id: string;
    nombre: string;
    turno: string;
  };
  periodo: {
    id: string;
    nombre: string;
    numeroPeriodo: number;
    cicloId: string;
  };
  instancia: InstanciaAsistenciaB4 | null;
  totalAlumnos: number;
  alumnosCargados: number;
  alumnos: AlumnoAsistenciaB4Row[];
  excluidos: AlumnoExcluidoAsistenciaB4[];
  docenteNombre?: string;
}

export interface AsistenciaB4WriteRow {
  inscripcionId: string;
  asistencias: number;
  inasistencias: number;
  llegadasTarde: number;
}

export interface IssuedAsistenciaB4Link {
  enlace: TokenAsistenciaB4;
  tokenPrefijo: string;
  secreto: string;
}

export interface AsistenciaB4SubmitIncomplete {
  completa: false;
  totalAlumnos: number;
  alumnosCargados: number;
  pendientes: Array<{ inscripcionId: string; nombreCompleto: string }>;
}
