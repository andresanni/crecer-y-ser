import { useState } from 'react';

/** Reset form state on opening; preserve the mounted modal during its close animation and focus return. */
export function useModalSessionKey(open: boolean): number {
  const [session, setSession] = useState({ open, key: 0 });
  if (session.open !== open) {
    const next = { open, key: session.key + (open ? 1 : 0) };
    setSession(next);
    return next.key;
  }
  return session.key;
}
