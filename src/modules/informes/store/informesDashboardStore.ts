import { create } from 'zustand';
import pb from '../../../core/pocketbase';
import type { EtapasInformeData, TipoInforme } from '../models/informe.model';

export interface InformesDashboardSnapshot {
  etapas: EtapasInformeData | null;
  selectedMateriaId: string | null;
  latestRequestSeq: number;
  lastSyncedAt: number;
}

const createEmptySnapshot = (): InformesDashboardSnapshot => ({
  etapas: null,
  selectedMateriaId: null,
  latestRequestSeq: 0,
  lastSyncedAt: 0,
});

export const buildInformesDashboardKey = (cicloId: string, tipoInforme: TipoInforme): string => (
  `${cicloId}:${tipoInforme}`
);

interface InformesDashboardState {
  snapshotsByKey: Record<string, InformesDashboardSnapshot>;
  beginRefresh: (key: string) => number;
  receiveEtapas: (key: string, requestSeq: number, etapas: EtapasInformeData) => void;
  setSelectedMateria: (key: string, materiaId: string | null) => void;
  clear: () => void;
}

export const useInformesDashboardStore = create<InformesDashboardState>((set) => {
  pb.authStore.onChange(() => {
    if (!pb.authStore.isValid) {
      set({ snapshotsByKey: {} });
    }
  });

  return {
    snapshotsByKey: {},

    beginRefresh: (key) => {
      let assignedSeq = 1;
      set((state) => {
        const current = state.snapshotsByKey[key] || createEmptySnapshot();
        assignedSeq = current.latestRequestSeq + 1;
        return {
          snapshotsByKey: {
            ...state.snapshotsByKey,
            [key]: {
              ...current,
              latestRequestSeq: assignedSeq,
            },
          },
        };
      });
      return assignedSeq;
    },

    receiveEtapas: (key, requestSeq, etapas) => set((state) => {
      const current = state.snapshotsByKey[key];
      if (!current || current.latestRequestSeq !== requestSeq) {
        return state;
      }
      const selectedMateriaId = current.selectedMateriaId &&
        etapas.materiasEspeciales.some((m) => m.id === current.selectedMateriaId)
        ? current.selectedMateriaId
        : etapas.materiasEspeciales[0]?.id ?? null;

      return {
        snapshotsByKey: {
          ...state.snapshotsByKey,
          [key]: {
            ...current,
            etapas,
            selectedMateriaId,
            lastSyncedAt: Date.now(),
          },
        },
      };
    }),

    setSelectedMateria: (key, materiaId) => set((state) => {
      const current = state.snapshotsByKey[key] || createEmptySnapshot();
      return {
        snapshotsByKey: {
          ...state.snapshotsByKey,
          [key]: {
            ...current,
            selectedMateriaId: materiaId,
          },
        },
      };
    }),

    clear: () => set({ snapshotsByKey: {} }),
  };
});
