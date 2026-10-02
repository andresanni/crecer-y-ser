import pb from '../../../core/pocketbase';

export interface CursadaSnapshot {
  inscripcionId: string;
  nombreCompleto: string;
  curso: string;
  ciclo: number;
  cursada: { estado: 'PENDIENTE' | 'CONFIRMADA' | 'SIN_CURSADA'; desde: number; hasta: number; revision: number };
  updated: string;
  estadoAdministrativo: string;
  fechaEgreso: string;
  bimestresConDatos: number[];
}

export const cursadaService = {
  get: (id: string) => pb.send<CursadaSnapshot>(`/api/cys/directivo/inscripciones/${id}/cursada`, { requestKey: null }),
  save: (snapshot: CursadaSnapshot, values: { desde: number; hasta: number; sinCursada: boolean; registrarBaja: boolean; fechaEgreso: string }) =>
    pb.send<CursadaSnapshot>(`/api/cys/directivo/inscripciones/${snapshot.inscripcionId}/cursada`, {
      method: 'PUT', requestKey: null,
      body: { ...values, expectedRevision: snapshot.cursada.revision, expectedUpdated: snapshot.updated },
    }),
};
