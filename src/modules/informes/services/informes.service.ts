import pb from '../../../core/pocketbase';
import type {
  AlumnoInformeRow,
  CursadaPendienteInforme,
  CursoAsignadoDocenteInforme,
  EtapasInformeData,
  EvaluacionInformeData,
  InstanciaInforme,
  ItemPlantillaInforme,
  PlantillaInforme,
  RevisionInformeData,
  TipoInforme,
  TokenAccesoInforme,
  VisadoInformeDto,
} from '../models/informe.model';
import type {
  InformeDataSource,
  InformeStudentSaveResult,
  InformeStudentSnapshot,
  InformeStudentWrite,
  InformeSubmissionIncomplete,
  InformeSubmissionResult,
} from '../models/informeDataSource.model';

const TEACHER_TOKEN_HEADER = 'X-CYS-Teacher-Token';

export interface CreateEnlaceInformeInput {
  cicloId: string;
  tipoInforme: TipoInforme;
  cursoId?: string;
  cursoIds?: string[];
  materiaId?: string;
  docenteNombre: string;
  docenteApellido: string;
}

export interface IssuedEnlaceInformeDto {
  instancia: InstanciaInforme;
  instancias?: InstanciaInforme[];
  enlace: TokenAccesoInforme;
  tokenPrefijo: string;
  secreto: string;
}

export interface RecoveredEnlaceInformeDto {
  secreto: string;
  tokenPrefijo: string;
  enlace: TokenAccesoInforme;
  instancia: InstanciaInforme;
  instancias?: InstanciaInforme[];
}

export interface TeacherInformeContext {
  acceso: TokenAccesoInforme;
  instancia: InstanciaInforme;
  cursosAsignados?: CursoAsignadoDocenteInforme[];
  ciclo: {
    id: string;
    nombre: string;
    ano: number;
  };
  curso: {
    id: string;
    nombre: string;
    grado: string;
    turno: string;
  };
  materia: {
    id: string;
    nombre: string;
  } | null;
  plantilla: PlantillaInforme;
  items: ItemPlantillaInforme[];
  alumnos: AlumnoInformeRow[];
  progreso: {
    totalAlumnos: number;
    alumnosCompletos: number;
  };
  cursadasPendientes: CursadaPendienteInforme[];
}

export class InformeAccessDeniedError extends Error {}

export class InformeSubmissionIncompleteError extends Error {
  readonly detail: InformeSubmissionIncomplete;

  constructor(detail: InformeSubmissionIncomplete) {
    super('La carga del informe todavía está incompleta.');
    this.detail = detail;
  }
}

export class InformeRevisionConflictError extends Error {
  readonly currentRevision?: number;

  constructor(currentRevision?: number) {
    super('El informe fue modificado por otra sesión.');
    this.currentRevision = currentRevision;
  }
}

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('status' in error)) return 0;
  return Number((error as { status?: unknown }).status);
};

const getErrorResponse = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) return null;
  const response = (error as { response?: unknown }).response;
  return response && typeof response === 'object' ? response : null;
};

const isAccessDeniedResponse = (error: unknown) => {
  const status = getErrorStatus(error);
  return status === 401 || status === 403;
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
      throw new InformeAccessDeniedError('El enlace ya no está disponible.');
    }
    throw error;
  }
};

