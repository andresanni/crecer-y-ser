import { create } from 'zustand';
import pb from '../../../core/pocketbase';
import { compareGrados, extractGradeNumber } from '../../alumnos/utils/gradeColors';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import type {
  CursoEtapaDto,
  CursoMonitoreoResumen,
  CursoProgresoDto,
  EstadoMonitoreoCurso,
  Periodo,
  TokenAccesoDocente,
} from '../models/boletin.model';

export interface PeriodDashboardCache {
  etapas: CursoEtapaDto[] | null;
  progresoByCurso: Record<string, CursoProgresoDto> | null;
  progresoError: boolean;
  latestRequestSeq: number;
  lastSyncedAt: number;
}

const createEmptyPeriodCache = (): PeriodDashboardCache => ({
  etapas: null,
  progresoByCurso: null,
  progresoError: false,
  latestRequestSeq: 0,
  lastSyncedAt: 0,
});

interface GradebookDashboardState {
  cursos: Curso[] | null;
  periodosByCiclo: Record<string, Periodo[]>;
  snapshotsByPeriodo: Record<string, PeriodDashboardCache>;
  setCursos: (cursos: Curso[]) => void;
  setPeriodos: (cicloId: string, periodos: Periodo[]) => void;
  beginRefresh: (periodoId: string) => number;
  receiveEtapas: (periodoId: string, requestSeq: number, etapas: CursoEtapaDto[]) => void;
  receiveProgreso: (periodoId: string, requestSeq: number, cursos: CursoProgresoDto[]) => void;
  markProgresoError: (periodoId: string, requestSeq: number) => void;
  markSynced: (periodoId: string, requestSeq: number) => void;
  clear: () => void;
}

export const useGradebookDashboardStore = create<GradebookDashboardState>((set) => {
  pb.authStore.onChange(() => {
    if (!pb.authStore.isValid) {
      set({ cursos: null, periodosByCiclo: {}, snapshotsByPeriodo: {} });
    }
  });

  return {
    cursos: null,
    periodosByCiclo: {},
    snapshotsByPeriodo: {},

    setCursos: (cursos) => set({ cursos }),

    setPeriodos: (cicloId, periodos) => set((state) => ({
      periodosByCiclo: {
        ...state.periodosByCiclo,
        [cicloId]: periodos,
      },
    })),

    beginRefresh: (periodoId) => {
      let assignedSeq = 1;
      set((state) => {
        const current = state.snapshotsByPeriodo[periodoId] || createEmptyPeriodCache();
        assignedSeq = current.latestRequestSeq + 1;
        return {
          snapshotsByPeriodo: {
            ...state.snapshotsByPeriodo,
            [periodoId]: {
              ...current,
              progresoError: false,
              latestRequestSeq: assignedSeq,
            },
          },
        };
      });
      return assignedSeq;
    },

    receiveEtapas: (periodoId, requestSeq, etapas) => set((state) => {
      const current = state.snapshotsByPeriodo[periodoId];
      if (!current || current.latestRequestSeq !== requestSeq) {
        return state;
      }
      return {
        snapshotsByPeriodo: {
          ...state.snapshotsByPeriodo,
          [periodoId]: {
            ...current,
            etapas,
          },
        },
      };
    }),

    receiveProgreso: (periodoId, requestSeq, cursos) => set((state) => {
      const current = state.snapshotsByPeriodo[periodoId];
      if (!current || current.latestRequestSeq !== requestSeq) {
        return state;
      }
      const progresoByCurso: Record<string, CursoProgresoDto> = {};
      for (const curso of cursos) {
        progresoByCurso[curso.cursoId] = curso;
      }
      return {
        snapshotsByPeriodo: {
          ...state.snapshotsByPeriodo,
          [periodoId]: {
            ...current,
            progresoByCurso,
            progresoError: false,
            lastSyncedAt: Date.now(),
          },
        },
      };
    }),

    markProgresoError: (periodoId, requestSeq) => set((state) => {
      const current = state.snapshotsByPeriodo[periodoId];
      if (!current || current.latestRequestSeq !== requestSeq || current.progresoByCurso !== null) {
        return state;
      }
      return {
        snapshotsByPeriodo: {
          ...state.snapshotsByPeriodo,
          [periodoId]: {
            ...current,
            progresoError: true,
          },
        },
      };
    }),

    markSynced: (periodoId, requestSeq) => set((state) => {
      const current = state.snapshotsByPeriodo[periodoId];
      if (!current || current.latestRequestSeq !== requestSeq) {
        return state;
      }
      return {
        snapshotsByPeriodo: {
          ...state.snapshotsByPeriodo,
          [periodoId]: {
            ...current,
            lastSyncedAt: Date.now(),
          },
        },
      };
    }),

    clear: () => set({ cursos: null, periodosByCiclo: {}, snapshotsByPeriodo: {} }),
  };
});

export const buildMonitoreoCursos = (
  etapas: CursoEtapaDto[] | null,
  progresoByCurso: Record<string, CursoProgresoDto> | null,
): CursoMonitoreoResumen[] => {
  if (!etapas) return [];

  const resumen: CursoMonitoreoResumen[] = etapas.map((stage) => {
    const progress = progresoByCurso?.[stage.cursoId];
    const entregado = stage.etapa === 'REVISION_DIRECTIVA' || stage.etapa === 'LISTO_PARA_PDF';

    let estado: EstadoMonitoreoCurso = 'SIN_INICIAR';
    if (entregado) {
      estado = 'COMPLETO';
    } else if (stage.etapa === 'CARGA_PAUSADA') {
      estado = 'PAUSADO';
    } else if (stage.etapa === 'CARGA_DOCENTE') {
      estado = 'EN_PROGRESO';
    } else if (stage.etapa === 'PENDIENTE_EMISION') {
      estado = 'SIN_ENLACE';
    }

    const tokenDocente: TokenAccesoDocente | undefined = stage.tokenDocente
      ? {
          id: stage.tokenDocente.id,
          tokenPrefijo: stage.tokenDocente.tokenPrefijo,
          cursoId: stage.tokenDocente.cursoId,
          periodoId: stage.tokenDocente.periodoId,
          docenteNombre: stage.tokenDocente.docenteNombre,
          recuperable: stage.tokenDocente.recuperable,
          cursoNombre: stage.cursoNombre,
          createdAt: '',
          updatedAt: '',
        }
      : undefined;

    return {
      cursoId: stage.cursoId,
      cursoNombre: stage.cursoNombre,
      gradoNumero: extractGradeNumber(stage.cursoNombre),
      totalAlumnos: progress ? progress.totalAlumnos : stage.inscripcionesEvaluables.length,
      alumnosCompletos: progress ? progress.alumnosCompletos : 0,
      alumnosEnProgreso: progress ? progress.alumnosEnProgreso : 0,
      alumnosSinIniciar: progress ? progress.alumnosSinIniciar : 0,
      porcentaje: progress ? progress.porcentaje : 0,
      progresoLoaded: Boolean(progress),
      estado,
      etapa: stage.etapa,
      cursadasPendientes: stage.cursadasPendientes,
      visados: stage.visados,
      totalBoletines: stage.totalBoletines,
      entregado,
      tokenDocente,
    };
  });

  resumen.sort((a, b) => compareGrados(a.cursoNombre, b.cursoNombre));
  return resumen;
};
