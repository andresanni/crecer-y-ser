import pb from '../../../core/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type {
  AsistenciaB4SubmitIncomplete,
  AsistenciaB4WriteRow,
  CursoAsistenciaB4Etapa,
  CursoAsistenciaB4Snapshot,
  IssuedAsistenciaB4Link,
} from '../models/asistenciasB4.model';

const ATTENDANCE_TOKEN_HEADER = 'X-CYS-Attendance-Token';
const COLLECTION_TOKENS = 'tokens_acceso_asistencia_b4';

export class AttendanceLinkDeniedError extends Error {}

export class AttendanceRevisionConflictError extends Error {
  readonly currentRevision?: number;

  constructor(currentRevision?: number) {
    super('Las asistencias fueron modificadas por otra sesión.');
    this.name = 'AttendanceRevisionConflictError';
    this.currentRevision = currentRevision;
  }
}

export class AttendanceSubmitIncompleteError extends Error {
  readonly detail: AsistenciaB4SubmitIncomplete;

  constructor(detail: AsistenciaB4SubmitIncomplete) {
    super('Todavía faltan alumnos por completar.');
    this.name = 'AttendanceSubmitIncompleteError';
    this.detail = detail;
  }
}

const getErrorStatus = (error: unknown): number => {
  if (!error || typeof error !== 'object' || !('status' in error)) return 0;
  return Number((error as { status?: unknown }).status);
};

const teacherRequest = async <T>(
  token: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> => {
  try {
    return await pb.send<T>(path, {
      ...options,
      headers: { [ATTENDANCE_TOKEN_HEADER]: token },
      requestKey: null,
    });
  } catch (error) {
    const status = getErrorStatus(error);
    if (status === 401 || status === 403) {
      throw new AttendanceLinkDeniedError('El enlace ya no está disponible.');
    }
    throw error;
  }
};

export const asistenciasB4Service = {
  buildPublicUrl: (secret: string): string => (
    `${window.location.origin}/carga-asistencias#token=${encodeURIComponent(secret)}`
  ),

  readTokenFromLocation: (): string | null => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashToken = hashParams.get('token')?.trim();
    if (hashToken) return hashToken;
    const queryToken = new URLSearchParams(window.location.search).get('token')?.trim();
    return queryToken || null;
  },

  getStages: async (periodoId: string): Promise<CursoAsistenciaB4Etapa[]> => {
    const res = await pb.send<{ periodoId: string; cursos: CursoAsistenciaB4Etapa[] }>(
      `/api/cys/directivo/asistencias-b4/etapas/${encodeURIComponent(periodoId)}`,
      { requestKey: null },
    );
    return res.cursos || [];
  },

  issueLink: async (data: {
    cursoId: string;
    periodoId: string;
    docenteNombre: string;
  }): Promise<IssuedAsistenciaB4Link> => pb.send<IssuedAsistenciaB4Link>(
    '/api/cys/directivo/asistencias-b4/enlaces',
    {
      method: 'POST',
      body: data,
      requestKey: null,
    },
  ),

  rotateLink: async (tokenId: string): Promise<IssuedAsistenciaB4Link> => pb.send<IssuedAsistenciaB4Link>(
    `/api/cys/directivo/asistencias-b4/enlaces/${encodeURIComponent(tokenId)}/rotar`,
    {
      method: 'POST',
      requestKey: null,
    },
  ),

  recoverLink: async (tokenId: string): Promise<{ secreto: string; tokenPrefijo: string }> => pb.send(
    `/api/cys/directivo/asistencias-b4/enlaces/${encodeURIComponent(tokenId)}/recuperar`,
    {
      method: 'POST',
      requestKey: null,
    },
  ),

  deleteLink: async (tokenId: string): Promise<void> => {
    await pb.collection(COLLECTION_TOKENS).delete(tokenId);
  },

  getStaffCourse: async (cursoId: string, periodoId: string): Promise<CursoAsistenciaB4Snapshot> => (
    pb.send<CursoAsistenciaB4Snapshot>(
      `/api/cys/directivo/asistencias-b4/curso/${encodeURIComponent(cursoId)}/${encodeURIComponent(periodoId)}`,
      { requestKey: null },
    )
  ),

  saveStaffCourse: async (
    cursoId: string,
    periodoId: string,
    expectedRevision: number,
    filas: AsistenciaB4WriteRow[],
  ): Promise<CursoAsistenciaB4Snapshot> => {
    try {
      return await pb.send<CursoAsistenciaB4Snapshot>(
        `/api/cys/directivo/asistencias-b4/curso/${encodeURIComponent(cursoId)}/${encodeURIComponent(periodoId)}`,
        {
          method: 'PUT',
          body: { expectedRevision, filas },
          requestKey: null,
        },
      );
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 409) {
        const rev = Number(error.response?.currentRevision ?? error.response?.data?.currentRevision);
        throw new AttendanceRevisionConflictError(Number.isFinite(rev) ? rev : undefined);
      }
      throw error;
    }
  },

  getTeacherContext: async (token: string): Promise<CursoAsistenciaB4Snapshot> => (
    teacherRequest<CursoAsistenciaB4Snapshot>(token, '/api/cys/docente/asistencias-b4/contexto')
  ),

  saveTeacherRows: async (
    token: string,
    filas: AsistenciaB4WriteRow[],
  ): Promise<CursoAsistenciaB4Snapshot> => (
    teacherRequest<CursoAsistenciaB4Snapshot>(token, '/api/cys/docente/asistencias-b4/guardar', {
      method: 'PUT',
      body: { filas },
    })
  ),

  submitTeacher: async (token: string): Promise<{ totalAlumnos: number }> => {
    try {
      return await teacherRequest<{ totalAlumnos: number }>(
        token,
        '/api/cys/docente/asistencias-b4/enviar',
        { method: 'POST' },
      );
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 422 && error.response) {
        throw new AttendanceSubmitIncompleteError(error.response as AsistenciaB4SubmitIncomplete);
      }
      throw error;
    }
  },
};
