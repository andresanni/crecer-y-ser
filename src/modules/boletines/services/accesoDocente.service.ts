import pb from '../../../core/pocketbase';
import type { Curso, TurnoCurso } from '../../inscripciones/models/inscripcion.model';
import {
  esMateriaConducta,
  tokenAccesoDocenteAdapter,
  type AlumnoInscriptoRow,
  type CriterioEvaluacion,
  type CursoMateria,
  type EstadoInstanciaCargaBoletin,
  type InstanciaCargaBoletin,
  type Periodo,
  type ProgresoAlumnoDetalle,
  type TokenAccesoDocente,
  type TokenAccesoDocenteRecord,
  type ValorEscala,
} from '../models/boletin.model';
import type {
  GradebookDataSource,
  GradebookSubmissionIncomplete,
  GradebookSubmissionResult,
  GradebookStudentSnapshot,
  GradebookStudentWrite,
} from '../models/gradebookDataSource.model';

const COLLECTION_TOKENS = 'tokens_acceso_docente';
const TEACHER_TOKEN_HEADER = 'X-CYS-Teacher-Token';

export interface CreateAccesoDocenteInput {
  cursoId: string;
  periodoId: string;
  docenteNombre: string;
}

interface TeacherAccessDto {
  id: string;
  cursoId: string;
  periodoId: string;
  docenteNombre: string;
  activo: boolean;
}

interface TeacherContextDto {
  acceso: TeacherAccessDto;
  instancia: {
    id: string;
    estado: EstadoInstanciaCargaBoletin;
    revision: number;
    enviadoAt: string | null;
  };
  curso: { id: string; nombre: string; turno: string; escalaId: string };
  periodo: { id: string; nombre: string; numeroPeriodo: number };
  materias: Array<{
    id: string;
    cursoId: string;
    materiaId: string;
    materiaNombre: string;
    ordenVisual: number;
  }>;
  criterios: Record<string, Array<{
    id: string;
    cursoMateriaId: string;
    nombre: string;
    ordenVisual: number;
  }>>;
  valoresEscala: Array<{
    id: string;
    escalaId: string;
    etiqueta: string;
    pesoNumerico: number;
    ordenVisual: number;
  }>;
  alumnos: Array<{
    inscripcionId: string;
    numeroOrden: number | null;
    apellidos: string;
    nombres: string;
    nombreCompleto: string;
  }>;
}

interface TeacherStudentDto {
  evaluaciones: Array<{
    id: string;
    cursoMateriaId: string;
    ppi: boolean;
    calificacionGeneralId: string | null;
    criterios: Array<{ criterioId: string; valorEscalaId: string }>;
  }>;
  cierre: null | {
    id: string;
    asistencias: number;
    inasistencias: number;
    llegadasTarde: number;
    observaciones: string;
  };
  apoyos: null | {
    promocionoConAcompanamiento: string;
    poseeApoyos: string;
    cualesApoyos: string;
  };
}

interface IssuedTeacherAccessDto {
  enlace: TeacherAccessDto;
  tokenPrefijo: string;
  secreto: string;
}

interface TeacherSubmissionDto {
  instancia: {
    estado: 'CONTROL_DIRECTIVO';
    revision: number;
    enviadoAt: string;
  };
  totalAlumnos: number;
  totalMaterias: number;
}

export interface TeacherGradebookContext {
  acceso: TokenAccesoDocente;
  instancia: InstanciaCargaBoletin;
  curso: Curso;
  periodo: Periodo;
  materias: CursoMateria[];
  criterios: Record<string, CriterioEvaluacion[]>;
  valoresEscala: ValorEscala[];
  alumnos: AlumnoInscriptoRow[];
}

export class TeacherAccessDeniedError extends Error {}

export class TeacherSubmissionIncompleteError extends Error {
  readonly detail: GradebookSubmissionIncomplete;

  constructor(detail: GradebookSubmissionIncomplete) {
    super('La carga del bimestre todavía está incompleta.');
    this.detail = detail;
  }
}

