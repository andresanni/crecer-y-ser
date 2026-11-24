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
  escuelaInicial: string;
  fechaIngresoInicial: string;
  fechaEgresoInicial: string;
  cambiosEscuela: Array<{ fecha: string; causa: string; escuelaDestino: string }>;
  cambioDomicilio: string;
}

export type TipoInformeEvaluacion =
  | 'PRIMER_BIMESTRE'
  | 'PRIMER_CUATRIMESTRE'
  | 'CICLO_FINAL';

export interface StudentBoletinesParticipation {
  b1: boolean;
  b2: boolean;
  b3: boolean;
  b4: boolean;
  bimestresBloqueados: number[];
}

export interface StudentReportParticipationItem {
  tipoInforme: TipoInformeEvaluacion;
  evaluable: boolean;
  evaluablePorDefecto: boolean;
  esAjusteManual: boolean;
  bloqueadoPorEntrega: boolean;
  materiasEntregadas: string[];
  tieneBorrador: boolean;
}

export interface StudentEvaluationsSnapshot {
  inscripcionId: string;
  alumnoId: string;
  nombreCompleto: string;
  curso: string;
  ciclo: number;
  esInicial: boolean;
  estadoAdministrativo: string;
  fechaIngreso: string;
  fechaEgreso: string;
  cursada: {
    estado: 'PENDIENTE' | 'CONFIRMADA' | 'SIN_CURSADA';
    desde: number;
    hasta: number;
    revision: number;
  };
  updated: string;
  boletines: StudentBoletinesParticipation | null;
  informes: StudentReportParticipationItem[];
}

export interface SaveStudentEvaluationsInput {
  boletines?: {
    b1: boolean;
    b2: boolean;
    b3: boolean;
    b4: boolean;
  };
  informes: Array<{
    tipoInforme: TipoInformeEvaluacion;
    evaluable: boolean;
  }>;
}

export const cursadaService = {
  get: (id: string) => pb.send<CursadaSnapshot>(`/api/cys/directivo/inscripciones/${id}/cursada`, { requestKey: null }),
  save: (snapshot: CursadaSnapshot, values: {
    desde: number;
    hasta: number;
    sinCursada: boolean;
    registrarBaja: boolean;
    fechaEgreso: string;
    escuelaInicial?: string;
    fechaIngresoInicial?: string;
    fechaEgresoInicial?: string;
    cambiosEscuela?: Array<{ fecha: string; causa: string; escuelaDestino: string }>;
    cambioDomicilio?: string;
  }) =>
    pb.send<CursadaSnapshot>(`/api/cys/directivo/inscripciones/${snapshot.inscripcionId}/cursada`, {
      method: 'PUT', requestKey: null,
      body: { ...values, expectedRevision: snapshot.cursada.revision, expectedUpdated: snapshot.updated },
    }),
  getEvaluations: (id: string) =>
    pb.send<StudentEvaluationsSnapshot>(`/api/cys/directivo/inscripciones/${id}/evaluaciones`, { requestKey: null }),
  saveEvaluations: (snapshot: StudentEvaluationsSnapshot, values: SaveStudentEvaluationsInput) =>
    pb.send<StudentEvaluationsSnapshot>(`/api/cys/directivo/inscripciones/${snapshot.inscripcionId}/evaluaciones`, {
      method: 'PUT',
      requestKey: null,
      body: {
        expectedRevision: snapshot.cursada.revision,
        expectedUpdated: snapshot.updated,
        ...(values.boletines ? { boletines: values.boletines } : {}),
        informes: values.informes,
      },
    }),
};
