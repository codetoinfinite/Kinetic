'use client';

import { useEffect, useRef, type DependencyList, type RefObject } from 'react';

/* ==========================================================================
   gsap.context() with the teardown wired up.
   --------------------------------------------------------------------------
   Every animation, ScrollTrigger and SplitText created inside the callback is
   recorded by the context and killed by `ctx.revert()`. `revert()` — not
   `kill()` — is the one that also restores inline styles GSAP wrote, which is
   what stops a component from unmounting mid-tween and leaving a stray
   `transform` on a DOM node that React then reuses.

   Under React 19 StrictMode every effect runs twice in development. Without a
   context that reverts, you get two ScrollTriggers on the same element, each
   scrubbing the same property, and a 2x-speed animation that only reproduces
   in dev.
   ========================================================================== */

type ContextFunc = (context: {
  add: (fn: () => void) => void;
  [key: string]: unknown;
}) => void | (() => void);

interface GsapLike {
  context: (
    fn: ContextFunc,
    scope?: Element | string | object,
  ) => { revert: () => void };
}

/**
 * Runs `callback` inside a `gsap.context()` scoped to `scope`, reverting on
 * unmount and whenever `deps` change.
 *
 * `gsap` is passed in rather than imported so this hook carries no dependency
 * of its own — the component that animates is the one that imports GSAP.
 */
export function useGsap(
  gsap: GsapLike,
  callback: ContextFunc,
  scope: RefObject<Element | null>,
  deps: DependencyList = [],
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const el = scope.current;
    if (!el) return;

    const ctx = gsap.context((self) => callbackRef.current(self), el);
    return () => ctx.revert();
    // `callback` is deliberately excluded: it is held in a ref so callers do
    // not have to memoise it. Re-run by changing `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gsap, scope, ...deps]);
}
