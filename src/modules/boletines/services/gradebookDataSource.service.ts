import type { GradebookDataSource, GradebookStudentWrite } from '../models/gradebookDataSource.model';
import type { EstadoInstanciaCargaBoletin, InstanciaCargaBoletin } from '../models/boletin.model';
import pb from '../../../core/pocketbase';
import { ClientResponseError } from 'pocketbase';
import { boletinService } from './boletin.service';

interface StaffWorkflowStateDto {
  id: string;
  estado: EstadoInstanciaCargaBoletin;
  revision: number;
  enviadoAt: string | null;
  enviadoPor: string | null;
}

interface StaffWorkflowDto {
  instancia: StaffWorkflowStateDto | null;
}

interface StaffSaveDto {
  instancia: StaffWorkflowStateDto;
}

export interface StaffReviewBulletin {
  inscripcionId: string;
  nombreCompleto: string;
  numeroOrden: number | null;
  estado: 'PENDIENTE_REVISION' | 'VISADO';
  revisionContenido: number;
  revisionVisada: number | null;
  visadoAt: string | null;
  visadoPor: string | null;
}

export interface StaffReviewDto {
  instancia: StaffWorkflowStateDto;
  etapa: 'REVISION_DIRECTIVA' | 'LISTO_PARA_PDF';
  totalBoletines: number;
  visados: number;
  alumnosSinIncorporar: number;
  boletines: StaffReviewBulletin[];
}

interface StaffStudentDto {
  revision: number;
  evaluaciones: Array<{
    id: string;
    cursoMateriaId: string;
    ppi: boolean;
    calificacionGeneralId: string | null;
    criterios: Array<{ criterioId: string; valorEscalaId: string }>;
  }>;
  cierre: {
    id: string;
    asistencias: number;
    inasistencias: number;
    llegadasTarde: number;
    observaciones: string;
  } | null;
  apoyos: {
    promocionoConAcompanamiento: string;
    poseeApoyos: string;
    cualesApoyos: string;
  };
}

export class GradebookRevisionConflictError extends Error {
  readonly currentRevision?: number;

  constructor(currentRevision?: number) {
    super('La planilla cambió desde la última lectura.');
    this.name = 'GradebookRevisionConflictError';
    this.currentRevision = currentRevision;
  }
}

export class GradebookSaveOutcomeUnknownError extends Error {
  constructor() {
    super('No se pudo confirmar el resultado del guardado.');
    this.name = 'GradebookSaveOutcomeUnknownError';
  }
}

const loadStaffStudent = async (
  inscripcionId: string,
  periodoId: string,
) => {
  const dto = await pb.send<StaffStudentDto>(
    `/api/cys/directivo/alumnos/${inscripcionId}?periodoId=${encodeURIComponent(periodoId)}`,
    { requestKey: null },
  );
  const materias = Object.fromEntries(dto.evaluaciones.map((evaluacion) => [
    evaluacion.cursoMateriaId,
    {
      evaluacionMateriaId: evaluacion.id,
      ppi: evaluacion.ppi,
      calificacionGeneralId: evaluacion.calificacionGeneralId,
      criteriosValores: Object.fromEntries(evaluacion.criterios.map((criterio) => [
        criterio.criterioId,
        criterio.valorEscalaId,
      ])),
    },
  ]));
  return {
    revision: dto.revision,
    materias,
    cierre: dto.cierre ? {
      id: dto.cierre.id,
      inscripcionId,
      periodoId,
      asistencias: dto.cierre.asistencias,
      inasistencias: dto.cierre.inasistencias,
      llegadasTarde: dto.cierre.llegadasTarde,
      observaciones: dto.cierre.observaciones,
      createdAt: '',
      updatedAt: '',
    } : null,
    apoyos: {
      promocionoConAcompanamiento: dto.apoyos.promocionoConAcompanamiento || '-',
      poseeApoyos: dto.apoyos.poseeApoyos || '-',
      cualesApoyos: dto.apoyos.cualesApoyos || '',
    },
  };
};

const saveStaffStudent = async (data: GradebookStudentWrite) => {
  try {
    return await pb.send<StaffSaveDto>(`/api/cys/directivo/alumnos/${data.inscripcionId}`, {
      method: 'PUT',
      body: {
        periodoId: data.periodoId,
        expectedRevision: data.expectedRevision,
        materias: data.materias,
        cierre: data.cierre || {},
        apoyos: data.apoyos || {},
      },
      requestKey: null,
    });
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 409) {
      const currentRevision = Number(
        error.response?.currentRevision ?? error.response?.data?.currentRevision,
      );
      throw new GradebookRevisionConflictError(
        Number.isFinite(currentRevision) ? currentRevision : undefined,
      );
    }
    if (
      !(error instanceof ClientResponseError)
      || error.status === 0
      || error.status === 408
      || error.status >= 500
    ) {
      throw new GradebookSaveOutcomeUnknownError();
    }
    throw error;
  }
};

export const getStaffGradebookWorkflow = async (
  cursoId: string,
  periodoId: string,
): Promise<InstanciaCargaBoletin | null> => {
  const response = await pb.send<StaffWorkflowDto>(
    `/api/cys/directivo/instancias/${cursoId}/${periodoId}`,
    { requestKey: null },
  );
  if (!response.instancia) return null;
  return mapStaffWorkflow(response.instancia, cursoId, periodoId);
};

export const getStaffGradebookReview = async (
  cursoId: string,
  periodoId: string,
): Promise<StaffReviewDto> => pb.send<StaffReviewDto>(
  `/api/cys/directivo/revision/${cursoId}/${periodoId}`,
  { requestKey: null },
);

export const synchronizeStaffReviewEnrollments = async (
  cursoId: string,
  periodoId: string,
  expectedRevision: number,
): Promise<StaffSaveDto & { incorporados: number }> => pb.send(
  `/api/cys/directivo/revision/${cursoId}/${periodoId}/sincronizar-matricula`,
  {
    method: 'POST',
    body: { expectedRevision },
    requestKey: null,
  },
);

export const changeStaffBulletinApproval = async (
  inscripcionId: string,
  periodoId: string,
  expectedRevision: number,
  expectedContentRevision: number,
  approve: boolean,
): Promise<StaffSaveDto> => pb.send<StaffSaveDto>(
  `/api/cys/directivo/boletines/${inscripcionId}/${approve ? 'visar' : 'retirar-visado'}`,
  {
    method: 'POST',
    body: { periodoId, expectedRevision, expectedContentRevision },
    requestKey: null,
  },
);

const mapStaffWorkflow = (
  workflow: StaffWorkflowStateDto,
  cursoId: string,
  periodoId: string,
): InstanciaCargaBoletin => ({
    id: workflow.id,
    cursoId,
    periodoId,
    estado: workflow.estado,
    revision: workflow.revision,
    enviadoAt: workflow.enviadoAt || undefined,
    enviadoPor: workflow.enviadoPor || undefined,
    createdAt: '',
    updatedAt: '',
  });

export const staffGradebookDataSource: GradebookDataSource = {
  getCriterios: (cursoMateriaIds) => (
    boletinService.getCriteriosByCursoMateriasBatch(cursoMateriaIds)
  ),
  getProgreso: (alumnos, cursoMaterias, criteriosMap, periodoId) => (
    boletinService.getProgresoCursoPeriodo(alumnos, cursoMaterias, criteriosMap, periodoId)
  ),
  getAlumno: (alumno, periodoId) => loadStaffStudent(alumno.inscripcionId, periodoId),
  saveAlumno: async (data) => {
    const response = await saveStaffStudent(data);
    return {
      revision: response.instancia.revision,
    };
  },
};
