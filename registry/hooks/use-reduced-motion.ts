'use client';

import { useSyncExternalStore } from 'react';

/* ==========================================================================
   prefers-reduced-motion, SSR-safe.
   --------------------------------------------------------------------------
   useSyncExternalStore rather than useState + useEffect: the server snapshot
   is an explicit `false`, so the markup React renders on the server and the
   markup it hydrates with agree, and the real value lands in the same commit
   as hydration instead of one frame later. A useEffect version flashes the
   animated variant before removing it — the exact thing the user asked not to
   see.

   Reduced motion is not "duration: 0". For most components here it means a
   different render: the final state, a static poster, or a paused frame.
   ========================================================================== */

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Generic media-query hook, same SSR guarantees. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => {
      if (typeof window === 'undefined' || !window.matchMedia) return false;
      return window.matchMedia(query).matches;
    },
    () => false,
  );
}
