import { useEffect } from 'react';
import pb from '../../../core/pocketbase';

const REALTIME_COLLECTIONS = [
  'instancias_informe',
  'tokens_acceso_informe',
  'evaluaciones_informe',
  'respuestas_item_informe',
  'visados_informe',
  'inscripciones',
  'alumnos',
];

export const useInformesRealtime = (onChange: () => void) => {
  useEffect(() => {
    let active = true;
    const stops: Array<() => void> = [];

    for (const collection of REALTIME_COLLECTIONS) {
      void pb
        .collection(collection)
        .subscribe('*', () => {
          if (active) onChange();
        })
        .then((stop) => {
          if (active) stops.push(stop);
          else stop();
        })
        .catch(() => undefined);
    }

    const handleFocus = () => {
      if (active) onChange();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      active = false;
      window.removeEventListener('focus', handleFocus);
      stops.forEach((stop) => stop());
    };
  }, [onChange]);
};
