import pb from '../../../core/pocketbase';
import type { CambioEscuelaItem } from '../models/inscripcion.model';

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

export interface StudentAdministrativeData {
  escuelaInicial: string;
  fechaIngresoInicial: string;
  fechaEgresoInicial: string;
  cambiosEscuela: CambioEscuelaItem[];
  cambioDomicilio: string;
}

export interface StudentEvaluationsSnapshot {
  inscripcionId: string;
  alumnoId: string;
  nombreCompleto: string;
  curso: string;
  ciclo: number;
  esInicial: boolean;
  estadoAdministrativo: string;
  esAltaTardia: boolean;
  esBaja: boolean;
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
  datosAdministrativos: StudentAdministrativeData;
}

export interface SaveStudentEvaluationsInput {
  esAltaTardia?: boolean;
  boletines?: {
    b1: boolean;
    b2: boolean;
    b3: boolean;
    b4: boolean;
  };
  informes?: Array<{
    tipoInforme: TipoInformeEvaluacion;
    evaluable: boolean;
  }>;
  registrarBaja?: boolean;
  fechaEgreso?: string;
  datosAdministrativos?: Partial<StudentAdministrativeData>;
}

export const cursadaService = {
  getEvaluations: (id: string) =>
    pb.send<StudentEvaluationsSnapshot>(`/api/cys/directivo/inscripciones/${id}/evaluaciones`, { requestKey: null }),
  saveEvaluations: (snapshot: StudentEvaluationsSnapshot, values: SaveStudentEvaluationsInput) =>
    pb.send<StudentEvaluationsSnapshot>(`/api/cys/directivo/inscripciones/${snapshot.inscripcionId}/evaluaciones`, {
      method: 'PUT',
      requestKey: null,
      body: {
        expectedRevision: snapshot.cursada.revision,
        expectedUpdated: snapshot.updated,
        ...(typeof values.esAltaTardia === 'boolean' ? { esAltaTardia: values.esAltaTardia } : {}),
        ...(values.boletines ? { boletines: values.boletines } : {}),
        ...(values.informes ? { informes: values.informes } : {}),
        ...(values.registrarBaja ? { registrarBaja: true } : {}),
        ...(typeof values.fechaEgreso === 'string' ? { fechaEgreso: values.fechaEgreso } : {}),
        ...(values.datosAdministrativos ? { datosAdministrativos: values.datosAdministrativos } : {}),
      },
    }),
};
