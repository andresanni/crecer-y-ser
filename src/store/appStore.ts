import { create } from 'zustand';
import pb from '../core/pocketbase';
import type { AuthModel } from 'pocketbase';

export interface CicloLectivo {
  id: string;
  ano: number;
  actual: boolean;
}

export type ServerHealthStatus = 'online' | 'offline' | 'checking';

interface AppState {
  cicloActual: CicloLectivo | null;
  isCicloLoading: boolean;
  fetchCicloActual: () => Promise<void>;
  currentUser: AuthModel;
  checkAuth: () => void;
  serverStatus: ServerHealthStatus;
  serverLatencyMs: number | null;
  serverLastChecked: Date | null;
  checkServerHealth: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => {
  pb.authStore.onChange((_token, model) => {
    set({ currentUser: pb.authStore.isValid ? model : null });
  });

  return {
    cicloActual: null,
    isCicloLoading: true,
    currentUser: pb.authStore.isValid ? pb.authStore.model : null,
    serverStatus: 'checking',
    serverLatencyMs: null,
    serverLastChecked: null,

    checkAuth: () => {
      set({ currentUser: pb.authStore.isValid ? pb.authStore.model : null });
    },

    checkServerHealth: async () => {
      const startTime = Date.now();
      try {
        await pb.health.check();
        const elapsed = Date.now() - startTime;
        set({
          serverStatus: 'online',
          serverLatencyMs: elapsed,
          serverLastChecked: new Date(),
        });
      } catch {
        set({
          serverStatus: 'offline',
          serverLatencyMs: null,
          serverLastChecked: new Date(),
        });
      }
    },

    fetchCicloActual: async () => {
      try {
        set({ isCicloLoading: true });
        const record = await pb.collection('ciclos_lectivos').getFirstListItem<CicloLectivo>('actual = true');
        set({
          cicloActual: record,
          isCicloLoading: false,
        });
      } catch (error) {
        console.error('No se pudo obtener el ciclo lectivo actual:', error);
        set({ isCicloLoading: false });
      }
    },
  };
});
