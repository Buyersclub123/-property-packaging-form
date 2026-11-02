'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const LIVE_REFRESH_MS = 15 * 60 * 1000;

/**
 * Standard refresh pattern (as on /journey): `refresh` re-reads the source and applies the result IN PLACE
 * (never clears the page, never resets tab / filters / open item / scroll). It runs every 15 minutes while the
 * tab is visible (and on coming back to the tab when a run is overdue), or at once via `refreshNow` (the ⟳ button).
 * The page calls `stamp()` after every successful load so the "As at" time is right.
 */
export function useLiveRefresh(refresh: (manual: boolean) => Promise<unknown>, intervalMs = LIVE_REFRESH_MS) {
  const [asAt, setAsAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fn = useRef(refresh);
  fn.current = refresh;
  const busy = useRef(false);
  const last = useRef(0);

  const stamp = useCallback(() => {
    last.current = Date.now();
    setAsAt(last.current);
  }, []);

  const run = useCallback(async (manual: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      await fn.current(manual);
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible' && last.current && Date.now() - last.current >= intervalMs) run(false);
    };
    const timer = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs, run]);

  const refreshNow = useCallback(() => run(true), [run]);
  return { asAt, refreshing, refreshNow, stamp };
}
