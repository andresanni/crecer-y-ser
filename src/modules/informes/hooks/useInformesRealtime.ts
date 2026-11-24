import { useEffect } from 'react';
import pb from '../../../core/pocketbase';

const REALTIME_COLLECTIONS = [
  'instancias_informe',
  'tokens_acceso_informe',
  'evaluaciones_informe',
  'visados_informe',
  'nomina_informe_alumno',
  'inscripciones',
  'alumnos',
];

export type InformesRealtimeSource = 'realtime' | 'focus';

export interface UseInformesRealtimeOptions {
  debounceMs?: number;
  maxWaitMs?: number;
  focusThrottleMs?: number;
  listenFocus?: boolean;
}

export const useInformesRealtime = (
  onChange: (source: InformesRealtimeSource) => void,
  options?: UseInformesRealtimeOptions,
) => {
  const debounceMs = options?.debounceMs ?? 350;
  const maxWaitMs = options?.maxWaitMs ?? 1200;
  const focusThrottleMs = options?.focusThrottleMs ?? 5000;
  const listenFocus = options?.listenFocus ?? true;

  useEffect(() => {
    let active = true;
    const stops: Array<() => void> = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendingSince = 0;
    let lastFocusAt = 0;

    const triggerRealtime = () => {
      if (!active) return;
      if (debounceMs <= 0) {
        onChange('realtime');
        return;
      }
      if (timer) clearTimeout(timer);
      if (!pendingSince) pendingSince = Date.now();
      const remaining = maxWaitMs - (Date.now() - pendingSince);
      const wait = Math.max(0, Math.min(debounceMs, remaining));
      timer = setTimeout(() => {
        timer = undefined;
        pendingSince = 0;
        if (active) onChange('realtime');
      }, wait);
    };

    for (const collection of REALTIME_COLLECTIONS) {
      void pb
        .collection(collection)
        .subscribe('*', () => {
          triggerRealtime();
        })
        .then((stop) => {
          if (active) stops.push(stop);
          else stop();
        })
        .catch(() => undefined);
    }

    const handleFocus = () => {
      if (!active || !listenFocus) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (focusThrottleMs > 0 && now - lastFocusAt < focusThrottleMs) return;
      lastFocusAt = now;
      onChange('focus');
    };

    if (listenFocus) {
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleFocus);
    }

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (listenFocus) {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
      }
      stops.forEach((stop) => stop());
    };
  }, [debounceMs, focusThrottleMs, listenFocus, maxWaitMs, onChange]);
};
