import { create } from 'zustand';
import pb from '../core/pocketbase';
import type { AuthModel } from 'pocketbase';

export interface CicloLectivo {
  id: string;
  ano: number;
  actual: boolean;
}

interface AppState {
  cicloActual: CicloLectivo | null;
  isCicloLoading: boolean;
  fetchCicloActual: () => Promise<void>;
  currentUser: AuthModel;
  checkAuth: () => void;
}

export const useAppStore = create<AppState>((set) => {

  pb.authStore.onChange((_token, model) => {
    set({ currentUser: pb.authStore.isValid ? model : null });
  });

  return {
    cicloActual: null,
    isCicloLoading: true,
    currentUser: pb.authStore.isValid ? pb.authStore.model : null,

    checkAuth: () => {
      set({ currentUser: pb.authStore.isValid ? pb.authStore.model : null });
    },

    fetchCicloActual: async () => {
      try {
        set({ isCicloLoading: true });

        const record = await pb.collection('ciclos_lectivos').getFirstListItem<CicloLectivo>('actual = true');

        set({
          cicloActual: record,
          isCicloLoading: false
        });
      } catch (error) {

        console.error('No se pudo obtener el ciclo lectivo actual:', error);
        set({ isCicloLoading: false });
      }
    },
  };
});
