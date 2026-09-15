import type { GradebookDataSource, GradebookStudentWrite } from '../models/gradebookDataSource.model';
import type { EstadoInstanciaCargaBoletin, InstanciaCargaBoletin } from '../models/boletin.model';
import pb from '../../../core/pocketbase';
import { boletinService } from './boletin.service';

interface StaffWorkflowStateDto {
  id: string;
  estado: EstadoInstanciaCargaBoletin;
  revision: number;
  enviadoAt: string | null;
  enviadoPor: string | null;
  cerradoAt: string | null;
  cerradoPor: string | null;
}

interface StaffWorkflowDto {
  instancia: StaffWorkflowStateDto | null;
}

interface ReturnedTeacherAccessDto {
  instancia: StaffWorkflowStateDto;
  secreto: string;
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
  await pb.send(`/api/cys/directivo/alumnos/${data.inscripcionId}`, {
    method: 'PUT',
    body: {
      periodoId: data.periodoId,
      materias: data.materias,
      cierre: data.cierre || {},
      apoyos: data.apoyos || {},
    },
    requestKey: null,
  });
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
    cerradoAt: workflow.cerradoAt || undefined,
    cerradoPor: workflow.cerradoPor || undefined,
    createdAt: '',
    updatedAt: '',
  });

export const setStaffGradebookWorkflowState = async (
  workflow: InstanciaCargaBoletin,
  estado: 'CONTROL_DIRECTIVO' | 'CERRADO',
): Promise<InstanciaCargaBoletin> => {
  const response = await pb.send<{ instancia: StaffWorkflowStateDto }>(
    `/api/cys/directivo/instancias/${workflow.id}/estado`,
    {
      method: 'PATCH',
      body: { estado },
      requestKey: null,
    },
  );
  return mapStaffWorkflow(response.instancia, workflow.cursoId, workflow.periodoId);
};

export const returnStaffGradebookToTeacher = async (
  workflow: InstanciaCargaBoletin,
): Promise<{ workflow: InstanciaCargaBoletin; secret: string }> => {
  const response = await pb.send<ReturnedTeacherAccessDto>(
    `/api/cys/directivo/instancias/${workflow.id}/devolver-docente`,
    { method: 'POST', requestKey: null },
  );
  return {
    workflow: mapStaffWorkflow(response.instancia, workflow.cursoId, workflow.periodoId),
    secret: response.secreto,
  };
};

export const staffGradebookDataSource: GradebookDataSource = {
  getCriterios: (cursoMateriaIds) => (
    boletinService.getCriteriosByCursoMateriasBatch(cursoMateriaIds)
  ),
  getProgreso: (alumnos, cursoMaterias, criteriosMap, periodoId) => (
    boletinService.getProgresoCursoPeriodo(alumnos, cursoMaterias, criteriosMap, periodoId)
  ),
  getAlumno: (alumno, periodoId) => loadStaffStudent(alumno.inscripcionId, periodoId, alumno),
  saveAlumno: async (data) => {
    await saveStaffStudent(data);
    return loadStaffStudent(data.inscripcionId, data.periodoId, data.apoyos || {});
  },
};
