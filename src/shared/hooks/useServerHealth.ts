import { useEffect } from 'react';
import { useAppStore, type ServerHealthStatus } from '../../store/appStore';

export type { ServerHealthStatus };

export interface ServerHealthState {
  status: ServerHealthStatus;
  latencyMs: number | null;
  lastChecked: Date | null;
  checkHealth: () => Promise<void>;
}

export const useServerHealth = (intervalSeconds = 90): ServerHealthState => {
  const status = useAppStore((state) => state.serverStatus);
  const latencyMs = useAppStore((state) => state.serverLatencyMs);
  const lastChecked = useAppStore((state) => state.serverLastChecked);
  const checkHealth = useAppStore((state) => state.checkServerHealth);

  useEffect(() => {
    void checkHealth();

    const intervalId = window.setInterval(() => {
      void checkHealth();
    }, intervalSeconds * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkHealth();
      }
    };

    const handleOnline = () => {
      void checkHealth();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkHealth, intervalSeconds]);

  return {
    status,
    latencyMs,
    lastChecked,
    checkHealth,
  };
};
