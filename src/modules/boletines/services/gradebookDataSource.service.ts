import type { GradebookDataSource, GradebookStudentWrite } from '../models/gradebookDataSource.model';
import { boletinService } from './boletin.service';

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
  for (const materia of data.materias) {
    await boletinService.saveEvaluacionMateriaCompleta({
      inscripcionId: data.inscripcionId,
      periodoId: data.periodoId,
      ...materia,
    });
  }

  if (data.cierre) {
    await boletinService.saveCierrePeriodoAlumno({
      inscripcionId: data.inscripcionId,
      periodoId: data.periodoId,
      ...data.cierre,
    });
  }

  if (data.apoyos) {
    await boletinService.updateInscripcionApoyos(data.inscripcionId, data.apoyos);
  }
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