export const informesService = {
  getEtapas: async (cicloId: string, tipoInforme: TipoInforme): Promise<EtapasInformeData> => (
    pb.send<EtapasInformeData>(
      `/api/cys/directivo/informes/etapas/${encodeURIComponent(cicloId)}/${encodeURIComponent(tipoInforme)}`,
      { method: 'GET', requestKey: null },
    )
  ),

  createEnlace: async (input: CreateEnlaceInformeInput): Promise<IssuedEnlaceInformeDto> => (
    pb.send<IssuedEnlaceInformeDto>('/api/cys/enlaces-informes', {
      method: 'POST',
      body: input,
      requestKey: null,
    })
  ),

  rotateEnlace: async (
    tokenId: string,
    docente?: { docenteNombre?: string; docenteApellido?: string },
  ): Promise<IssuedEnlaceInformeDto> => (
    pb.send<IssuedEnlaceInformeDto>(`/api/cys/enlaces-informes/${encodeURIComponent(tokenId)}/rotar`, {
      method: 'POST',
      body: docente || {},
      requestKey: null,
    })
  ),

  recoverEnlace: async (tokenId: string): Promise<RecoveredEnlaceInformeDto> => (
    pb.send<RecoveredEnlaceInformeDto>(`/api/cys/enlaces-informes/${encodeURIComponent(tokenId)}/recuperar`, {
      method: 'POST',
      requestKey: null,
    })
  ),

  deleteEnlace: async (tokenId: string): Promise<{ instancia: InstanciaInforme; eliminado: boolean }> => (
    pb.send<{ instancia: InstanciaInforme; eliminado: boolean }>(
      `/api/cys/enlaces-informes/${encodeURIComponent(tokenId)}`,
      { method: 'DELETE', requestKey: null },
    )
  ),

  getRevision: async (instanciaId: string, signal?: AbortSignal): Promise<RevisionInformeData> => (
    pb.send<RevisionInformeData>(
      `/api/cys/directivo/informes/revision/${encodeURIComponent(instanciaId)}`,
      { method: 'GET', signal, requestKey: null },
    )
  ),

  sincronizarMatricula: async (
    instanciaId: string,
    expectedRevision: number,
  ): Promise<{ instancia: InstanciaInforme; incorporados: number }> => (
    pb.send<{ instancia: InstanciaInforme; incorporados: number }>(
      `/api/cys/directivo/informes/${encodeURIComponent(instanciaId)}/sincronizar-matricula`,
      {
        method: 'POST',
        body: { expectedRevision },
        requestKey: null,
      },
    )
  ),

  updateDocenteNombre: async (
    instanciaId: string,
    docenteNombre: string,
    docenteApellido: string,
    expectedRevision?: number,
  ): Promise<{ instancia: InstanciaInforme }> => (
    pb.send<{ instancia: InstanciaInforme }>(
      `/api/cys/directivo/informes/${encodeURIComponent(instanciaId)}/docente`,
      {
        method: 'PATCH',
        body: {
          docenteNombre,
          docenteApellido,
          expectedRevision: expectedRevision ?? -1,
        },
        requestKey: null,
      },
    )
  ),

  cambiarVisado: async (
    instanciaId: string,
    inscripcionId: string,
    expectedRevision: number,
    expectedContentRevision: number,
    visar: boolean,
  ): Promise<{ instancia: InstanciaInforme; visado: VisadoInformeDto }> => (
    pb.send<{ instancia: InstanciaInforme; visado: VisadoInformeDto }>(
      `/api/cys/directivo/informes/${encodeURIComponent(instanciaId)}/alumnos/${encodeURIComponent(inscripcionId)}/${visar ? 'visar' : 'retirar-visado'}`,
      {
        method: 'POST',
        body: { expectedRevision, expectedContentRevision },
        requestKey: null,
      },
    )
  ),

  createStaffDataSource: (instanciaId: string, totalItems: number): InformeDataSource => ({
    getAlumno: async (inscripcionId: string): Promise<InformeStudentSnapshot> => (
      pb.send<InformeStudentSnapshot>(
        `/api/cys/directivo/informes/${encodeURIComponent(instanciaId)}/alumnos/${encodeURIComponent(inscripcionId)}`,
        { method: 'GET', requestKey: null },
      )
    ),
    saveAlumno: async (data: InformeStudentWrite): Promise<InformeStudentSaveResult> => {
      try {
        const res = await pb.send<{
          instancia: InstanciaInforme;
          visado: VisadoInformeDto;
          evaluacion: EvaluacionInformeData;
        }>(
          `/api/cys/directivo/informes/${encodeURIComponent(instanciaId)}/alumnos/${encodeURIComponent(data.inscripcionId)}`,
          {
            method: 'PUT',
            body: {
              expectedRevision: data.expectedRevision,
              desempenoGeneralValor: data.desempenoGeneralValor,
              observaciones: data.observaciones,
              respuestas: data.respuestas,
            },
            requestKey: null,
          },
        );
        return {
          revision: res.instancia.revision,
          completo: true,
          itemsRespondidos: res.evaluacion.respuestas.length,
          totalItems,
          desempenoGeneralCompleto: true,
          evaluacion: res.evaluacion,
          visado: res.visado,
          instancia: res.instancia,
        };
      } catch (error) {
        if (getErrorStatus(error) === 409) {
          const response = getErrorResponse(error) as { currentRevision?: number } | null;
          throw new InformeRevisionConflictError(response?.currentRevision);
        }
        throw error;
      }
    },
  }),

  getTeacherContext: async (token: string, instanciaId?: string): Promise<TeacherInformeContext> => {
    const query = instanciaId ? `?instanciaId=${encodeURIComponent(instanciaId)}` : '';
    return teacherRequest<TeacherInformeContext>(token, `/api/cys/docente-informes/contexto${query}`);
  },

  createTeacherDataSource: (token: string, instanciaId?: string): InformeDataSource => ({
    getAlumno: async (inscripcionId: string): Promise<InformeStudentSnapshot> => (
      teacherRequest<InformeStudentSnapshot>(
        token,
        `/api/cys/docente-informes/alumnos/${encodeURIComponent(inscripcionId)}`,
      )
    ),
    saveAlumno: async (data: InformeStudentWrite): Promise<InformeStudentSaveResult> => {
      const dto = await teacherRequest<InformeStudentSnapshot>(
        token,
        `/api/cys/docente-informes/alumnos/${encodeURIComponent(data.inscripcionId)}`,
        {
          method: 'PUT',
          body: {
            desempenoGeneralValor: data.desempenoGeneralValor,
            observaciones: data.observaciones,
            respuestas: data.respuestas,
          },
        },
      );
      return {
        revision: dto.revision,
        completo: dto.completo,
        itemsRespondidos: dto.itemsRespondidos,
        totalItems: dto.totalItems,
        desempenoGeneralCompleto: dto.desempenoGeneralCompleto,
        evaluacion: dto.evaluacion,
      };
    },
    submitReport: async (): Promise<InformeSubmissionResult> => {
      try {
        return await teacherRequest<InformeSubmissionResult>(
          token,
          '/api/cys/docente-informes/enviar',
          { method: 'POST', body: { instanciaId: instanciaId || '' } },
        );
      } catch (error) {
        if (getErrorStatus(error) === 422) {
          const detail = getErrorResponse(error) as InformeSubmissionIncomplete | null;
          if (detail && Array.isArray(detail.pendientes)) {
            throw new InformeSubmissionIncompleteError(detail);
          }
        }
        throw error;
      }
    },
  }),

  buildMagicLinkUrl: (secret: string): string => {
    const origin = window.location.origin;
    return `${origin}/carga-informe#token=${encodeURIComponent(secret)}`;
  },

  readTokenFromLocation: (): string | null => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashToken = hashParams.get('token') || hashParams.get('k');
    if (hashToken) return hashToken;
    const url = new URL(window.location.href);
    const queryToken = url.searchParams.get('token') || url.searchParams.get('k');
    if (!queryToken) return null;
    url.searchParams.delete('token');
    url.searchParams.delete('k');
    url.hash = `token=${encodeURIComponent(queryToken)}`;
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    return queryToken;
  },
};
