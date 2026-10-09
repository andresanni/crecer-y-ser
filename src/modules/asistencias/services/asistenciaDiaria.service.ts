import pb from '../../../core/pocketbase';
import { ClientResponseError } from 'pocketbase';
import {
  type AsistenciaDiaria,
  type AsistenciaDiariaRecord,
  type TipoEstadoAsistencia,
  asistenciaDiariaAdapter,
} from '../models/asistencia.model';

const COLLECTION_ASISTENCIAS = 'asistencias_diarias';

export interface CambioNovedadItem {
  inscripcionId: string;
  fecha: string;
  estado: TipoEstadoAsistencia | null;
  observacion?: string;
}

export const asistenciaDiariaService = {
  async obtenerNovedadesMes(
    inscripcionIds: string[],
    fechaDesde: string,
    fechaHasta: string
  ): Promise<AsistenciaDiaria[]> {
    if (inscripcionIds.length === 0) return [];

    const filterParts = [
      `fecha >= "${fechaDesde} 00:00:00"`,
      `fecha <= "${fechaHasta} 23:59:59"`,
    ];

    if (inscripcionIds.length === 1) {
      filterParts.push(`inscripcion_id = "${inscripcionIds[0]}"`);
    } else {
      const orFilter = inscripcionIds.map((id) => `inscripcion_id = "${id}"`).join(' || ');
      filterParts.push(`(${orFilter})`);
    }

    const records = await pb.collection(COLLECTION_ASISTENCIAS).getFullList<AsistenciaDiariaRecord>({
      filter: filterParts.join(' && '),
      sort: 'fecha',
    });

    return records.map(asistenciaDiariaAdapter);
  },

  async obtenerNovedad(inscripcionId: string, fecha: string): Promise<AsistenciaDiariaRecord | null> {
    try {
      const fechaCorta = fecha.slice(0, 10);
      const record = await pb.collection(COLLECTION_ASISTENCIAS).getFirstListItem<AsistenciaDiariaRecord>(
        `inscripcion_id = "${inscripcionId}" && fecha >= "${fechaCorta} 00:00:00" && fecha <= "${fechaCorta} 23:59:59"`
      );
      return record;
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) return null;
      throw error;
    }
  },

};
