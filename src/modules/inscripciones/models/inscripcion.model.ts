export type EstadoInscripcion = 'Regular' | 'Libre' | 'Baja';
export type TurnoCurso = 'Mañana' | 'Tarde' | 'Jornada Completa';
export type OpcionBinariaSN = 'SI' | 'NO' | '-';

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

export interface CambioEscuelaItem {
  fecha: string;
  causa: string;
  escuelaDestino: string;
}

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
  cursada_estado?: string;
  bimestre_desde?: number;
  bimestre_hasta?: number;
  revision_cursada?: number;
  estado: EstadoInscripcion;
  promociono_con_acompanamiento?: OpcionBinariaSN;
  posee_apoyos?: OpcionBinariaSN;
  cuales_apoyos?: string;
  escuela_inicial?: string;
  fecha_ingreso_inicial?: string;
  fecha_egreso_inicial?: string;
  cambios_escuela?: CambioEscuelaItem[];
  cambio_domicilio?: string;
  procedencia_ingreso?: string;
  destino_egreso?: string;
  resolucion_apoyo?: string;
  expand?: {
    alumno_id?: unknown;
    curso_id?: CursoRecord;
    ciclo_id?: CicloLectivoRecord;
  };
}

export interface Inscripcion {
  cursadaEstado: string;
  bimestreDesde: number;
  bimestreHasta: number;
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
  promocionoConAcompanamiento: OpcionBinariaSN;
  poseeApoyos: OpcionBinariaSN;
  cualesApoyos: string;
  escuelaInicial: string;
  fechaIngresoInicial: string;
  fechaEgresoInicial: string;
  cambiosEscuela: CambioEscuelaItem[];
  cambioDomicilio: string;
  procedenciaIngreso: string;
  destinoEgreso: string;
  resolucionApoyo: string;
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
  fechaInscripcion: record.fecha_inscripcion?.slice(0, 10) || '',
  fechaIngreso: record.fecha_ingreso?.slice(0, 10) || '',
  fechaEgreso: record.fecha_egreso?.slice(0, 10) || '',
  estado: record.estado,
  cursadaEstado: record.cursada_estado || 'PENDIENTE',
  bimestreDesde: record.bimestre_desde || 0,
  bimestreHasta: record.bimestre_hasta || 0,
  promocionoConAcompanamiento: record.promociono_con_acompanamiento || '-',
  poseeApoyos: record.posee_apoyos || '-',
  cualesApoyos: record.cuales_apoyos || '',
  escuelaInicial: record.escuela_inicial || '',
  fechaIngresoInicial: record.fecha_ingreso_inicial?.slice(0, 10) || '',
  fechaEgresoInicial: record.fecha_egreso_inicial?.slice(0, 10) || '',
  cambiosEscuela: Array.isArray(record.cambios_escuela) ? record.cambios_escuela : [],
  cambioDomicilio: record.cambio_domicilio || '',
  procedenciaIngreso: record.procedencia_ingreso || '',
  destinoEgreso: record.destino_egreso || '',
  resolucionApoyo: record.resolucion_apoyo || '',
  cursoNombre: record.expand?.curso_id?.nombre,
  nivelNombre: record.expand?.curso_id?.expand?.nivel_id?.nombre,
  cicloAno: record.expand?.ciclo_id?.ano,
  createdAt: record.created,
  updatedAt: record.updated,
});
