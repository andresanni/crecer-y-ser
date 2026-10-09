import pb from '../../../core/pocketbase';
import { ClientResponseError } from 'pocketbase';
import { type EventoCalendario, type EventoCalendarioRecord, type MesCalendario, type MesCalendarioRecord,
  type TipoEventoCalendario, eventoCalendarioAdapter, mesCalendarioAdapter } from '../models/asistencia.model';
import type { VersionRegistroAsistencia } from '../models/asistenciaSnapshot.model';

export interface CalendarioSnapshot extends VersionRegistroAsistencia {
  ano: number;
  mes: MesCalendarioRecord | null;
  meses: MesCalendarioRecord[];
  eventos: EventoCalendarioRecord[];
}

export interface EventoCalendarioPayload {
  dia: number;
  tipo: TipoEventoCalendario;
  textoCeldaVertical: string;
  descripcionObservaciones: string;
}

export const calendarioMesService = {
  async obtenerConfiguracion(cicloId: string, mes: number): Promise<CalendarioSnapshot> {
    return pb.send(`/api/cys/directivo/calendario/${cicloId}/${mes}`, { method: 'GET' });
  },

  async guardarConfiguracion(cicloId: string, mes: number, version: VersionRegistroAsistencia, eventos: EventoCalendarioPayload[]): Promise<CalendarioSnapshot> {
    return pb.send(`/api/cys/directivo/calendario/${cicloId}/${mes}`, {
      method: 'PUT', body: { expectedRevision: version.revision, expectedVersionFuentes: version.versionFuentes, eventos },
    });
  },

  async obtenerMesesPorCiclo(cicloId: string): Promise<MesCalendario[]> {
    const records = await pb.collection('meses_calendario').getFullList<MesCalendarioRecord>({
      filter: `ciclo_id = "${cicloId}"`, sort: 'mes', expand: 'ciclo_id',
    });
    return records.map(mesCalendarioAdapter);
  },

  async obtenerMesPorCicloYNumero(cicloId: string, mes: number): Promise<MesCalendario | null> {
    try {
      const record = await pb.collection('meses_calendario').getFirstListItem<MesCalendarioRecord>(
        `ciclo_id = "${cicloId}" && mes = ${mes}`, { expand: 'ciclo_id' }
      );
      return mesCalendarioAdapter(record);
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) return null;
      throw error;
    }
  },

  async obtenerEventosPorMes(mesCalendarioId: string): Promise<EventoCalendario[]> {
    const records = await pb.collection('eventos_calendario').getFullList<EventoCalendarioRecord>({
      filter: `mes_calendario_id = "${mesCalendarioId}"`, sort: 'dia',
    });
    return records.map(eventoCalendarioAdapter);
  },
};
