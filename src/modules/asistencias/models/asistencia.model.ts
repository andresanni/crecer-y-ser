export type TipoEstadoAsistencia = 'A' | 'J' | 'E' | 'IT' | 'RA' | 'P';

export type TipoEventoCalendario = 'FERIADO' | 'JORNADA_EMI' | 'RECESO' | 'ASUETO';

export type MesLectivoNumero = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const MESES_ENTREGA_BOLETIN: Readonly<Record<number, number>> = Object.freeze({
  5: 1,
  7: 2,
  10: 3,
  12: 4,
});

export const NOMBRES_MESES: Readonly<Record<number, string>> = Object.freeze({
  1: 'ENERO',
  2: 'FEBRERO',
  3: 'MARZO',
  4: 'ABRIL',
  5: 'MAYO',
  6: 'JUNIO',
  7: 'JULIO',
  8: 'AGOSTO',
  9: 'SEPTIEMBRE',
  10: 'OCTUBRE',
  11: 'NOVIEMBRE',
  12: 'DICIEMBRE',
});

export interface MesCalendarioRecord {
  id: string;
  created: string;
  updated: string;
  ciclo_id: string;
  mes: number;
  ano: number;
  total_dias_habiles: number;
  dias_habiles_acumulados: number;
  periodo_boletin_id?: string;
  expand?: {
    ciclo_id?: {
      id: string;
      ano: number;
      actual: boolean;
    };
    periodo_boletin_id?: {
      id: string;
      nombre: string;
      numero_periodo: number;
    };
  };
}

export interface MesCalendario {
  id: string;
  cicloId: string;
  mes: number;
  ano: number;
  totalDiasHabiles: number;
  diasHabilesAcumulados: number;
  createdAt: string;
  updatedAt: string;
}

export const mesCalendarioAdapter = (record: MesCalendarioRecord): MesCalendario => ({
  id: record.id,
  cicloId: record.ciclo_id,
  mes: record.mes,
  ano: record.ano,
  totalDiasHabiles: record.total_dias_habiles,
  diasHabilesAcumulados: record.dias_habiles_acumulados,
  createdAt: record.created,
  updatedAt: record.updated,
});

export interface EventoCalendarioRecord {
  id: string;
  created: string;
  updated: string;
  mes_calendario_id: string;
  fecha: string;
  dia: number;
  tipo: TipoEventoCalendario;
  texto_celda_vertical?: string;
  descripcion_observaciones?: string;
}

export interface EventoCalendario {
  id: string;
  mesCalendarioId: string;
  fecha: string;
  dia: number;
  tipo: TipoEventoCalendario;
  textoCeldaVertical: string;
  descripcionObservaciones: string;
  createdAt: string;
  updatedAt: string;
}

export const eventoCalendarioAdapter = (record: EventoCalendarioRecord): EventoCalendario => ({
  id: record.id,
  mesCalendarioId: record.mes_calendario_id,
  fecha: record.fecha?.slice(0, 10) || '',
  dia: record.dia,
  tipo: record.tipo,
  textoCeldaVertical: record.texto_celda_vertical || '',
  descripcionObservaciones: record.descripcion_observaciones || '',
  createdAt: record.created,
  updatedAt: record.updated,
});

export interface AsistenciaDiariaRecord {
  id: string;
  created: string;
  updated: string;
  inscripcion_id: string;
  fecha: string;
  estado: TipoEstadoAsistencia;
  observacion?: string;
}

export interface AsistenciaDiaria {
  id: string;
  inscripcionId: string;
  fecha: string;
  estado: TipoEstadoAsistencia;
  observacion: string;
  createdAt: string;
  updatedAt: string;
}

export const asistenciaDiariaAdapter = (record: AsistenciaDiariaRecord): AsistenciaDiaria => ({
  id: record.id,
  inscripcionId: record.inscripcion_id,
  fecha: record.fecha?.slice(0, 10) || '',
  estado: record.estado,
  observacion: record.observacion || '',
  createdAt: record.created,
  updatedAt: record.updated,
});

export interface RegistroAsistenciaCursoRecord {
  id: string;
  created: string;
  updated: string;
  curso_id: string;
  mes_calendario_id: string;
  observaciones_adicionales?: string;
}

export interface RegistroAsistenciaCurso {
  id: string;
  cursoId: string;
  mesCalendarioId: string;
  observacionesAdicionales: string;
  createdAt: string;
  updatedAt: string;
}

export const registroAsistenciaCursoAdapter = (
  record: RegistroAsistenciaCursoRecord
): RegistroAsistenciaCurso => ({
  id: record.id,
  cursoId: record.curso_id,
  mesCalendarioId: record.mes_calendario_id,
  observacionesAdicionales: record.observaciones_adicionales || '',
  createdAt: record.created,
  updatedAt: record.updated,
});
