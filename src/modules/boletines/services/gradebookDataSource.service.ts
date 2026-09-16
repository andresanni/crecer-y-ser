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

export class GradebookRevisionConflictError extends Error {
  readonly currentRevision?: number;

  constructor(currentRevision?: number) {
    super('La planilla cambió desde la última lectura.');
    this.name = 'GradebookRevisionConflictError';
    this.currentRevision = currentRevision;
  }
}

const loadStaffStudent = async (
  inscripcionId: string,
  periodoId: string,
  apoyos: {
    promocionoConAcompanamiento?: string;
    poseeApoyos?: string;
    cualesApoyos?: string;
  },
) => {
  const [materias, cierre] = await Promise.all([
    boletinService.getEvaluacionesByInscripcionAndPeriodo(inscripcionId, periodoId),
    boletinService.getCierrePeriodoAlumno(inscripcionId, periodoId),
  ]);
  return {
    materias,
    cierre,
    apoyos: {
      promocionoConAcompanamiento: apoyos.promocionoConAcompanamiento || '-',
      poseeApoyos: apoyos.poseeApoyos || '-',
      cualesApoyos: apoyos.cualesApoyos || '',
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
  getAlumno: (alumno, periodoId) => loadStaffStudent(alumno.inscripcionId, periodoId, alumno),
  saveAlumno: async (data) => {
    const response = await saveStaffStudent(data);
    return {
      revision: response.instancia.revision,
    };
  },
};
