'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Pauses auto-refresh polling when:
 *  - the browser tab is hidden (switched away / minimised), OR
 *  - there has been no user activity on the page for `idleMs` (default 30 min)
 *
 * Saves Vercel compute and GHL API rate limit from tabs left open overnight.
 *
 * Returns:
 *  - isPaused: whether polling should be skipped right now
 *  - pausedByIdle: true when paused specifically due to inactivity (so the
 *    page can show a "click to resume" note — a hidden tab needs no note)
 *
 * `onResume` is called once each time the page comes back to life (tab made
 * visible again, or user interacts after being idle) so the caller can do an
 * immediate fresh load.
 */
export function useAutoRefreshPause(onResume: () => void, idleMs = 30 * 60 * 1000) {
  const [isPaused, setIsPaused] = useState(false);
  const [pausedByIdle, setPausedByIdle] = useState(false);
  const lastActivity = useRef(Date.now());
  const pausedRef = useRef(false);
  const onResumeRef = useRef(onResume);
  onResumeRef.current = onResume;

  const evaluate = useCallback(() => {
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const idle = Date.now() - lastActivity.current > idleMs;
    const paused = hidden || idle;
    if (paused !== pausedRef.current) {
      pausedRef.current = paused;
      setIsPaused(paused);
      setPausedByIdle(paused && idle && !hidden);
      if (!paused) {
        // Coming back to life — trigger a fresh load
        onResumeRef.current();
      }
    } else if (paused) {
      setPausedByIdle(idle && !hidden);
    }
  }, [idleMs]);

  useEffect(() => {
    const activity = () => {
      lastActivity.current = Date.now();
      if (pausedRef.current && document.visibilityState !== 'hidden') evaluate();
    };
    const events: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((e) => document.addEventListener(e, activity, { passive: true }));
    document.addEventListener('visibilitychange', evaluate);
    const check = setInterval(evaluate, 30000); // re-evaluate idle every 30s
    return () => {
      events.forEach((e) => document.removeEventListener(e, activity));
      document.removeEventListener('visibilitychange', evaluate);
      clearInterval(check);
    };
  }, [evaluate]);

  return { isPaused, pausedByIdle };
}
