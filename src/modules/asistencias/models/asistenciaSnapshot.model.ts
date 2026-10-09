import type { AlumnoRecord } from '../../alumnos/models/alumno.model';
import type { CursoRecord } from '../../inscripciones/models/inscripcion.model';
import type { AsistenciaDiariaRecord, EventoCalendarioRecord, MesCalendarioRecord, RegistroAsistenciaCursoRecord } from './asistencia.model';
export interface InscripcionConAlumnoRecord {
  id: string;
  curso_id: string;
  ciclo_id: string;
  alumno_id: string;
  numero_orden?: number;
  fecha_ingreso?: string;
  fecha_egreso?: string;
  estado: string;
  cursada_estado?: string;
  bimestre_desde?: number;
  bimestre_hasta?: number;
  procedencia_ingreso?: string;
  destino_egreso?: string;
  resolucion_apoyo?: string;
  posee_apoyos?: string;
  expand?: {
    alumno_id?: AlumnoRecord;
  };
}

export interface VersionRegistroAsistencia {
  revision: number;
  versionFuentes: string;
}

export interface RegistroAsistenciaSnapshot extends VersionRegistroAsistencia {
  mes: MesCalendarioRecord;
  curso: CursoRecord;
  inscripciones: InscripcionConAlumnoRecord[];
  eventos: EventoCalendarioRecord[];
  novedades: AsistenciaDiariaRecord[];
  registroCurso: RegistroAsistenciaCursoRecord | null;
}
