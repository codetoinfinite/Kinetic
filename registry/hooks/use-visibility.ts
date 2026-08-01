'use client';

import { useSyncExternalStore } from 'react';

/* ==========================================================================
   Document visibility, shared.
   --------------------------------------------------------------------------
   A backgrounded tab still runs `setInterval`, still holds WebGL contexts,
   and — on some platforms — still gets throttled rAF ticks with multi-second
   deltas. Anything expensive should stop when the tab is hidden and resume
   when it comes back, rather than trying to catch up.

   `useSyncExternalStore` with an explicit server snapshot so SSR markup and
   the first client render agree.
   ========================================================================== */

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

function getSnapshot(): boolean {
  return document.visibilityState === 'visible';
}

/** Assume visible on the server: the alternative flashes a paused state. */
function getServerSnapshot(): boolean {
  return true;
}

export function useVisibility(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
