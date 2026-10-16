"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export type Flash = { kind: 'ok' | 'error'; text: string };

/**
 * A short message that disappears by itself. A newer message replaces the older one AND restarts the timer
 * (separate timeouts used to let an old message's timer erase a newer one early). Errors stay longer.
 */
export function useFlash(): [Flash | null, (kind: Flash['kind'], text: string) => void] {
  const [flash, setFlash] = useState<Flash | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const say = useCallback((kind: Flash['kind'], text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setFlash({ kind, text });
    timer.current = setTimeout(() => setFlash(null), kind === 'error' ? 7000 : 3000);
  }, []);
  return [flash, say];
}