const isAccessDeniedResponse = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('status' in error)) return false;
  const status = Number((error as { status?: unknown }).status);
  return status === 401 || status === 403;
};

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('status' in error)) return 0;
  return Number((error as { status?: unknown }).status);
};

const getErrorResponse = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) return null;
  const response = (error as { response?: unknown }).response;
  return response && typeof response === 'object' ? response : null;
};

const teacherRequest = async <T>(
  token: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> => {
  try {
    return await pb.send<T>(path, {
      ...options,
      headers: { [TEACHER_TOKEN_HEADER]: token },
      requestKey: null,
    });
  } catch (error) {
    if (isAccessDeniedResponse(error)) {
      throw new TeacherAccessDeniedError('El enlace ya no está vigente.');
    }
    throw error;
  }
};

const mapStudentDto = (
  dto: TeacherStudentDto,
  inscripcionId: string,
  periodoId: string,
): GradebookStudentSnapshot => {
  const materias: GradebookStudentSnapshot['materias'] = {};
  for (const evaluacion of dto.evaluaciones) {
    materias[evaluacion.cursoMateriaId] = {
      evaluacionMateriaId: evaluacion.id,
      ppi: evaluacion.ppi,
      calificacionGeneralId: evaluacion.calificacionGeneralId,
      criteriosValores: Object.fromEntries(
        evaluacion.criterios.map((criterio) => [criterio.criterioId, criterio.valorEscalaId]),
      ),
    };
  }
  return {
    materias,
    cierre: dto.cierre ? {
      ...dto.cierre,
      inscripcionId,
      periodoId,
      createdAt: '',
      updatedAt: '',
    } : null,
    apoyos: dto.apoyos,
  };
};

const buildProgress = (
  alumnos: AlumnoInscriptoRow[],
  cursoMaterias: CursoMateria[],
  criteriosMap: Record<string, CriterioEvaluacion[]>,
  snapshots: Map<string, GradebookStudentSnapshot>,
) => {
  const alumnosProgreso: Record<string, ProgresoAlumnoDetalle> = {};
  let completadosCount = 0;
  let enProgresoCount = 0;
  let sinIniciarCount = 0;
  let sumaPorcentajes = 0;
  for (const alumno of alumnos) {
    const snapshot = snapshots.get(alumno.inscripcionId);
    let materiasCompletadas = 0;
    const materiasDetalle = cursoMaterias.map((cursoMateria) => {
      const evaluacion = snapshot?.materias[cursoMateria.id];
      const criteriosTotal = criteriosMap[cursoMateria.id]?.length || 0;
      const criteriosEvaluados = Object.keys(evaluacion?.criteriosValores || {}).length;
      const criteriosCompletos = criteriosTotal === 0 || criteriosEvaluados >= criteriosTotal;
      const completada = esMateriaConducta(cursoMateria.materiaNombre)
        ? criteriosCompletos
        : Boolean(evaluacion?.calificacionGeneralId) && criteriosCompletos;
      if (completada) materiasCompletadas += 1;
      return {
        cursoMateriaId: cursoMateria.id,
        materiaNombre: cursoMateria.materiaNombre,
        completada,
        ppi: evaluacion?.ppi || false,
        calificacionGeneralId: evaluacion?.calificacionGeneralId || null,
        criteriosEvaluados,
        criteriosTotal,
      };
    });
    const tieneAsistencia = Boolean(snapshot?.cierre);
    const porcentaje = cursoMaterias.length > 0
      ? Math.round((materiasCompletadas / cursoMaterias.length) * 100)
      : 0;
    const estado = materiasCompletadas === cursoMaterias.length && tieneAsistencia
      ? 'COMPLETO'
      : materiasCompletadas > 0 || tieneAsistencia
        ? 'EN_PROGRESO'
        : 'SIN_INICIAR';
    if (estado === 'COMPLETO') completadosCount += 1;
    if (estado === 'EN_PROGRESO') enProgresoCount += 1;
    if (estado === 'SIN_INICIAR') sinIniciarCount += 1;
    sumaPorcentajes += porcentaje;
    alumnosProgreso[alumno.inscripcionId] = {
      inscripcionId: alumno.inscripcionId,
      alumnoId: alumno.alumnoId,
      numeroOrden: alumno.numeroOrden,
      nombreCompleto: alumno.nombreCompleto,
      totalMaterias: cursoMaterias.length,
      materiasCompletadas,
      tieneAsistencia,
      porcentaje,
      estado,
      materiasDetalle,
    };
  }
  return {
    alumnosProgreso,
    resumen: {
      totalAlumnos: alumnos.length,
      completadosCount,
      enProgresoCount,
      sinIniciarCount,
      porcentajeGlobal: alumnos.length > 0 ? Math.round(sumaPorcentajes / alumnos.length) : 0,
    },
  };
};

const mapIssuedAccess = (response: IssuedTeacherAccessDto): TokenAccesoDocente => ({
  id: response.enlace.id,
  tokenPrefijo: response.tokenPrefijo,
  secreto: response.secreto,
  cursoId: response.enlace.cursoId,
  periodoId: response.enlace.periodoId,
  docenteNombre: response.enlace.docenteNombre,
  activo: response.enlace.activo,
  createdAt: '',
  updatedAt: '',
});

export const accesoDocenteService = {
  isUsable: (token: TokenAccesoDocente): boolean => token.activo,

  list: async (cursoId?: string, periodoId?: string): Promise<TokenAccesoDocente[]> => {
    const conditions: string[] = [];
    if (cursoId) conditions.push(pb.filter('curso_id = {:cursoId}', { cursoId }));
    if (periodoId) conditions.push(pb.filter('periodo_id = {:periodoId}', { periodoId }));
    const records = await pb.collection(COLLECTION_TOKENS).getFullList<TokenAccesoDocenteRecord>({
      filter: conditions.length > 0 ? conditions.join(' && ') : undefined,
      expand: 'curso_id,periodo_id',
      sort: '-created',
    });
    return records.map(tokenAccesoDocenteAdapter);
  },

  create: async (data: CreateAccesoDocenteInput): Promise<TokenAccesoDocente> => {
    const response = await pb.send<IssuedTeacherAccessDto>('/api/cys/enlaces-docentes', {
      method: 'POST',
      body: data,
      requestKey: null,
    });
    return mapIssuedAccess(response);
  },

  rotate: async (tokenId: string): Promise<TokenAccesoDocente> => {
    const response = await pb.send<IssuedTeacherAccessDto>(`/api/cys/enlaces-docentes/${tokenId}/rotar`, {
      method: 'POST',
      requestKey: null,
    });
    return mapIssuedAccess(response);
  },

  setActive: async (tokenId: string, active: boolean): Promise<void> => {
    await pb.send<TeacherAccessDto>(
      `/api/cys/enlaces-docentes/${tokenId}/estado`,
      {
        method: 'PATCH',
        body: { activo: active },
        requestKey: null,
      },
    );
  },

  delete: async (tokenId: string): Promise<void> => {
    await pb.collection(COLLECTION_TOKENS).delete(tokenId);
  },

  getContext: async (token: string): Promise<TeacherGradebookContext> => {
    const dto = await teacherRequest<TeacherContextDto>(token, '/api/cys/docente/contexto');
    const acceso: TokenAccesoDocente = {
      id: dto.acceso.id,
      tokenPrefijo: token.slice(0, 12),
      cursoId: dto.acceso.cursoId,
      periodoId: dto.acceso.periodoId,
      docenteNombre: dto.acceso.docenteNombre,
      activo: dto.acceso.activo,
      cursoNombre: dto.curso.nombre,
      periodoNombre: dto.periodo.nombre,
      numeroPeriodo: dto.periodo.numeroPeriodo,
      createdAt: '',
      updatedAt: '',
    };
    return {
      acceso,
      instancia: {
        id: dto.instancia.id,
        cursoId: dto.acceso.cursoId,
        periodoId: dto.acceso.periodoId,
        estado: dto.instancia.estado,
        revision: dto.instancia.revision,
        enviadoAt: dto.instancia.enviadoAt || undefined,
        createdAt: '',
        updatedAt: '',
      },
      curso: {
        id: dto.curso.id,
        nombre: dto.curso.nombre,
        turno: dto.curso.turno as TurnoCurso,
        nivelId: '',
        nivelNombre: '',
        escalaId: dto.curso.escalaId,
        createdAt: '',
        updatedAt: '',
      },
      periodo: {
        id: dto.periodo.id,
        cicloId: '',
        nombre: dto.periodo.nombre,
        numeroPeriodo: dto.periodo.numeroPeriodo,
        createdAt: '',
        updatedAt: '',
      },
      materias: dto.materias.map((materia) => ({ ...materia, createdAt: '', updatedAt: '' })),
      criterios: Object.fromEntries(Object.entries(dto.criterios).map(([key, criterios]) => [
        key,
        criterios.map((criterio) => ({ ...criterio, createdAt: '', updatedAt: '' })),
      ])),
      valoresEscala: dto.valoresEscala.map((valor) => ({ ...valor, createdAt: '', updatedAt: '' })),
      alumnos: dto.alumnos.map((alumno) => ({
        ...alumno,
        alumnoId: '',
        numeroLegajo: '',
        dni: '',
        estado: 'Regular',
      })),
    };
  },

  createDataSource: (token: string, initialContext: TeacherGradebookContext): GradebookDataSource => {
    const snapshots = new Map<string, GradebookStudentSnapshot>();
    const getSnapshot = async (inscripcionId: string, periodoId: string, refresh = false) => {
      if (!refresh && snapshots.has(inscripcionId)) return snapshots.get(inscripcionId)!;
      const dto = await teacherRequest<TeacherStudentDto>(token, `/api/cys/docente/alumnos/${inscripcionId}`);
      const snapshot = mapStudentDto(dto, inscripcionId, periodoId);
      snapshots.set(inscripcionId, snapshot);
      return snapshot;
    };
    return {
      getCriterios: async (ids) => Object.fromEntries(
        ids.map((id) => [id, initialContext.criterios[id] || []]),
      ),
      getProgreso: async (alumnos, cursoMaterias, criteriosMap, periodoId) => {
        await Promise.all(alumnos.map((alumno) => getSnapshot(alumno.inscripcionId, periodoId)));
        return buildProgress(alumnos, cursoMaterias, criteriosMap, snapshots);
      },
      getAlumno: (alumno, periodoId) => getSnapshot(alumno.inscripcionId, periodoId),
      saveAlumno: async (data: GradebookStudentWrite) => {
        const dto = await teacherRequest<TeacherStudentDto>(
          token,
          `/api/cys/docente/alumnos/${data.inscripcionId}`,
          {
            method: 'PUT',
            body: {
              materias: data.materias,
              cierre: data.cierre || {},
              apoyos: data.apoyos || {},
            },
          },
        );
        const snapshot = mapStudentDto(dto, data.inscripcionId, data.periodoId);
        snapshots.set(data.inscripcionId, snapshot);
        return snapshot;
      },
      submitPeriod: async (): Promise<GradebookSubmissionResult> => {
        try {
          const dto = await teacherRequest<TeacherSubmissionDto>(
            token,
            '/api/cys/docente/enviar',
            { method: 'POST' },
          );
          return {
            estado: dto.instancia.estado,
            revision: dto.instancia.revision,
            enviadoAt: dto.instancia.enviadoAt,
            totalAlumnos: dto.totalAlumnos,
            totalMaterias: dto.totalMaterias,
          };
        } catch (error) {
          if (getErrorStatus(error) === 422) {
            const detail = getErrorResponse(error) as GradebookSubmissionIncomplete | null;
            if (detail && Array.isArray(detail.pendientes)) {
              throw new TeacherSubmissionIncompleteError(detail);
            }
          }
          throw error;
        }
      },
    };
  },

  readTokenFromLocation: (): string | null => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashToken = hashParams.get('token');
    if (hashToken) return hashToken;
    const url = new URL(window.location.href);
    const queryToken = url.searchParams.get('token');
    if (!queryToken) return null;
    url.searchParams.delete('token');
    url.hash = `token=${encodeURIComponent(queryToken)}`;
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    return queryToken;
  },
};
