export type EstadoInscripcion = 'Regular' | 'Libre' | 'Baja';
export type TurnoCurso = 'Mañana' | 'Tarde' | 'Jornada Completa';

export interface NivelRecord {
  id: string;
  created: string;
  updated: string;
  nombre: string;
}

export interface Nivel {
  id: string;
  nombre: string;
}

export const nivelAdapter = (record: NivelRecord): Nivel => ({
  id: record.id,
  nombre: record.nombre,
});

export interface CursoRecord {
  id: string;
  created: string;
  updated: string;
  nombre: string;
  nivel_id: string;
  escala_id: string;
  turno: TurnoCurso;
  expand?: {
    nivel_id?: NivelRecord;
  };
}

export interface Curso {
  id: string;
  nombre: string;
  nivelId: string;
  nivelNombre: string;
  turno: TurnoCurso;
  escalaId: string;
  createdAt: string;
  updatedAt: string;
}

export const cursoAdapter = (record: CursoRecord): Curso => ({
  id: record.id,
  nombre: record.nombre,
  nivelId: record.nivel_id,
  nivelNombre: record.expand?.nivel_id?.nombre || '',
  turno: record.turno,
  escalaId: record.escala_id,
  createdAt: record.created,
  updatedAt: record.updated,
});

export interface CicloLectivoRecord {
  id: string;
  created: string;
  updated: string;
  ano: number;
  actual: boolean;
}

export interface CicloLectivo {
  id: string;
  ano: number;
  actual: boolean;
}

export const cicloLectivoAdapter = (record: CicloLectivoRecord): CicloLectivo => ({
  id: record.id,
  ano: record.ano,
  actual: record.actual,
});

export interface InscripcionRecord {
  id: string;
  created: string;
  updated: string;
  alumno_id: string;
  curso_id: string;
  ciclo_id: string;
  numero_orden?: number;
  numero_inscripcion?: string;
  fecha_inscripcion?: string;
  fecha_ingreso?: string;
  fecha_egreso?: string;
  estado: EstadoInscripcion;
  expand?: {
    alumno_id?: unknown;
    curso_id?: CursoRecord;
    ciclo_id?: CicloLectivoRecord;
  };
}

export interface Inscripcion {
  id: string;
  alumnoId: string;
  cursoId: string;
  cicloId: string;
  numeroOrden: number | null;
  numeroInscripcion: string;
  fechaInscripcion: string;
  fechaIngreso: string;
  fechaEgreso: string;
  estado: EstadoInscripcion;
  cursoNombre?: string;
  nivelNombre?: string;
  cicloAno?: number;
  createdAt: string;
  updatedAt: string;
}

export const inscripcionAdapter = (record: InscripcionRecord): Inscripcion => ({
  id: record.id,
  alumnoId: record.alumno_id,
  cursoId: record.curso_id,
  cicloId: record.ciclo_id,
  numeroOrden: record.numero_orden ?? null,
  numeroInscripcion: record.numero_inscripcion || '',
  fechaInscripcion: record.fecha_inscripcion || '',
  fechaIngreso: record.fecha_ingreso || '',
  fechaEgreso: record.fecha_egreso || '',
  estado: record.estado,
  cursoNombre: record.expand?.curso_id?.nombre,
  nivelNombre: record.expand?.curso_id?.expand?.nivel_id?.nombre,
  cicloAno: record.expand?.ciclo_id?.ano,
  createdAt: record.created,
  updatedAt: record.updated,
});
